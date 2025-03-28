package lab

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/pkg/internal/lab/broker"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/logger"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/sirupsen/logrus"
)

// Config contains configuration for the lab
type Config struct {
	LogLevel string `yaml:"logLevel"`
}

// Lab is a simple helper struct that helps services initialize their dependencies
type Lab struct {
	ctx         context.Context
	serviceName string
	log         logrus.FieldLogger
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

// NewBroker creates a new broker
func (l *Lab) NewBroker(config *broker.Config) (broker.Client, error) {
	brkr, err := broker.New(
		config,
		l.log,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create broker: %w", err)
	}

	if err := brkr.Start(l.ctx); err != nil {
		return nil, fmt.Errorf("failed to start broker: %w", err)
	}

	return brkr, nil
}

// NewXatu creates a new Xatu client
func (l *Lab) NewXatu(networks map[string]*clickhouse.Config) (*xatu.Client, error) {
	xatuNetworks := make(map[string]clickhouse.Client)

	for network, config := range networks {
		ch, err := clickhouse.New(
			config,
			l.log.WithField("network", network),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create ClickHouse client: %w", err)
		}

		xatuNetworks[network] = ch
	}

	return xatu.NewClient(xatuNetworks)
}

// NewStorage creates a new storage client
func (l *Lab) NewStorage(cfg *storage.Config) (storage.Client, error) {
	s, err := storage.New(
		cfg,
		l.log,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage client: %w", err)
	}

	return s, nil
}

// NewCache creates a new cache client
func (l *Lab) NewCache(cfg *cache.Config) (cache.Client, error) {
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
		return nil, fmt.Errorf("failed to create cache client: %w", err)
	}

	return c, nil
}

// NewLocker creates a new locker
func (l *Lab) NewLocker(cache cache.Client) (locker.Locker, error) {
	l.log.Info("Initializing locker")

	return locker.NewLocker(l.log, cache), nil
}

// Stop gracefully stops all the components
func (l *Lab) Stop() {
	l.log.Info("Lab stopped")
}
