package api

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/gorilla/mux"
	"google.golang.org/grpc"
)

// Service represents the api service
type Service struct {
	config       *Config
	ctx          context.Context
	cancel       context.CancelFunc
	router       *mux.Router
	server       *http.Server
	grpcServer   *grpc.Server
	grpcListener net.Listener
	restServer   *http.Server
	lab          *lab.Lab
}

// New creates a new api service
func New(config *Config, logLevel string) (*Service, error) {
	ctx, cancel := context.WithCancel(context.Background())

	// Create lab instance
	labInst, err := lab.New(lab.Config{
		LogLevel: logLevel,
	}, "lab.ethpandaops.io.api")
	if err != nil {
		return nil, fmt.Errorf("failed to create lab instance: %w", err)
	}

	return &Service{
		config: config,
		ctx:    ctx,
		cancel: cancel,
		router: mux.NewRouter(),
		lab:    labInst,
	}, nil
}

// Start starts the api service
func (s *Service) Start(ctx context.Context) error {
	s.lab.Log().Info("Starting api service")

	// Set up signal handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		s.lab.Log().WithField("signal", sig.String()).Info("Received signal, shutting down")
		s.cancel()
	}()

	// Initialize services
	if err := s.initializeServices(); err != nil {
		return fmt.Errorf("failed to initialize services: %w", err)
	}

	// Set up HTTP routes
	s.setupRoutes()

	// Create HTTP server
	s.server = &http.Server{
		Addr:    fmt.Sprintf("%s:%d", s.config.HttpServer.Host, s.config.HttpServer.Port),
		Handler: s.router,
	}

	// Start HTTP server
	go func() {
		s.lab.Log().WithField("addr", s.server.Addr).Info("Starting HTTP server")
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.lab.Log().WithError(err).Error("HTTP server error")
			s.cancel()
		}
	}()

	// Start gRPC gateway if enabled
	if s.config.EnableGRPCGateway {
		go func() {
			s.lab.Log().Info("Starting gRPC gateway")
			if err := s.StartGateway(ctx); err != nil {
				s.lab.Log().WithError(err).Error("gRPC gateway error")
				s.cancel()
			}
		}()
	}

	// Block until context is canceled
	<-s.ctx.Done()
	s.lab.Log().Info("Context canceled, cleaning up")

	// Clean up resources
	s.cleanup()

	s.lab.Log().Info("Api service stopped")
	return nil
}

// initializeServices initializes all services
func (s *Service) initializeServices() error {
	// var err error

	// Initialize broker client
	// s.lab.Log().Info("Initializing broker client")
	// err = s.lab.InitBroker(s.config.Broker)
	// if err != nil {
	// 	return fmt.Errorf("failed to initialize broker: %w", err)
	// }

	// // Initialize cache
	// s.lab.Log().Info("Initializing cache")
	// err = s.lab.InitCache(s.config.Cache)
	// if err != nil {
	// 	return fmt.Errorf("failed to initialize cache: %w", err)
	// }

	// // Initialize discovery to get SRV gRPC address
	// err = s.lab.InitDiscovery(s.config.Discovery)
	// if err != nil {
	// 	return fmt.Errorf("failed to initialize discovery: %w", err)
	// }

	// // Get SRV gRPC address if not configured
	// srvAddr, err := s.lab.Discovery().
	// if err != nil {
	// 	return fmt.Errorf("failed to get SRV gRPC address: %w", err)
	// }
	// s.config.SrvClient.Address = srvAddr

	// TODO: Initialize gRPC client to srv service

	return nil
}

// setupRoutes sets up HTTP routes
func (s *Service) setupRoutes() {
	// Add health check endpoint
	s.router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// TODO: Add API endpoints
}

// cleanup cleans up resources
func (s *Service) cleanup() {
	// Shutdown HTTP server
	if s.server != nil {
		s.lab.Log().Info("Shutting down HTTP server")
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
		defer cancel()
		if err := s.server.Shutdown(ctx); err != nil {
			s.lab.Log().WithError(err).Error("Failed to shut down HTTP server")
		}
	}

	// Shutdown REST server for gRPC gateway
	if s.restServer != nil {
		s.lab.Log().Info("Shutting down REST gateway server")
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
		defer cancel()
		if err := s.restServer.Shutdown(ctx); err != nil {
			s.lab.Log().WithError(err).Error("Failed to shut down REST gateway server")
		}
	}

	// Shutdown gRPC server
	if s.grpcServer != nil {
		s.lab.Log().Info("Shutting down gRPC server")
		s.grpcServer.GracefulStop()
		if s.grpcListener != nil {
			s.grpcListener.Close()
		}
	}

	// Close lab instance
	s.lab.Stop()
}
