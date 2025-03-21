package srv

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/ethpandaops/lab/pkg/internal/lab/broker"
	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/temporal"
	"github.com/ethpandaops/lab/pkg/srv/workflows/beacon"
	"github.com/ethpandaops/lab/pkg/srv/workflows/timings"
)

// Config contains the configuration for the srv service
type Config struct {
	Server   *ServerConfig             `yaml:"server"`
	Ethereum *EthereumConfig           `yaml:"ethereum"`
	Xatu     *clickhouse.Config        `yaml:"xatu"`     // Global Xatu config
	Networks map[string]*NetworkConfig `yaml:"networks"` // Per-network configurations
	Storage  *storage.Config           `yaml:"storage"`
	Temporal *temporal.Config          `yaml:"temporal"`
	Broker   *broker.Config            `yaml:"broker"`
}

// NetworkConfig contains the configuration for a specific network
type NetworkConfig struct {
	Name     string             `yaml:"name"`
	Ethereum *EthereumConfig    `yaml:"ethereum"`
	Xatu     *clickhouse.Config `yaml:"xatu"` // Network-specific Xatu config
}

type EthereumConfig struct {
	GenesisTime time.Time `yaml:"genesisTime"`
	Features    Features  `yaml:"features"`
}

type Features struct {
	Timings bool `yaml:"timings"`
}

// ServerConfig contains the configuration for the gRPC server
type ServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

// Service represents the srv service
type Service struct {
	ctx    context.Context
	config *Config
	lab    *lab.Lab
}

// New creates a new srv service
func New(config *Config, logLevel string) (*Service, error) {
	// Create lab instance
	labInst, err := lab.New(lab.Config{
		LogLevel: logLevel,
	}, "lab.ethpandaops.io.srv")
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
	s.registerWorkflows()

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

// initializeServices initializes all services
func (s *Service) initializeServices() error {
	var err error

	// Initialize global XatuClickhouse
	s.lab.Log().Info("Initializing global ClickHouse client")
	err = s.lab.InitXatu(s.config.Xatu)
	if err != nil {
		return fmt.Errorf("failed to initialize global Xatu ClickHouse client: %w", err)
	}

	// Initialize per-network XatuClickhouse instances
	for networkName, networkConfig := range s.config.Networks {
		if networkConfig.Xatu != nil {
			s.lab.Log().WithField("network", networkName).Info("Initializing network-specific ClickHouse client")
			err = s.lab.InitXatuForNetwork(networkName, networkConfig.Xatu)
			if err != nil {
				return fmt.Errorf("failed to initialize Xatu ClickHouse client for network %s: %w", networkName, err)
			}
		}
	}

	// Initialize S3 Storage
	s.lab.Log().Info("Initializing S3 storage")
	err = s.lab.InitStorage(s.config.Storage)
	if err != nil {
		return fmt.Errorf("failed to initialize S3 storage: %w", err)
	}

	// Initialize Temporal client
	s.lab.Log().Info("Initializing Temporal client")
	err = s.lab.InitTemporal(s.config.Temporal)
	if err != nil {
		return fmt.Errorf("failed to initialize Temporal client: %w", err)
	}

	// Start Temporal worker
	s.lab.Log().Info("Starting Temporal worker")
	if err := s.lab.Temporal().StartWorker(); err != nil {
		return fmt.Errorf("failed to start Temporal worker: %w", err)
	}

	// Initialize broker client
	s.lab.Log().Info("Initializing broker client")
	err = s.lab.InitBroker(s.config.Broker)
	if err != nil {
		return fmt.Errorf("failed to initialize broker: %w", err)
	}

	return nil
}

// registerWorkflows registers all workflows and activities with Temporal
func (s *Service) registerWorkflows() {
	s.lab.Log().Info("Registering workflows and activities")

	// Register beacon workflows
	s.lab.Temporal().RegisterWorkflow(beacon.SlotProcessWorkflow)
	s.lab.Temporal().RegisterWorkflow(beacon.ProcessHeadSlotWorkflow)
	s.lab.Temporal().RegisterWorkflow(beacon.ProcessBacklogWorkflow)
	s.lab.Temporal().RegisterWorkflow(beacon.ProcessMiddleWorkflow)

	// Create beacon activity implementations
	beaconActivities := beacon.NewActivityImplementations(s.lab)

	// Register beacon activities
	s.lab.Temporal().RegisterActivity(beaconActivities.GetCurrentSlot)
	s.lab.Temporal().RegisterActivity(beaconActivities.ProcessSlot)
	s.lab.Temporal().RegisterActivity(beaconActivities.GetProcessorState)
	s.lab.Temporal().RegisterActivity(beaconActivities.SaveProcessorState)
	s.lab.Temporal().RegisterActivity(beaconActivities.CalculateTargetBacklogSlot)
	s.lab.Temporal().RegisterActivity(beaconActivities.ProcessMissingSlots)

	// Import timings module

	// Register timings workflows
	s.lab.Temporal().RegisterWorkflow(timings.TimingsModuleWorkflow)
	s.lab.Temporal().RegisterWorkflow(timings.BlockTimingsProcessorWorkflow)
	s.lab.Temporal().RegisterWorkflow(timings.SizeCDFProcessorWorkflow)

	// Create timings activity implementations
	timingsActivities := timings.NewActivities(
		s.lab.Log().WithField("component", "timings"),
		s.lab,
		"timings",
	)

	// Register timings activities
	s.lab.Temporal().RegisterActivity(timingsActivities.ShouldProcessActivity)
	s.lab.Temporal().RegisterActivity(timingsActivities.ProcessBlockTimingsActivity)
	s.lab.Temporal().RegisterActivity(timingsActivities.ProcessSizeCDFActivity)
	s.lab.Temporal().RegisterActivity(timingsActivities.UpdateProcessorStateActivity)
}

// stop stops the srv service
func (s *Service) stop() {
}
