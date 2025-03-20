package api

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ethpandaops/lab/pkg/broker"
	"github.com/ethpandaops/lab/pkg/logger"
	"github.com/gorilla/mux"
)

// Service represents the api service
type Service struct {
	config Config
	log    *logger.Logger
	ctx    context.Context
	cancel context.CancelFunc
	broker broker.Broker
	router *mux.Router
	server *http.Server
}

// New creates a new api service
func New(cfg Config, log *logger.Logger) (*Service, error) {
	ctx, cancel := context.WithCancel(context.Background())

	return &Service{
		config: cfg,
		log:    log,
		ctx:    ctx,
		cancel: cancel,
		router: mux.NewRouter(),
	}, nil
}

// Start starts the api service
func (s *Service) Start() error {
	s.log.Info("Starting api service")

	// Set up signal handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		s.log.WithField("signal", sig.String()).Info("Received signal, shutting down")
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
		Addr:    fmt.Sprintf("%s:%d", s.config.Server.Host, s.config.Server.Port),
		Handler: s.router,
	}

	// Start HTTP server
	go func() {
		s.log.WithField("addr", s.server.Addr).Info("Starting HTTP server")
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.log.WithError(err).Error("HTTP server error")
			s.cancel()
		}
	}()

	// Block until context is canceled
	<-s.ctx.Done()
	s.log.Info("Context canceled, cleaning up")

	// Clean up resources
	s.cleanup()

	s.log.Info("Api service stopped")
	return nil
}

// initializeServices initializes all services
func (s *Service) initializeServices() error {
	var err error

	// Initialize broker client
	s.log.Info("Initializing broker client")
	brokerConfig := broker.Config{
		URL:     s.config.Broker.URL,
		Subject: s.config.Broker.Subject,
	}
	s.broker, err = broker.New(brokerConfig, s.log)
	if err != nil {
		return fmt.Errorf("failed to initialize broker: %w", err)
	}

	// TODO: Initialize cache

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
		s.log.Info("Shutting down HTTP server")
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
		defer cancel()
		if err := s.server.Shutdown(ctx); err != nil {
			s.log.WithError(err).Error("Failed to shut down HTTP server")
		}
	}

	// Close broker client
	if s.broker != nil {
		s.log.Info("Closing broker client")
		if err := s.broker.Close(); err != nil {
			s.log.WithError(err).Error("Failed to close broker client")
		}
	}
}
