package srv

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/geolocation"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/xatu"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/grpc"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service"
	beacon_chain_timings "github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_chain_timings"
	beacon_slots "github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_slots"
	lab "github.com/ethpandaops/lab/backend/pkg/server/internal/service/lab"
	xatu_public_contributors "github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_public_contributors"
	"github.com/sirupsen/logrus"
)

// Service represents the srv service. It glues together all the sub-services and the gRPC server.
type Service struct {
	ctx    context.Context //nolint:containedctx // context is used for srv operations
	config *Config

	log logrus.FieldLogger

	// GRPC server
	grpcServer *grpc.Server

	// HTTP server for metrics
	httpServer *http.Server

	// Services
	services []service.Service

	// Clients
	ethereumClient    *ethereum.Client
	xatuClient        *xatu.Client
	storageClient     storage.Client
	cacheClient       cache.Client
	lockerClient      locker.Locker
	geolocationClient *geolocation.Client
	metrics           *metrics.Metrics
}

// New creates a new srv service
func New(config *Config) (*Service, error) {
	// Create lab instance
	log, err := logger.New(config.LogLevel, ServiceName)
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("config is invalid: %w", err)
	}

	return &Service{
		config: config,
		log:    log,
	}, nil
}

// Start starts the sRPC server and blocks until the context is canceled or an error occurs.
func (s *Service) Start(ctx context.Context) error {
	s.log.Info("Starting srv service")

	// Create a cancelable context based on the input context
	ctx, cancel := context.WithCancel(ctx)
	s.ctx = ctx

	// Set up signal handling to cancel the context
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		s.log.WithField("signal", sig.String()).Info("Received signal, initiating shutdown")
		cancel()
	}()

	// Initialize dependencies using the cancelable context
	if err := s.initializeDependencies(s.ctx); err != nil {
		return fmt.Errorf("failed to initialize dependencies: %w", err)
	}

	// Initialize services using the cancelable context
	if err := s.initializeServices(s.ctx); err != nil {
		cancel() // Ensure context is canceled on initialization error

		return fmt.Errorf("failed to initialize services: %w", err)
	}

	// Start HTTP server for metrics
	if err := s.startMetricsServer(); err != nil {
		cancel() // Ensure context is canceled on initialization error

		return fmt.Errorf("failed to start HTTP server for metrics: %w", err)
	}

	// Start all our services
	for _, service := range s.services {
		if err := service.Start(s.ctx); err != nil {
			cancel() // Ensure context is canceled on service start error

			return fmt.Errorf("failed to start service %s: %w", service.Name(), err)
		}
	}

	// Retrieve instantiated services for handlers
	bctService, ok := s.getService(beacon_chain_timings.BeaconChainTimingsServiceName).(*beacon_chain_timings.BeaconChainTimings)
	if !ok {
		s.log.Error("Failed to get beacon chain timings service")

		return fmt.Errorf("failed to get beacon chain timings service")
	}

	xpcService, ok := s.getService(xatu_public_contributors.XatuPublicContributorsServiceName).(*xatu_public_contributors.XatuPublicContributors)
	if !ok {
		s.log.Error("Failed to get xatu public contributors service")

		return fmt.Errorf("failed to get xatu public contributors service")
	}

	bsService, ok := s.getService(beacon_slots.ServiceName).(*beacon_slots.BeaconSlots)
	if !ok {
		s.log.Error("Failed to get beacon slots service")

		return fmt.Errorf("failed to get beacon slots service")
	}

	labService, ok := s.getService(lab.ServiceName).(*lab.Lab)
	if !ok {
		s.log.Error("Failed to get lab service")

		return fmt.Errorf("failed to get lab service")
	}

	// Instantiate gRPC handlers
	grpcServices := []grpc.Service{
		grpc.NewLab(s.log, labService),
		grpc.NewBeaconChainTimings(s.log, bctService),
		grpc.NewXatuPublicContributors(s.log, xpcService),
		grpc.NewBeaconSlotsHandler(s.log, bsService),
	}

	// Create gRPC server
	s.grpcServer = grpc.NewServer(
		s.log.WithField("component", "grpc_server"),
		s.config.Server,
	)

	// Start gRPC server with all our services.
	if err := s.grpcServer.Start(
		s.ctx,
		fmt.Sprintf("%s:%d", s.config.Server.Host, s.config.Server.Port),
		grpcServices,
	); err != nil {
		s.log.WithError(err).Error("Failed to start gRPC server")
		cancel()
	}

	// Block until context is canceled (either by signal or error)
	<-s.ctx.Done()
	s.log.Info("Context canceled, initiating graceful shutdown")

	// Perform graceful shutdown
	s.stop()

	s.log.Info("Srv service stopped")

	// Check the context error after shutdown attempt (optional, depends on desired exit behavior)
	if err := s.ctx.Err(); err != nil && err != context.Canceled {
		return fmt.Errorf("service stopped due to unexpected context error: %w", err)
	}

	return nil
}

// initializeServices initializes all services, passing the main service context.
func (s *Service) initializeServices(ctx context.Context) error { // ctx is already s.ctx passed from Start
	// Initialize all our services
	bct, err := beacon_chain_timings.New(
		s.log,
		s.config.Modules["beacon_chain_timings"].BeaconChainTimings,
		s.xatuClient,
		s.config.Ethereum,
		s.storageClient,
		s.cacheClient,
		s.lockerClient,
		s.metrics,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize beacon chain timings service: %w", err)
	}

	xpc, err := xatu_public_contributors.New(
		s.log,
		s.config.Modules["xatu_public_contributors"].XatuPublicContributors,
		s.ethereumClient,
		s.xatuClient,
		s.storageClient,
		s.cacheClient,
		s.lockerClient,
		s.metrics,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize xatu public contributors service: %w", err)
	}

	beaconSlotsService, err := beacon_slots.New(
		s.log,
		s.config.Modules["beacon_slots"].BeaconSlots,
		s.xatuClient,
		s.ethereumClient,
		s.storageClient,
		s.cacheClient,
		s.lockerClient,
		s.geolocationClient,
		s.metrics,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize beacon slots service: %w", err)
	}

	labService, err := lab.New(
		s.log,
		s.ethereumClient,
		s.cacheClient,
		bct,
		xpc,
		beaconSlotsService,
		s.metrics,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize lab service: %w", err)
	}

	s.services = []service.Service{
		labService,
		bct,
		xpc,
		beaconSlotsService,
	}

	return nil
}

// initializeDependencies initializes all dependencies, passing the main service context.
func (s *Service) initializeDependencies(ctx context.Context) error {
	// Initialize metrics service
	s.log.Info("Initializing metrics service")
	s.metrics = metrics.NewMetricsService("lab", s.log)

	// Initialize Ethereum client
	s.log.Info("Initializing Ethereum client")

	ethereumClient := ethereum.NewClient(s.config.Ethereum, s.metrics)
	if err := ethereumClient.Start(ctx); err != nil {
		return fmt.Errorf("failed to start Ethereum client: %w", err)
	}

	s.ethereumClient = ethereumClient

	// Initialize global XatuClickhouse
	s.log.Info("Initializing per-network Xatu ClickHouse clients")

	xatuClient, err := xatu.NewClient(s.log, s.config.GetXatuConfig(), s.metrics)
	if err != nil {
		return fmt.Errorf("failed to initialize global Xatu ClickHouse client: %w", err)
	}

	// Start the Xatu client
	if errr := xatuClient.Start(ctx); errr != nil {
		return fmt.Errorf("failed to start Xatu client: %w", errr)
	}

	// Initialize S3 Storage
	s.log.Info("Initializing S3 storage")

	storageClient, err := storage.New(s.config.Storage, s.log, s.metrics)
	if err != nil {
		return fmt.Errorf("failed to initialize S3 storage: %w", err)
	}

	// Start the storage client
	if errr := storageClient.Start(ctx); errr != nil {
		return fmt.Errorf("failed to start S3 storage client: %w", errr)
	}

	// Initialize cache client
	s.log.Info("Initializing cache client")

	cacheClient, err := cache.New(s.config.Cache, s.metrics)
	if err != nil {
		return fmt.Errorf("failed to initialize cache client: %w", err)
	}

	// Initialize locker client
	s.log.Info("Initializing locker client")
	lockerClient := locker.New(s.log, cacheClient, s.metrics)

	// Initialize geolocation client
	s.log.Info("Initializing geolocation client")

	geolocationClient, err := geolocation.New(s.log, s.config.Geolocation, s.metrics)
	if err != nil {
		return fmt.Errorf("failed to initialize geolocation client: %w", err)
	}

	// Start the geolocation client
	if err := geolocationClient.Start(ctx); err != nil {
		return fmt.Errorf("failed to start geolocation client: %w", err)
	}

	s.xatuClient = xatuClient
	s.storageClient = storageClient
	s.cacheClient = cacheClient
	s.lockerClient = lockerClient
	s.geolocationClient = geolocationClient

	return nil
}

func (s *Service) getService(name string) service.Service {
	for _, svc := range s.services { // Renamed loop variable for clarity
		if svc.Name() == name {
			return svc
		}
	}

	s.log.WithField("service_name", name).Error("Requested service not found during handler initialization")

	return nil // Explicitly return nil if not found
}

// stop gracefully stops the srv service and its components.
func (s *Service) stop() {
	s.log.Info("Starting graceful shutdown sequence")

	// Define a shutdown timeout
	// Use a background context for the timeout itself, as the main context (s.ctx) is already canceled.
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Use a WaitGroup to wait for all components to stop
	var wg sync.WaitGroup

	// Stop gRPC server gracefully
	if s.grpcServer != nil {
		wg.Add(1)

		go func() {
			defer wg.Done()
			s.log.Info("Stopping gRPC server...")
			s.grpcServer.Stop()
			s.log.Info("gRPC server stopped.")
		}()
	}

	// Stop HTTP server gracefully
	if s.httpServer != nil {
		wg.Add(1)

		go func() {
			defer wg.Done()
			s.log.Info("Stopping HTTP server...")

			if err := s.httpServer.Shutdown(shutdownCtx); err != nil {
				s.log.WithError(err).Warn("Error shutting down HTTP server")
			} else {
				s.log.Info("HTTP server stopped.")
			}
		}()
	}

	// Stop all registered services
	// Stop them in reverse order of startup
	for _, svc := range s.services {
		// Capture loop variable for goroutine
		serviceToStop := svc
		s.log.WithField("service_name", serviceToStop.Name()).Info("Stopping service...")
		serviceToStop.Stop()
		s.log.WithField("service_name", serviceToStop.Name()).Info("Service stopped.")
	}

	if s.xatuClient != nil {
		wg.Add(1)

		go func() {
			defer wg.Done()
			s.log.Info("Stopping Xatu client...")
			s.xatuClient.Stop()
			s.log.Info("Xatu client stopped.")
		}()
	}

	if s.storageClient != nil {
		wg.Add(1)

		go func() {
			defer wg.Done()
			s.log.Info("Stopping Storage client...")

			if err := s.storageClient.Stop(); err != nil {
				s.log.WithError(err).Warn("Error stopping storage client")
			} else {
				s.log.Info("Storage client stopped.")
			}
		}()
	}

	if s.cacheClient != nil {
		wg.Add(1)

		go func() {
			defer wg.Done()
			s.log.Info("Stopping Cache client...")

			if err := s.cacheClient.Stop(); err != nil {
				s.log.WithError(err).Warn("Error stopping cache client")
			} else {
				s.log.Info("Cache client stopped.")
			}
		}()
	}

	// Wait for all components to stop or timeout
	waitChan := make(chan struct{})
	go func() {
		wg.Wait()
		close(waitChan)
	}()

	select {
	case <-waitChan:
		s.log.Info("All components stopped gracefully.")
	case <-shutdownCtx.Done():
		s.log.Warn("Shutdown timed out after 30s. Some components may not have stopped cleanly.")
	}
}

// startMetricsServer starts an HTTP server to expose Prometheus metrics
func (s *Service) startMetricsServer() error {
	s.log.Info("Starting HTTP server for metrics")

	// Create a new HTTP server
	mux := http.NewServeMux()

	// Register the metrics handler
	mux.Handle("/metrics", s.metrics.Handler())

	// Create the HTTP server
	s.httpServer = &http.Server{
		Addr:              ":9090", // Default metrics port
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Start the HTTP server in a goroutine
	go func() {
		s.log.WithField("address", s.httpServer.Addr).Info("HTTP server for metrics listening")

		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.log.WithError(err).Error("HTTP server for metrics failed to serve")
		}
	}()

	return nil
}
