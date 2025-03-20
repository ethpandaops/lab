package srv

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/ethpandaops/lab/pkg/broker"
	"github.com/ethpandaops/lab/pkg/clickhouse"
	"github.com/ethpandaops/lab/pkg/logger"
	"github.com/ethpandaops/lab/pkg/storage"
	"github.com/ethpandaops/lab/pkg/temporal"
)

// Config contains the configuration for the srv service
type Config struct {
	Server     ServerConfig     `yaml:"server"`
	ClickHouse ClickHouseConfig `yaml:"clickhouse"`
	S3         S3Config         `yaml:"s3"`
	Temporal   TemporalConfig   `yaml:"temporal"`
	Broker     BrokerConfig     `yaml:"broker"` // Renamed from NATS
}

// ServerConfig contains the configuration for the gRPC server
type ServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

// ClickHouseConfig contains the configuration for ClickHouse
type ClickHouseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Database string `yaml:"database"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	Secure   bool   `yaml:"secure"`
}

// S3Config contains the configuration for S3
type S3Config struct {
	Endpoint        string `yaml:"endpoint"`
	Region          string `yaml:"region"`
	Bucket          string `yaml:"bucket"`
	AccessKeyID     string `yaml:"access_key_id"`
	SecretAccessKey string `yaml:"secret_access_key"`
	UseSSL          bool   `yaml:"use_ssl"`
	UsePathStyle    bool   `yaml:"use_path_style"`
}

// TemporalConfig contains the configuration for Temporal
type TemporalConfig struct {
	Address     string `yaml:"address"`
	Namespace   string `yaml:"namespace"`
	TaskQueue   string `yaml:"task_queue"`
	WorkerCount int    `yaml:"worker_count"`
}

// BrokerConfig contains the configuration for the message broker
type BrokerConfig struct {
	URL     string `yaml:"url"`
	Subject string `yaml:"subject"`
}

// Service represents the srv service
type Service struct {
	config     Config
	log        *logger.Logger
	ctx        context.Context
	cancel     context.CancelFunc
	clickhouse *clickhouse.Client
	storage    *storage.S3Storage
	temporal   *temporal.Client
	broker     broker.Broker
}

// New creates a new srv service
func New(cfg Config, log *logger.Logger) (*Service, error) {
	ctx, cancel := context.WithCancel(context.Background())

	return &Service{
		config: cfg,
		log:    log,
		ctx:    ctx,
		cancel: cancel,
	}, nil
}

// Start starts the srv service
func (s *Service) Start() error {
	s.log.Info("Starting srv service")

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

	// Block until context is canceled
	<-s.ctx.Done()
	s.log.Info("Context canceled, cleaning up")

	// Clean up resources
	s.cleanup()

	s.log.Info("Srv service stopped")
	return nil
}

// initializeServices initializes all services
func (s *Service) initializeServices() error {
	var err error

	// Initialize ClickHouse
	s.log.Info("Initializing ClickHouse client")
	s.clickhouse, err = clickhouse.NewClient(
		s.config.ClickHouse.Host,
		s.config.ClickHouse.Port,
		s.config.ClickHouse.Database,
		s.config.ClickHouse.Username,
		s.config.ClickHouse.Password,
		s.config.ClickHouse.Secure,
		s.log,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize ClickHouse client: %w", err)
	}

	// Initialize S3 Storage
	s.log.Info("Initializing S3 storage")
	s.storage, err = storage.NewS3Storage(
		s.config.S3.Endpoint,
		s.config.S3.Region,
		s.config.S3.Bucket,
		s.config.S3.AccessKeyID,
		s.config.S3.SecretAccessKey,
		s.config.S3.UseSSL,
		s.config.S3.UsePathStyle,
		s.log,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize S3 storage: %w", err)
	}

	// Initialize Temporal client
	s.log.Info("Initializing Temporal client")
	s.temporal, err = temporal.NewClient(
		s.config.Temporal.Address,
		s.config.Temporal.Namespace,
		s.config.Temporal.TaskQueue,
		s.log,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize Temporal client: %w", err)
	}

	// Start Temporal worker
	s.log.Info("Starting Temporal worker")
	if err := s.temporal.StartWorker(s.ctx); err != nil {
		return fmt.Errorf("failed to start Temporal worker: %w", err)
	}

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

	return nil
}

// cleanup cleans up resources
func (s *Service) cleanup() {
	// Close ClickHouse connection
	if s.clickhouse != nil {
		s.log.Info("Closing ClickHouse connection")
		if err := s.clickhouse.Close(); err != nil {
			s.log.WithError(err).Error("Failed to close ClickHouse connection")
		}
	}

	// Close Temporal client
	if s.temporal != nil {
		s.log.Info("Closing Temporal client")
		s.temporal.Close()
	}

	// Close broker client
	if s.broker != nil {
		s.log.Info("Closing broker client")
		if err := s.broker.Close(); err != nil {
			s.log.WithError(err).Error("Failed to close broker client")
		}
	}
}
