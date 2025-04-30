package api

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"connectrpc.com/connect"                                                   // Added Connect import
	apiconnect "github.com/ethpandaops/lab/backend/pkg/api/proto/protoconnect" // Updated Connect handler import path to actual location
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/goccy/go-json"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
	"github.com/soheilhy/cmux"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/reflection"

	beaconslotspb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	labpb "github.com/ethpandaops/lab/backend/pkg/server/proto/lab"
)

// Service represents the api service
type Service struct {
	log           logrus.FieldLogger
	config        *Config
	ctx           context.Context //nolint:containedctx // This is a context for the service
	cancel        context.CancelFunc
	router        *mux.Router
	server        *http.Server
	grpcServer    *grpc.Server
	restServer    *http.Server
	cacheClient   cache.Client
	storageClient storage.Client

	// gRPC connection to srv service
	srvConn           *grpc.ClientConn
	labClient         labpb.LabServiceClient
	beaconSlotsClient beaconslotspb.BeaconSlotsClient
}

// New creates a new api service
func New(config *Config) (*Service, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("config is invalid: %w", err)
	}

	log, err := logger.New(config.LogLevel, "api")
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	met := metrics.NewMetricsService("lab", log, "api")

	cacheClient, err := cache.New(config.Cache, met)
	if err != nil {
		return nil, fmt.Errorf("failed to create cache client: %w", err)
	}

	storageClient, err := storage.New(config.Storage, log, met)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage client: %w", err)
	}

	return &Service{
		log:           log,
		config:        config,
		router:        mux.NewRouter(),
		cacheClient:   cacheClient,
		storageClient: storageClient,
	}, nil
}

// Start starts the api service
func (s *Service) Start(ctx context.Context) error {
	s.log.Info("Starting api service")

	s.ctx, s.cancel = context.WithCancel(ctx)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		s.log.WithField("signal", sig.String()).Info("Received signal, shutting down")
		s.cancel()
	}()

	if err := s.initializeServices(ctx); err != nil {
		return fmt.Errorf("failed to initialize services: %w", err)
	}

	// HTTP server is no longer started here since it's handled by the combined gRPC/HTTP server

	<-s.ctx.Done()
	s.log.Info("Context canceled, cleaning up")

	s.cleanup()

	s.log.Info("Api service stopped")

	return nil
}

// getCORSHandler configures and returns a CORS handler
func (s *Service) getCORSHandler(h http.Handler) http.Handler {
	corsOptions := cors.Options{
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodDelete,
			http.MethodOptions,
			http.MethodPatch,
		},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Content-Length", "Content-Type", "ETag", "Cache-Control", "Last-Modified"},
		AllowCredentials: true,
		MaxAge:           300,
	}

	// Configure allowed origins based on config
	switch {
	case s.config.HttpServer.CORSAllowAll:
		s.log.Info("CORS configured to allow all origins (*)")

		corsOptions.AllowedOrigins = []string{"*"}
	case len(s.config.HttpServer.AllowedOrigins) > 0:
		s.log.WithField("origins", s.config.HttpServer.AllowedOrigins).Info("CORS configured with specific allowed origins")
		corsOptions.AllowedOrigins = s.config.HttpServer.AllowedOrigins
	default:
		s.log.Info("No CORS origins specified, defaulting to allow all (*)")

		corsOptions.AllowedOrigins = []string{"*"}
	}

	return cors.New(corsOptions).Handler(h)
}

func (s *Service) initializeServices(ctx context.Context) error {
	srvAddr := s.config.SrvClient.Address

	var conn *grpc.ClientConn

	var err error

	// Set up dial options with transport credentials
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}

	conn, err = grpc.NewClient(srvAddr, opts...)
	if err != nil {
		return fmt.Errorf("failed to dial srv service at %s: %w", srvAddr, err)
	}

	s.srvConn = conn
	s.labClient = labpb.NewLabServiceClient(conn)
	s.beaconSlotsClient = beaconslotspb.NewBeaconSlotsClient(conn)

	// Initialize the gRPC server
	s.grpcServer = grpc.NewServer()

	// Register the reflection service on the server
	reflection.Register(s.grpcServer)

	// Initialize our LabAPI implementation
	labAPIServer := NewLabAPIServer(s.cacheClient, s.storageClient, conn, s.log)

	// Create a listener for the gRPC/HTTP server
	lis, err := net.Listen("tcp", fmt.Sprintf("%s:%d", s.config.HttpServer.Host, s.config.HttpServer.Port))
	if err != nil {
		return fmt.Errorf("failed to listen for gRPC/HTTP server: %w", err)
	}

	// Create a cmux multiplexer to handle both gRPC and HTTP traffic
	connMux := cmux.New(lis)

	// gRPC matcher (matches on HTTP2 with Prior Knowledge)
	grpcL := connMux.MatchWithWriters(cmux.HTTP2MatchHeaderFieldSendSettings("content-type", "application/grpc"))

	// HTTP/1.1 matcher (matches all other traffic)
	httpL := connMux.Match(cmux.HTTP1Fast())

	// Create the Connect handler
	connectHandler := http.NewServeMux()
	path, handler := apiconnect.NewLabAPIHandler(labAPIServer, connect.WithInterceptors( /* Add interceptors if needed */ ))
	connectHandler.Handle(path, handler)

	// Create an HTTP handler that combines both the Connect handler and the legacy HTTP routes
	// Use a mux router to route traffic based on the URL path
	combinedHandler := http.NewServeMux()

	// Apply CORS middleware to the Connect routes
	connectWithCORS := s.getCORSHandler(connectHandler)

	finalConnectHandler := connectWithCORS

	// Determine API prefix path based on configuration
	apiPrefix := "/api/"
	prefix := s.config.HttpServer.PathPrefix

	if prefix != "" {
		// Ensure prefix starts with / and doesn't end with /
		if prefix[0] != '/' {
			prefix = "/" + prefix
		}

		if len(prefix) > 1 && prefix[len(prefix)-1] == '/' {
			prefix = prefix[:len(prefix)-1]
		}

		// Construct the final API prefix by combining the server prefix with /api/
		apiPrefix = prefix + "/api/"
	}

	s.log.WithField("apiPrefix", apiPrefix).Info("Registering Connect handler with prefix")

	// Add the Connect handler for the API paths with the proper prefix
	// Connect handlers typically register their own base path, so we mount it directly
	combinedHandler.Handle(apiPrefix, http.StripPrefix(strings.TrimSuffix(apiPrefix, "/"), finalConnectHandler))

	// Apply CORS middleware to the legacy routes
	legacyWithCORS := s.getCORSHandler(s.router)

	// Add the legacy HTTP routes for backward compatibility

	if prefix != "" {
		combinedHandler.Handle(prefix+"/", http.StripPrefix(prefix, legacyWithCORS))
	} else {
		combinedHandler.Handle("/", legacyWithCORS)
	}

	// Configure the HTTP server
	httpSrv := &http.Server{
		Handler:           combinedHandler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Start the gRPC server in a goroutine
	go func() {
		s.log.WithField("addr", fmt.Sprintf("%s:%d", s.config.HttpServer.Host, s.config.HttpServer.Port)).Info("Starting gRPC server")

		if err := s.grpcServer.Serve(grpcL); err != nil {
			s.log.WithError(err).Error("gRPC server error")
			s.cancel()
		}
	}()

	// Start the HTTP server in a goroutine
	go func() {
		s.log.WithField("addr", fmt.Sprintf("%s:%d", s.config.HttpServer.Host, s.config.HttpServer.Port)).Info("Starting Connect/HTTP server")

		if err := httpSrv.Serve(httpL); err != nil && err != http.ErrServerClosed {
			s.log.WithError(err).Error("Connect/HTTP server error")
			s.cancel()
		}
	}()

	// Start the cmux server in a goroutine
	go func() {
		s.log.WithField("addr", lis.Addr()).Info("Starting combined gRPC/HTTP server")

		if err := connMux.Serve(); err != nil {
			s.log.WithError(err).Error("cmux server error")
			s.cancel()
		}
	}()

	// Save the HTTP server for cleanup
	s.restServer = httpSrv

	if err := s.storageClient.Start(ctx); err != nil {
		return fmt.Errorf("failed to start storage client: %w", err)
	}

	// Register custom HTTP handlers for backward compatibility
	s.registerLegacyHandlers()

	return nil
}

// registerLegacyHandlers registers HTTP handlers for backward compatibility with .json paths
func (s *Service) registerLegacyHandlers() {
	// Determine the router to use (main router or prefixed subrouter)
	router := s.router

	// Block timings
	router.HandleFunc("/beacon_chain_timings/block_timings/{network}/{window_file}.json", s.handleBlockTimings).Methods("GET")

	// Size CDF - OK
	router.HandleFunc("/beacon_chain_timings/size_cdf/{network}/{window_file}.json", s.handleSizeCDF).Methods("GET")

	// Xatu Summary - OK
	router.HandleFunc("/xatu_public_contributors/summary.json", s.handleXatuSummary).Methods("GET")

	// Beacon Slot
	router.HandleFunc("/beacon/slots/{network}/{slot}.json", s.handleBeaconSlot).Methods("GET")

	// Xatu User Summary - OK
	router.HandleFunc("/xatu_public_contributors/user-summaries/summary.json", s.handleXatuUserSummary).Methods("GET")

	// Xatu User - OK
	router.HandleFunc("/xatu_public_contributors/user-summaries/users/{username}.json", s.handleXatuUser).Methods("GET")

	// Xatu Users Window - OK
	router.HandleFunc("/xatu_public_contributors/users/{network}/{window_file}.json", s.handleXatuUsersWindow).Methods("GET")

	// Xatu Countries Window - OK
	router.HandleFunc("/xatu_public_contributors/countries/{network}/{window_file}.json", s.handleXatuCountriesWindow).Methods("GET")

	// Config file
	router.HandleFunc("/config.json", s.handleFrontendConfig).Methods("GET")
}

func (s *Service) handleFrontendConfig(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	resp, err := s.labClient.GetFrontendConfig(ctx, &labpb.GetFrontendConfigRequest{})
	if err != nil {
		s.log.WithError(err).Error("failed to fetch config")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}

	data, err := json.Marshal(resp.Config.Config)
	if err != nil {
		s.log.WithError(err).Error("failed to marshal config response")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=60,s-maxage=60,public")

	if _, err := w.Write(data); err != nil {
		s.log.WithError(err).Error("failed to write config response")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

// Generic handler for S3 passthroughs
func (s *Service) handleS3Passthrough(w http.ResponseWriter, r *http.Request, key string, headers map[string]string) error {
	ctx := r.Context()

	data, err := s.storageClient.Get(ctx, key)
	if err != nil {
		if err == storage.ErrNotFound {
			http.Error(w, "Not found", http.StatusNotFound)

			return errors.New("not found")
		}

		s.log.WithError(err).WithField("key", key).Error("Failed to get object from storage")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return err
	}

	for k, v := range headers {
		w.Header().Set(k, v)
	}

	if _, err := w.Write(data); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to write data to response")

		return errors.New("failed to write data to response")
	}

	return nil
}

// Handler implementations
func (s *Service) handleBlockTimings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	windowFile := vars["window_file"]

	key := "beacon_chain_timings/block_timings/" + network + "/" + windowFile + ".json"
	if err := s.handleS3Passthrough(w, r, key, map[string]string{
		"Content-Type":  "application/json",
		"Cache-Control": "max-age=605, s-maxage=605, public",
	}); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to handle block timings")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) handleSizeCDF(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	windowFile := vars["window_file"]

	key := "beacon_chain_timings/size_cdf/" + network + "/" + windowFile + ".json"
	if err := s.handleS3Passthrough(w, r, key, map[string]string{
		"Content-Type":  "application/json",
		"Cache-Control": "max-age=605, s-maxage=605, public",
	}); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to handle size cdf")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) handleXatuSummary(w http.ResponseWriter, r *http.Request) {
	key := "xatu_public_contributors/summary.json"
	if err := s.handleS3Passthrough(w, r, key, map[string]string{
		"Content-Type":  "application/json",
		"Cache-Control": "max-age=605, s-maxage=605, public",
	}); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to handle Xatu summary")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) handleBeaconSlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	slot := vars["slot"]

	key := "beacon_slots/slots/" + network + "/" + slot + ".json"
	if err := s.handleS3Passthrough(w, r, key, map[string]string{
		"Content-Type":  "application/json",
		"Cache-Control": "max-age=6000, s-maxage=6000, public",
	}); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to handle beacon slot")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) handleXatuUserSummary(w http.ResponseWriter, r *http.Request) {
	key := "xatu_public_contributors/user-summaries/summary.json"

	if err := s.handleS3Passthrough(w, r, key, map[string]string{
		"Content-Type":  "application/json",
		"Cache-Control": "max-age=605, s-maxage=605, public",
	}); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to handle Xatu user summary")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) handleXatuUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]
	key := "xatu_public_contributors/user-summaries/users/" + username + ".json"

	if err := s.handleS3Passthrough(w, r, key, map[string]string{
		"Content-Type":  "application/json",
		"Cache-Control": "max-age=605, s-maxage=605, public",
	}); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to handle Xatu user")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) handleXatuUsersWindow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	windowFile := vars["window_file"]

	key := "xatu_public_contributors/users/" + network + "/" + windowFile + ".json"
	if err := s.handleS3Passthrough(w, r, key, map[string]string{
		"Content-Type":  "application/json",
		"Cache-Control": "max-age=605, s-maxage=605, public",
	}); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to handle Xatu users window")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) handleXatuCountriesWindow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	windowFile := vars["window_file"]

	key := "xatu_public_contributors/countries/" + network + "/" + windowFile + ".json"

	ctx := r.Context()

	data, err := s.storageClient.Get(ctx, key)
	if err != nil {
		if err == storage.ErrNotFound {
			http.Error(w, "Not found", http.StatusNotFound)
		} else {
			s.log.WithError(err).WithField("key", key).Error("Failed to get object from storage")
			http.Error(w, "Internal server error", http.StatusInternalServerError)

			return
		}

		return
	}

	// Unmarshal the internal format data
	var internalData []struct {
		Timestamp struct {
			Seconds int64 `json:"seconds"`
		} `json:"timestamp"`
		NodeCounts []struct {
			TotalNodes  int `json:"total_nodes"`
			PublicNodes int `json:"public_nodes"`
		} `json:"node_counts"`
	}

	if err := json.Unmarshal(data, &internalData); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to unmarshal countries data")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}

	// Transform to production format
	productionData := make([]struct {
		Time      int64 `json:"time"`
		Countries []struct {
			Name  string `json:"name"`
			Value int    `json:"value"`
		} `json:"countries"`
	}, len(internalData))

	// Convert each data point
	for _, dataPoint := range internalData {
		productionPoint := struct {
			Time      int64 `json:"time"`
			Countries []struct {
				Name  string `json:"name"`
				Value int    `json:"value"`
			} `json:"countries"`
		}{
			Time: dataPoint.Timestamp.Seconds,
			Countries: []struct {
				Name  string `json:"name"`
				Value int    `json:"value"`
			}{},
		}

		// For each node count entry, create a country entry
		// The internal data doesn't seem to include country names, so we need to determine them
		countryIndex := 0
		for _, nodeCount := range dataPoint.NodeCounts {
			// We need to determine country names from indexes or other means
			// For this example, we'll extract the country info directly from nodeCount data
			// In a real implementation, there might be a mapping from index to country name
			// or the country name might be included in the data
			productionPoint.Countries = append(productionPoint.Countries, struct {
				Name  string `json:"name"`
				Value int    `json:"value"`
			}{
				// This is just a placeholder. In a real implementation, you'd need to get
				// the actual country name from somewhere.
				Name:  "Country_" + strconv.Itoa(countryIndex),
				Value: nodeCount.TotalNodes,
			})
			countryIndex++
		}

		productionData = append(productionData, productionPoint)
	}

	// Marshal to JSON
	responseData, err := json.Marshal(productionData)
	if err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to marshal transformed countries data")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=605, s-maxage=605, public")

	if _, err := w.Write(responseData); err != nil {
		s.log.WithError(err).WithField("key", key).Error("Failed to write transformed countries data")
		http.Error(w, "Internal server error", http.StatusInternalServerError)

		return
	}
}

func (s *Service) cleanup() {
	if s.server != nil {
		s.log.Info("Shutting down HTTP server")

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := s.server.Shutdown(ctx); err != nil {
			s.log.WithError(err).Error("Failed to shut down HTTP server")
		}
	}

	if s.restServer != nil {
		s.log.Info("Shutting down REST gateway server")

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := s.restServer.Shutdown(ctx); err != nil {
			s.log.WithError(err).Error("Failed to shut down REST gateway server")
		}
	}

	if s.grpcServer != nil {
		s.log.Info("Stopping gRPC server")
		s.grpcServer.GracefulStop()
	}

	if s.srvConn != nil {
		s.log.Info("Closing gRPC client connection")
		_ = s.srvConn.Close()
	}
}
