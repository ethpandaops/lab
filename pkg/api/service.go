package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	apipb "github.com/ethpandaops/lab/pkg/api/proto"
)

// Service represents the api service
type Service struct {
	log           logrus.FieldLogger
	config        *Config
	ctx           context.Context
	cancel        context.CancelFunc
	router        *mux.Router
	server        *http.Server
	grpcServer    *grpc.Server
	grpcListener  net.Listener
	restServer    *http.Server
	cacheClient   cache.Client
	storageClient storage.Client

	// gRPC connection to srv service
	srvConn   *grpc.ClientConn
	srvClient apipb.LabAPIClient
}

// New creates a new api service
func New(config *Config) (*Service, error) {
	log, err := logger.New(config.LogLevel, "api")
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	cacheClient, err := cache.New(config.Cache)
	if err != nil {
		return nil, fmt.Errorf("failed to create cache client: %w", err)
	}

	storageClient, err := storage.New(config.Storage, log)
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

	s.server = &http.Server{
		Addr:    fmt.Sprintf("%s:%d", s.config.HttpServer.Host, s.config.HttpServer.Port),
		Handler: s.router,
	}

	go func() {
		s.log.WithField("addr", s.server.Addr).Info("Starting HTTP server")
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.log.WithError(err).Error("HTTP server error")
			s.cancel()
		}
	}()

	<-s.ctx.Done()
	s.log.Info("Context canceled, cleaning up")

	s.cleanup()

	s.log.Info("Api service stopped")
	return nil
}

func (s *Service) initializeServices(ctx context.Context) error {
	srvAddr := s.config.SrvClient.Address

	var conn *grpc.ClientConn
	var err error

	if s.config.SrvClient.TLS {
		conn, err = grpc.Dial(srvAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			return fmt.Errorf("failed to dial srv service at %s: %w", srvAddr, err)
		}
	} else {
		conn, err = grpc.Dial(srvAddr, grpc.WithInsecure())
		if err != nil {
			return fmt.Errorf("failed to dial srv service at %s: %w", srvAddr, err)
		}
	}
	s.srvConn = conn
	s.srvClient = apipb.NewLabAPIClient(conn)

	if err := s.storageClient.Start(ctx); err != nil {
		return fmt.Errorf("failed to start storage client: %w", err)
	}

	// Register custom HTTP handlers for backward compatibility
	s.registerLegacyHandlers()

	return nil
}

// registerLegacyHandlers registers HTTP handlers for backward compatibility with .json paths
func (s *Service) registerLegacyHandlers() {
	// Block timings
	s.router.HandleFunc("/api/beacon_chain_timings/block_timings/{network}/{window_file}.json", s.handleBlockTimings).Methods("GET")

	// Size CDF - OK
	s.router.HandleFunc("/api/beacon_chain_timings/size_cdf/{network}/{window_file}.json", s.handleSizeCDF).Methods("GET")

	// Xatu Summary - OK
	s.router.HandleFunc("/api/xatu_public_contributors/summary.json", s.handleXatuSummary).Methods("GET")

	// Beacon Slot
	s.router.HandleFunc("/api/beacon/slots/{network}/{slot}.json", s.handleBeaconSlot).Methods("GET")

	// Xatu User Summary - OK
	s.router.HandleFunc("/api/xatu_public_contributors/user-summaries/summary.json", s.handleXatuUserSummary).Methods("GET")

	// Xatu User - OK
	s.router.HandleFunc("/api/xatu_public_contributors/user-summaries/users/{username}.json", s.handleXatuUser).Methods("GET")

	// Xatu Users Window - OK
	s.router.HandleFunc("/api/xatu_public_contributors/users/{network}/{window_file}.json", s.handleXatuUsersWindow).Methods("GET")

	// Xatu Countries Window - OK
	s.router.HandleFunc("/api/xatu_public_contributors/countries/{network}/{window_file}.json", s.handleXatuCountriesWindow).Methods("GET")
}

// Generic handler for S3 passthroughs
func (s *Service) handleS3Passthrough(w http.ResponseWriter, r *http.Request, key string) {
	ctx := r.Context()

	data, err := s.storageClient.Get(ctx, key)
	if err != nil {
		if err == storage.ErrNotFound {
			http.Error(w, "Not found", http.StatusNotFound)
		} else {
			s.log.WithError(err).WithField("key", key).Error("Failed to get object from storage")
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=3600")
	w.Write(data)
}

// Handler implementations
func (s *Service) handleBlockTimings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	windowFile := vars["window_file"]
	key := "beacon_chain_timings/block_timings/" + network + "/" + windowFile + ".json"
	s.handleS3Passthrough(w, r, key)
}

func (s *Service) handleSizeCDF(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	windowFile := vars["window_file"]
	key := "beacon_chain_timings/size_cdf/" + network + "/" + windowFile + ".json"
	s.handleS3Passthrough(w, r, key)
}

func (s *Service) handleXatuSummary(w http.ResponseWriter, r *http.Request) {
	key := "xatu_public_contributors/summary.json"
	s.handleS3Passthrough(w, r, key)
}

func (s *Service) handleBeaconSlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	slot := vars["slot"]
	key := "beacon_slots/slots/" + network + "/" + slot + ".json"
	s.handleS3Passthrough(w, r, key)
}

func (s *Service) handleXatuUserSummary(w http.ResponseWriter, r *http.Request) {
	key := "xatu_public_contributors/user-summaries/summary.json"
	s.handleS3Passthrough(w, r, key)
}

func (s *Service) handleXatuUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]
	key := "xatu_public_contributors/user-summaries/users/" + username + ".json"
	s.handleS3Passthrough(w, r, key)
}

func (s *Service) handleXatuUsersWindow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	network := vars["network"]
	windowFile := vars["window_file"]

	key := "xatu_public_contributors/users/" + network + "/" + windowFile + ".json"
	s.handleS3Passthrough(w, r, key)
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
	var productionData []struct {
		Time      int64 `json:"time"`
		Countries []struct {
			Name  string `json:"name"`
			Value int    `json:"value"`
		} `json:"countries"`
	}

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
	w.Header().Set("Cache-Control", "max-age=3600")
	w.Write(responseData)
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
