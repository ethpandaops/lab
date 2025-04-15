package srv

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	// "github.com/ethpandaops/lab/pkg/internal/lab/ethereum" // Removed unused import
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/ethpandaops/lab/pkg/server/internal/grpc"
	"github.com/ethpandaops/lab/pkg/server/internal/service"
	beacon_chain_timings "github.com/ethpandaops/lab/pkg/server/internal/service/beacon_chain_timings"
	beacon_slots "github.com/ethpandaops/lab/pkg/server/internal/service/beacon_slots"
	xatu_public_contributors "github.com/ethpandaops/lab/pkg/server/internal/service/xatu_public_contributors"
	"github.com/sirupsen/logrus"
)

// Service represents the srv service. It glues together all the sub-services and the gRPC server.
type Service struct {
	ctx    context.Context
	config *Config

	log logrus.FieldLogger

	// GRPC server
	grpcServer *grpc.Server

	// Services
	services []service.Service

	// Clients
	xatuClient    *xatu.Client
	storageClient storage.Client
	cacheClient   cache.Client
	lockerClient  locker.Locker
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

// Start starts the sRPC server
func (s *Service) Start(ctx context.Context) error {
	s.log.Info("Starting srv service")

	s.ctx = ctx

	// Set up signal handling
	sigCh := make(chan os.Signal, 1)

	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh

		s.log.WithField("signal", sig.String()).Info("Received signal, shutting down")

		s.ctx.Done()
	}()

	// Initialize dependencies
	if err := s.initializeDependencies(); err != nil {
		return fmt.Errorf("failed to initialize dependencies: %w", err)
	}

	// Initialize services
	if err := s.initializeServices(ctx); err != nil {
		return fmt.Errorf("failed to initialize services: %w", err)
	}

	// Start all our services
	for _, service := range s.services {
		if err := service.Start(ctx); err != nil {
			return fmt.Errorf("failed to start service: %w", err)
		}
	}

	// Retrieve instantiated services for handlers
	bctService := s.getService(beacon_chain_timings.BeaconChainTimingsServiceName).(*beacon_chain_timings.BeaconChainTimings)
	xpcService := s.getService(xatu_public_contributors.XatuPublicContributorsServiceName).(*xatu_public_contributors.XatuPublicContributors)
	bsService := s.getService(beacon_slots.ServiceName).(*beacon_slots.BeaconSlots) // Use ServiceName constant

	// Instantiate gRPC handlers
	grpcServices := []grpc.Service{
		grpc.NewLab(s.log),
		grpc.NewBeaconChainTimings(s.log, bctService),
		grpc.NewXatuPublicContributors(s.log, xpcService),
		grpc.NewBeaconSlotsHandler(s.log, bsService), // Use correct constructor and pass service
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
		grpcServices, // Pass the instantiated handlers
	); err != nil {
		s.log.WithError(err).Fatal("Failed to start gRPC server")
	}

	// Block until context is canceled
	<-s.ctx.Done()
	s.log.Info("Context canceled, shutting down")

	// Shut down all the lab services
	s.stop()

	// Clean up resources
	s.stop()

	s.log.Info("Srv service stopped")

	return nil
}

func (s *Service) initializeServices(ctx context.Context) error {
	// Initialize all our services
	bct, err := beacon_chain_timings.New(
		s.log,
		s.config.Modules["beacon_chain_timings"].BeaconChainTimings,
		s.xatuClient,
		s.config.Ethereum,
		s.storageClient,
		s.cacheClient,
		s.lockerClient,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize beacon chain timings service: %w", err)
	}

	xpc, err := xatu_public_contributors.New(
		s.log,
		s.config.Modules["xatu_public_contributors"].XatuPublicContributors,
		s.config.Ethereum,
		s.xatuClient,
		s.storageClient,
		s.cacheClient,
		s.lockerClient,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize xatu public contributors service: %w", err)
	}

	// Convert proto config to service config - Assuming direct mapping for Enabled
	// TODO: Ensure all necessary fields from proto config are mapped to service config
	beaconSlotsProtoConfig := s.config.Modules["beacon_slots"].BeaconSlots
	if beaconSlotsProtoConfig == nil {
		return fmt.Errorf("beacon_slots module configuration not found")
	}
	beaconSlotsConfig := &beacon_slots.Config{
		Enabled: beaconSlotsProtoConfig.Enabled,
		// Add other config fields mapping here if needed
		// Example: BacklogSlots: beaconSlotsProtoConfig.BacklogSlots,
	}
	if err := beaconSlotsConfig.Validate(); err != nil { // Validate after mapping
		return fmt.Errorf("invalid beacon_slots config after mapping: %w", err)
	}

	beaconSlotsService, err := beacon_slots.New(
		s.log,
		beaconSlotsConfig, // Pass the mapped service config
		s.config.Ethereum, // Pass the overall Ethereum config
		s.xatuClient,
		s.storageClient,
		s.lockerClient,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize beacon slots service: %w", err)
	}

	s.services = []service.Service{
		service.NewLab(
			s.log,
		),
		bct,
		xpc,
		beaconSlotsService,
	}

	return nil
}

// initializeDependencies initializes all of the dependancies to run the srv service
func (s *Service) initializeDependencies() error {
	// Initialize global XatuClickhouse
	s.log.Info("Initializing per-network Xatu ClickHouse clients")

	xatuClient, err := xatu.NewClient(s.log, s.config.GetXatuConfig())
	if err != nil {
		return fmt.Errorf("failed to initialize global Xatu ClickHouse client: %w", err)
	}

	// Start the Xatu client
	if err := xatuClient.Start(s.ctx); err != nil {
		return fmt.Errorf("failed to start Xatu client: %w", err)
	}

	// Initialize S3 Storage
	s.log.Info("Initializing S3 storage")
	storageClient, err := storage.New(s.config.Storage, s.log)
	if err != nil {
		return fmt.Errorf("failed to initialize S3 storage: %w", err)
	}

	// Start the storage client
	if err := storageClient.Start(s.ctx); err != nil {
		return fmt.Errorf("failed to start S3 storage client: %w", err)
	}

	// Initialize cache client
	s.log.Info("Initializing cache client")
	cacheClient, err := cache.New(s.config.Cache)
	if err != nil {
		return fmt.Errorf("failed to initialize cache client: %w", err)
	}

	// Initialize locker client
	s.log.Info("Initializing locker client")
	lockerClient := locker.New(s.log, cacheClient)
	// Note: The original code had an 'if err != nil' check here, but locker.New doesn't return an error.
	// if err != nil {
	// 	return fmt.Errorf("failed to initialize locker client: %w", err)
	// }

	s.xatuClient = xatuClient
	s.storageClient = storageClient
	s.cacheClient = cacheClient
	s.lockerClient = lockerClient

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

// stop stops the srv service
func (s *Service) stop() {
	// Stop gRPC server
	if s.grpcServer != nil {
		s.grpcServer.Stop()
	}
	// TODO: Add logic to stop individual services if needed
}
