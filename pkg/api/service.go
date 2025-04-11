package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/discovery"
	"github.com/ethpandaops/lab/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"

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
	discovery     discovery.Discovery

	// gRPC connection to srv service
	srvConn   *grpc.ClientConn
	srvClient apipb.LabAPIClient
}

// New creates a new api service
func New(config *Config) (*Service, error) {
	log, err := logger.New(config.LogLevel, "lab.ethpandaops.io.api")
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

	var disc discovery.Discovery
	switch config.Discovery.Type {
	case "", "static":
		disc = discovery.NewStaticDiscovery(config.Discovery.Static)
	default:
		return nil, fmt.Errorf("unsupported discovery type: %s", config.Discovery.Type)
	}

	return &Service{
		log:           log,
		config:        config,
		router:        mux.NewRouter(),
		cacheClient:   cacheClient,
		storageClient: storageClient,
		discovery:     disc,
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

	if err := s.initializeServices(); err != nil {
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

func (s *Service) initializeServices() error {
	srvAddr, err := s.discovery.GetServiceURL("srv")
	if err != nil {
		return fmt.Errorf("failed to discover srv service URL: %w", err)
	}
	s.config.SrvClient.Address = srvAddr

	conn, err := grpc.Dial(srvAddr, grpc.WithInsecure())
	if err != nil {
		return fmt.Errorf("failed to dial srv service at %s: %w", srvAddr, err)
	}
	s.srvConn = conn
	s.srvClient = apipb.NewLabAPIClient(conn)

	return nil
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

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
