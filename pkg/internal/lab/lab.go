package lab

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/pkg/internal/lab/broker"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/pkg/internal/lab/discovery"
	"github.com/ethpandaops/lab/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/temporal"
	"github.com/sirupsen/logrus"
)

// Config contains configuration for the lab
type Config struct {
	LogLevel string `yaml:"logLevel"`
}

// Lab represents the main lab application
type Lab struct {
	ctx         context.Context
	serviceName string
	log         logrus.FieldLogger
	discovery   discovery.Client
	broker      broker.Client
	xatu        clickhouse.Client
	storage     storage.Client
	temporal    temporal.Client
	cache       cache.Client
}

// New creates a new lab instance
func New(config Config, serviceName string) (*Lab, error) {
	if serviceName == "" {
		return nil, fmt.Errorf("service name cannot be empty")
	}

	// Create logger
	var log logrus.FieldLogger
	var err error

	log, err = logger.New(config.LogLevel, serviceName)
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	log.WithField("service", serviceName).Info("Initializing lab")

	l := &Lab{
		serviceName: serviceName,
		log:         log,
	}

	return l, nil
}

func (l *Lab) Start(ctx context.Context) error {
	l.ctx = ctx

	l.log.Info("Starting lab")

	return nil
}

// Log returns the log
func (l *Lab) Log() logrus.FieldLogger {
	return l.log
}

// InitBroker initializes the broker
func (l *Lab) InitBroker(config *broker.Config) error {
	if l.broker != nil {
		return nil
	}

	brkr, err := broker.New(
		config,
		l.log,
	)
	if err != nil {
		return fmt.Errorf("failed to create broker: %w", err)
	}

	if err := brkr.Start(l.ctx); err != nil {
		return fmt.Errorf("failed to start broker: %w", err)
	}

	l.broker = brkr

	return nil
}

// GetBroker returns the broker
func (l *Lab) Broker() broker.Client {
	return l.broker
}

// InitXatu initializes Xatu
func (l *Lab) InitXatu(config *clickhouse.Config) error {
	if l.xatu != nil {
		return nil
	}

	l.log.WithField("host", config.Host).Info("Initializing ClickHouse")

	ch, err := clickhouse.New(
		config,
		l.log,
	)
	if err != nil {
		return fmt.Errorf("failed to create ClickHouse client: %w", err)
	}

	l.xatu = ch

	return nil
}

// GetXatu returns the Xatu client
func (l *Lab) Xatu() clickhouse.Client {
	return l.xatu
}

// InitStorage initializes storage
func (l *Lab) InitStorage(cfg *storage.Config) error {
	l.log.
		WithField("endpoint", cfg.Endpoint).
		WithField("bucket", cfg.Bucket).
		Info("Initializing storage")

	s, err := storage.New(
		cfg,
		l.log,
	)
	if err != nil {
		return fmt.Errorf("failed to create storage client: %w", err)
	}

	l.storage = s

	return nil
}

// GetStorage returns the storage client
func (l *Lab) Storage() storage.Client {
	return l.storage
}

// InitTemporal initializes Temporal
func (l *Lab) InitTemporal(cfg *temporal.Config) error {
	t, err := temporal.New(
		cfg,
		l.log,
	)
	if err != nil {
		return fmt.Errorf("failed to create Temporal client: %w", err)
	}

	l.temporal = t

	return nil
}

// GetTemporal returns the Temporal client
func (l *Lab) Temporal() temporal.Client {
	return l.temporal
}

// InitCache initializes the cache
func (l *Lab) InitCache(cfg *cache.Config) error {
	l.log.WithField("type", cfg.Type).Info("Initializing cache")

	cacheOptions := map[string]interface{}{}
	if cfg.Config != nil {
		cacheOptions = cfg.Config
	}

	c, err := cache.New(
		cache.Config{
			Type:   cache.CacheType(cfg.Type),
			Config: cacheOptions,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to create cache client: %w", err)
	}

	l.cache = c

	return nil
}

// GetCache returns the cache client
func (l *Lab) Cache() cache.Client {
	return l.cache
}

// GetDiscovery returns the discovery client
func (l *Lab) Discovery() discovery.Client {
	return l.discovery
}

// Stop gracefully stops all the components
func (l *Lab) Stop() {
	if l.broker != nil {
		l.broker.Stop()
	}

	if l.xatu != nil {
		if err := l.xatu.Stop(); err != nil {
			l.log.WithError(err).Error("Failed to stop ClickHouse client")
		}
	}

	if l.storage != nil {
		// Storage doesn't have a close method
	}

	if l.temporal != nil {
		l.temporal.Stop()
	}

	if l.cache != nil {
		if err := l.cache.Stop(); err != nil {
			l.log.WithError(err).Error("Failed to stop cache client")
		}
	}

	l.log.Info("Lab stopped")
}
