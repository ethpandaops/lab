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
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/geolocation"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/grpc"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_slots"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/experiments"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/state_analytics"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/wallclock"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
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
	wallclockService      *wallclock.Service
	storageClient         storage.Client
	cacheClient           cache.Client
	lockerClient          locker.Locker
	geolocationClient     *geolocation.Client
	xatuCBTService        *xatu_cbt.XatuCBT
	cartographoorService  *cartographoor.Service
	experimentsService    *experiments.ExperimentsService
	stateAnalyticsService *state_analytics.Service
	metrics               *metrics.Metrics
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
	bsService, ok := s.getService(beacon_slots.ServiceName).(*beacon_slots.BeaconSlots)
	if !ok {
		s.log.Error("Failed to get beacon slots service")

		return fmt.Errorf("failed to get beacon slots service")
	}

	// Instantiate gRPC handlers
	grpcServices := []grpc.Service{
		grpc.NewBeaconSlotsHandler(s.log, bsService),
		grpc.NewXatuCBT(s.log, s.xatuCBTService, s.wallclockService),
		grpc.NewCartographoorService(s.log, s.cartographoorService, s.xatuCBTService),
		grpc.NewConfigService(s.log, s.xatuCBTService, s.cartographoorService, nil, bsService, s.experimentsService),
	}

	// Add state analytics gRPC handler if service is initialized
	if s.stateAnalyticsService != nil {
		grpcServices = append(grpcServices, grpc.NewStateAnalytics(s.log, s.stateAnalyticsService))
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
	// Determine if beacon_slots service should be enabled based on experiments
	beaconSlotsEnabled := false

	if s.experimentsService != nil && s.config.Experiments != nil {
		// Check if any beacon-related experiments are enabled
		for _, exp := range *s.config.Experiments {
			if exp.Enabled && (exp.ID == "live-slots" ||
				exp.ID == "historical-slots" ||
				exp.ID == "block-production-flow" ||
				exp.ID == "locally-built-blocks") {
				beaconSlotsEnabled = true

				break
			}
		}
	}

	// Initialize beacon_slots service with minimal config (actual values come from experiments)
	defaultEnabled := true
	beaconSlotsConfig := &beacon_slots.Config{
		Enabled: beaconSlotsEnabled,
		Backfill: beacon_slots.BackfillConfig{
			Enabled: true,
			Slots:   1000, // Overridden by experiments config
		},
		HeadDelaySlots: 2, // Overridden by experiments config
		LocallyBuiltBlocksConfig: beacon_slots.LocallyBuiltBlocksConfig{
			Enabled: &defaultEnabled, // Overridden by experiments config
			Slots:   16,              // Overridden by experiments config
			TTL:     6 * time.Hour,   // Overridden by experiments config
		},
	}

	beaconSlotsService, err := beacon_slots.New(
		s.log,
		beaconSlotsConfig,
		s.experimentsService,
		s.wallclockService,
		s.xatuCBTService,
		s.storageClient,
		s.cacheClient,
		s.lockerClient,
		s.geolocationClient,
		s.metrics,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize beacon slots service: %w", err)
	}

	// Initialize state analytics service if configured
	if s.config.StateAnalytics != nil {
		stateAnalyticsSvc, err := state_analytics.New(s.log, s.config.StateAnalytics, s.metrics)
		if err != nil {
			return fmt.Errorf("failed to initialize state analytics service: %w", err)
		}

		s.stateAnalyticsService = stateAnalyticsSvc
	}

	s.services = []service.Service{
		beaconSlotsService,
		s.cartographoorService,
	}

	return nil
}

// initializeDependencies initializes all dependencies, passing the main service context.
func (s *Service) initializeDependencies(ctx context.Context) error {
	// Initialize metrics service
	s.log.Info("Initializing metrics service")
	s.metrics = metrics.NewMetricsService("lab", s.log)

	// Initialize Cartographoor service first (needed for wallclock)
	s.log.Info("Initializing Cartographoor service")

	cartographoorSvc, err := cartographoor.New(s.log, s.config.Cartographoor)
	if err != nil {
		return fmt.Errorf("failed to initialize Cartographoor service: %w", err)
	}

	// Start cartographoor service
	if err := cartographoorSvc.Start(ctx); err != nil {
		return fmt.Errorf("failed to start Cartographoor service: %w", err)
	}

	s.cartographoorService = cartographoorSvc

	// Initialize wallclock service (depends on cartographoor)
	s.log.Info("Initializing wallclock service")

	// Create NetworkDataAdapter using cartographoor service and xatu_cbt config for overrides
	networkDataAdapter := NewNetworkDataAdapter(s.cartographoorService, s.config.XatuCBT)

	// Build wallclock network configs from xatu_cbt config
	wallclockNetworkConfigs := make(map[string]*wallclock.NetworkConfig)

	for name, netConfig := range s.config.XatuCBT.NetworkConfigs {
		if netConfig.Enabled {
			wallclockNetworkConfigs[name] = &wallclock.NetworkConfig{
				Name:           name,
				GenesisTime:    netConfig.GenesisTime,
				SecondsPerSlot: netConfig.SecondsPerSlot,
			}
		}
	}

	wallclockSvc := wallclock.New(s.log, wallclockNetworkConfigs, networkDataAdapter, s.metrics)
	if err := wallclockSvc.Start(ctx); err != nil {
		return fmt.Errorf("failed to start wallclock service: %w", err)
	}

	s.wallclockService = wallclockSvc

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

	// Initialize Xatu CBT datasource
	s.log.Info("Initializing Xatu CBT datasource")

	xatuCBTService, err := xatu_cbt.New(
		s.log,
		s.config.XatuCBT,
		s.metrics,
		s.cartographoorService,
		s.wallclockService,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize Xatu CBT datasource: %w", err)
	}

	// Start the CBT service
	if err := xatuCBTService.Start(ctx); err != nil {
		return fmt.Errorf("failed to start Xatu CBT datasource: %w", err)
	}

	s.storageClient = storageClient
	s.cacheClient = cacheClient
	s.lockerClient = lockerClient
	s.geolocationClient = geolocationClient
	s.xatuCBTService = xatuCBTService

	// Initialize experiments service if configured
	if s.config.Experiments != nil && len(*s.config.Experiments) > 0 {
		s.experimentsService = experiments.NewExperimentsService(
			s.config.Experiments,
			s.log,
			s.xatuCBTService,
			s.cartographoorService,
		)

		if err := s.experimentsService.Start(ctx); err != nil {
			return fmt.Errorf("failed to start experiments service: %w", err)
		}
	}

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

	if s.xatuCBTService != nil {
		wg.Add(1)

		go func() {
			defer wg.Done()

			s.log.Info("Stopping Xatu CBT datasource...")

			if err := s.xatuCBTService.Stop(); err != nil {
				s.log.WithError(err).Warn("Error stopping Xatu CBT datasource")
			} else {
				s.log.Info("Xatu CBT datasource stopped.")
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
