package srv

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/temporal"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/ethpandaops/lab/pkg/srv/proto"
	bctpb "github.com/ethpandaops/lab/pkg/srv/proto/beacon_chain_timings"
	labpb "github.com/ethpandaops/lab/pkg/srv/proto/lab"
)

// Service represents the srv service
type Service struct {
	ctx        context.Context
	config     *Config
	lab        *lab.Lab
	grpcServer *GRPCServer

	// Clients
	xatuClient     *xatu.Client
	storageClient  storage.Client
	temporalClient temporal.Client
}

// New creates a new srv service
func New(config *Config, logLevel string) (*Service, error) {
	// Create lab instance
	labInst, err := lab.New(lab.Config{
		LogLevel: logLevel,
	}, QualifiedName)
	if err != nil {
		return nil, fmt.Errorf("failed to create lab instance: %w", err)
	}

	return &Service{
		config: config,
		lab:    labInst,
	}, nil
}

// Start starts the srv service
func (s *Service) Start(ctx context.Context) error {
	s.lab.Log().Info("Starting srv service")

	s.ctx = ctx

	// Set up signal handling
	sigCh := make(chan os.Signal, 1)

	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh

		s.lab.Log().WithField("signal", sig.String()).Info("Received signal, shutting down")

		s.ctx.Done()
	}()

	// Initialize services
	if err := s.initializeServices(); err != nil {
		return fmt.Errorf("failed to initialize services: %w", err)
	}

	// Register workflows and activities
	// s.registerWorkflows()

	services := []proto.Service{
		labpb.NewService(s.lab),
		bctpb.NewService(s.lab.Log(), s.xatuClient, s.storageClient, s.temporalClient),
	}

	// Create gRPC server
	s.grpcServer = NewGRPCServer(
		s.lab.Log().WithField("component", "grpc_server"),
		s.config.Server,
	)

	// Start gRPC server
	if err := s.grpcServer.Start(
		s.ctx,
		fmt.Sprintf("%s:%d", s.config.Server.Host, s.config.Server.Port),
		services,
	); err != nil {
		s.lab.Log().WithError(err).Fatal("Failed to start gRPC server")
	}

	// Block until context is canceled
	<-s.ctx.Done()
	s.lab.Log().Info("Context canceled, shutting down")

	// Shut down all the lab services
	s.lab.Stop()

	// Clean up resources
	s.stop()

	s.lab.Log().Info("Srv service stopped")

	return nil
}

// initializeServices initializes all of the dependancies to run the srv service
func (s *Service) initializeServices() error {
	// Initialize global XatuClickhouse
	s.lab.Log().Info("Initializing per-network Xatu ClickHouse clients")
	xatuConfig := make(map[string]*clickhouse.Config)
	for networkName, networkConfig := range s.config.Networks {
		if networkConfig.Xatu != nil {
			xatuConfig[networkName] = networkConfig.Xatu
		}
	}

	xatuClient, err := s.lab.NewXatu(xatuConfig)
	if err != nil {
		return fmt.Errorf("failed to initialize global Xatu ClickHouse client: %w", err)
	}

	// Start the Xatu client
	if err := xatuClient.Start(s.ctx); err != nil {
		return fmt.Errorf("failed to start Xatu client: %w", err)
	}

	// Initialize S3 Storage
	s.lab.Log().Info("Initializing S3 storage")
	storageClient, err := s.lab.NewStorage(s.config.Storage)
	if err != nil {
		return fmt.Errorf("failed to initialize S3 storage: %w", err)
	}

	// Start the storage client
	if err := storageClient.Start(s.ctx); err != nil {
		return fmt.Errorf("failed to start S3 storage client: %w", err)
	}

	// Initialize Temporal client
	s.lab.Log().Info("Initializing Temporal client")
	temporalClient, err := s.lab.NewTemporal(s.config.Temporal)
	if err != nil {
		return fmt.Errorf("failed to initialize Temporal client: %w", err)
	}

	// Start the temporal client
	if err := temporalClient.Start(s.ctx); err != nil {
		return fmt.Errorf("failed to start Temporal client: %w", err)
	}

	// Start Temporal worker
	s.lab.Log().Info("Starting Temporal worker")
	if err := temporalClient.StartWorker(); err != nil {
		return fmt.Errorf("failed to start Temporal worker: %w", err)
	}

	s.xatuClient = xatuClient
	s.storageClient = storageClient
	s.temporalClient = temporalClient

	return nil
}

// // registerWorkflows registers all workflows and activities with Temporal
// func (s *Service) registerWorkflows() {
// 	s.lab.Log().Info("Registering workflows and activities")

// 	// Register beacon workflows
// 	s.lab.Temporal().RegisterWorkflow(beacon.SlotProcessWorkflow)
// 	s.lab.Temporal().RegisterWorkflow(beacon.ProcessHeadSlotWorkflow)
// 	s.lab.Temporal().RegisterWorkflow(beacon.ProcessBacklogWorkflow)
// 	s.lab.Temporal().RegisterWorkflow(beacon.ProcessMiddleWorkflow)

// 	// Create beacon activity implementations
// 	beaconActivities := beacon.NewActivityImplementations(s.lab)

// 	// Register beacon activities
// 	s.lab.Temporal().RegisterActivity(beaconActivities.GetCurrentSlot)
// 	s.lab.Temporal().RegisterActivity(beaconActivities.ProcessSlot)
// 	s.lab.Temporal().RegisterActivity(beaconActivities.GetProcessorState)
// 	s.lab.Temporal().RegisterActivity(beaconActivities.SaveProcessorState)
// 	s.lab.Temporal().RegisterActivity(beaconActivities.CalculateTargetBacklogSlot)
// 	s.lab.Temporal().RegisterActivity(beaconActivities.ProcessMissingSlots)

// 	// Import timings module

// 	// Register timings workflows
// 	s.lab.Temporal().RegisterWorkflow(timings.TimingsModuleWorkflow)
// 	s.lab.Temporal().RegisterWorkflow(timings.BlockTimingsProcessorWorkflow)
// 	s.lab.Temporal().RegisterWorkflow(timings.SizeCDFProcessorWorkflow)

// 	// Create timings activity implementations
// 	timingsActivities := timings.NewActivities(
// 		s.lab.Log().WithField("component", "timings"),
// 		s.lab,
// 		"timings",
// 	)

// 	// Register timings activities
// 	s.lab.Temporal().RegisterActivity(timingsActivities.ShouldProcessActivity)
// 	s.lab.Temporal().RegisterActivity(timingsActivities.ProcessBlockTimingsActivity)
// 	s.lab.Temporal().RegisterActivity(timingsActivities.ProcessSizeCDFActivity)
// 	s.lab.Temporal().RegisterActivity(timingsActivities.UpdateProcessorStateActivity)
// }

// stop stops the srv service
func (s *Service) stop() {
	// Stop gRPC server
	if s.grpcServer != nil {
		s.grpcServer.Stop()
	}
}
