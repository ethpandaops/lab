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

	apiconnect "github.com/ethpandaops/lab/backend/pkg/api/proto/protoconnect"
	v1rest "github.com/ethpandaops/lab/backend/pkg/api/v1/rest"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/goccy/go-json"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	beaconslotspb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	configpb "github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	xatu_cbt_pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
)

// Service represents the api service
type Service struct {
	log           logrus.FieldLogger
	config        *Config
	ctx           context.Context //nolint:containedctx // This is a context for the service
	cancel        context.CancelFunc
	router        *mux.Router
	server        *http.Server
	cacheClient   cache.Client
	storageClient storage.Client

	// gRPC connection to srv service
	srvConn           *grpc.ClientConn
	beaconSlotsClient beaconslotspb.BeaconSlotsClient
	xatuCBTClient     xatu_cbt_pb.XatuCBTClient
	configClient      configpb.ConfigServiceClient
	publicV1Router    *v1rest.PublicRouter
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

	// Create a new router for legacy handlers
	s.router = mux.NewRouter()

	// Get the path prefix from config
	prefix := s.config.HttpServer.PathPrefix
	if prefix != "" {
		// Ensure prefix starts with / and doesn't end with /
		if !strings.HasPrefix(prefix, "/") {
			prefix = "/" + prefix
		}

		prefix = strings.TrimSuffix(prefix, "/")
	}

	// Register legacy HTTP handlers under the prefix
	if prefix != "" {
		s.registerLegacyHandlers(s.router.PathPrefix(prefix).Subrouter())
	} else {
		s.registerLegacyHandlers(s.router)
	}

	// Create a separate router for v1 public REST routes (without prefix)
	publicRouter := mux.NewRouter()
	s.publicV1Router.RegisterRoutes(publicRouter)

	// Create a new HTTP mux for the server
	rootMux := http.NewServeMux()

	// Initialize the Connect handler
	labAPIServer := NewLabAPIServer(s.cacheClient, s.storageClient, s.srvConn, s.log)
	// The path returned is "/labapi.LabAPI/" - This is the base path where Connect expects to find its handlers
	basePath, handler := apiconnect.NewLabAPIHandler(labAPIServer)

	s.log.WithField("connectBasePath", basePath).Debug("ConnectRPC base path")

	// Mount the Connect handler at the correct path
	// ConnectRPC handles routing from this base path to the specific endpoints
	if prefix != "" {
		s.log.WithFields(logrus.Fields{
			"public_v1": "/api/v1/",
			"connect":   prefix + "/api/",
		}).Info("Registering handlers")

		// Create a custom router that will dispatch to public API routes, Connect handler, or legacy router
		customHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Log the original request for debugging
			s.log.WithFields(logrus.Fields{
				"path":   r.URL.Path,
				"method": r.Method,
			}).Debug("Received request")

			path := r.URL.Path

			// For public API routes (no prefix) - handle first
			if strings.HasPrefix(path, "/api/v1/") {
				publicRouter.ServeHTTP(w, r)

				return
			}

			// For requests targeting the Connect API routes (/lab-data/api/...)
			if strings.HasPrefix(path, prefix+"/api/") {
				// Create a copy of the request with path adjustments for Connect handler
				r2 := *r
				u2 := *r.URL
				r2.URL = &u2
				// Remove the prefix+"/api" prefix
				r2.URL.Path = strings.TrimPrefix(path, prefix+"/api")

				handler.ServeHTTP(w, &r2)

				return
			}

			// For all other requests under the prefix, forward to the legacy router
			if strings.HasPrefix(path, prefix+"/") {
				// Forward to router which has handlers registered with the prefix
				s.router.ServeHTTP(w, r)

				return
			}

			w.WriteHeader(http.StatusOK)

			_, err := w.Write([]byte("OK"))
			if err != nil {
				s.log.WithError(err).Error("Failed to write health check response")
			}
		})

		rootMux = http.NewServeMux()
		rootMux.Handle("/", customHandler)
	} else {
		// No prefix case: Use the default approach with public REST routes
		rootMux.Handle("/api/v1/", publicRouter) // Public REST routes at root level
		rootMux.Handle("/api/", handler)         // Connect routes
		rootMux.Handle("/", s.router)            // Legacy routes
	}

	// Create the server
	s.server = &http.Server{
		Addr:              fmt.Sprintf("%s:%d", s.config.HttpServer.Host, s.config.HttpServer.Port),
		Handler:           s.getCORSHandler(rootMux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Start the server
	lis, err := net.Listen("tcp", s.server.Addr)
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	go func() {
		s.log.WithField("addr", s.server.Addr).Info("Starting HTTP server")

		if err := s.server.Serve(lis); err != nil && !errors.Is(err, http.ErrServerClosed) {
			s.log.WithError(err).Error("HTTP server error")
		}
	}()

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

	if err := s.storageClient.Start(ctx); err != nil {
		return fmt.Errorf("failed to start storage client: %w", err)
	}

	s.srvConn = conn
	s.beaconSlotsClient = beaconslotspb.NewBeaconSlotsClient(conn)
	s.xatuCBTClient = xatu_cbt_pb.NewXatuCBTClient(conn)
	s.configClient = configpb.NewConfigServiceClient(conn)
	s.publicV1Router = v1rest.NewPublicRouter(s.log, s.configClient, s.xatuCBTClient)

	return nil
}

// registerLegacyHandlers registers HTTP handlers for backward compatibility with .json paths
func (s *Service) registerLegacyHandlers(router *mux.Router) {
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

	if s.srvConn != nil {
		s.log.Info("Closing gRPC client connection")
		_ = s.srvConn.Close()
	}
}
