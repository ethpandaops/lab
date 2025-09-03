package xatu_cbt

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

const (
	ServiceName = "xatu_cbt"
)

type XatuCBT struct {
	pb.UnimplementedXatuCBTServer

	log    logrus.FieldLogger
	config *Config

	cbtClients  map[string]clickhouse.Client
	cacheClient cache.Client

	metrics          *metrics.Metrics
	metricsCollector *metrics.Collector

	// Metric collectors
	requestsTotal    *prometheus.CounterVec
	requestDuration  *prometheus.HistogramVec
	cacheHitsTotal   *prometheus.CounterVec
	cacheMissesTotal *prometheus.CounterVec

	ctx      context.Context //nolint:containedctx // context is used for lifecycle management
	cancel   context.CancelFunc
	wg       sync.WaitGroup
	mu       sync.RWMutex
	networks map[string]*pb.NetworkInfo
}

func New(
	log logrus.FieldLogger,
	config *Config,
	cacheClient cache.Client,
	metricsSvc *metrics.Metrics,
) (*XatuCBT, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid xatu_cbt config: %w", err)
	}

	var metricsCollector *metrics.Collector
	if metricsSvc != nil {
		metricsCollector = metricsSvc.NewCollector(ServiceName)

		log.Debug("Created metrics collector for xatu_cbt service")
	}

	return &XatuCBT{
		log:              log.WithField("component", "service/"+ServiceName),
		config:           config,
		cacheClient:      cacheClient,
		metrics:          metricsSvc,
		metricsCollector: metricsCollector,
		cbtClients:       make(map[string]clickhouse.Client),
		networks:         make(map[string]*pb.NetworkInfo),
	}, nil
}

func (x *XatuCBT) Name() string {
	return ServiceName
}

func (x *XatuCBT) Start(ctx context.Context) error {
	x.log.Info("Starting XatuCBT datasource")

	x.ctx, x.cancel = context.WithCancel(ctx)

	// Initialize metrics
	if err := x.initializeMetrics(); err != nil {
		return fmt.Errorf("failed to initialize metrics: %w", err)
	}

	// Initialize CBT clients for each network
	for networkName, networkConfig := range x.config.NetworkConfigs {
		if !networkConfig.Enabled {
			x.log.WithField("network", networkName).Debug("Network disabled, skipping")

			continue
		}

		// Validate ClickHouse config exists
		if networkConfig.ClickHouse == nil {
			x.log.WithField("network", networkName).Warn("No ClickHouse config provided, skipping network")

			continue
		}

		client, err := clickhouse.New(networkConfig.ClickHouse, x.log, networkName, x.metrics)
		if err != nil {
			return fmt.Errorf("failed to create ClickHouse client for network %s: %w", networkName, err)
		}

		if err := client.Start(x.ctx); err != nil {
			x.log.WithField("network", networkName).WithError(err).Warn("Failed to start ClickHouse client, skipping network")

			continue
		}

		x.cbtClients[networkName] = client
		x.networks[networkName] = &pb.NetworkInfo{
			Name:    networkName,
			Enabled: true,
		}

		x.log.WithField("network", networkName).Info("Initialized ClickHouse client")
	}

	if len(x.cbtClients) == 0 {
		return fmt.Errorf("no CBT clients were successfully initialized")
	}

	x.log.WithField("networks", len(x.cbtClients)).Info("XatuCBT datasource started successfully")

	return nil
}

func (x *XatuCBT) Stop() error {
	x.log.Info("Stopping XatuCBT datasource")

	if x.cancel != nil {
		x.cancel()
	}

	// Stop all CBT clients
	for network, client := range x.cbtClients {
		if err := client.Stop(); err != nil {
			x.log.WithField("network", network).WithError(err).Warn("Failed to stop ClickHouse client")
		}
	}

	x.wg.Wait()
	x.log.Info("XatuCBT datasource stopped")

	return nil
}

func (x *XatuCBT) initializeMetrics() error {
	if x.metricsCollector == nil {
		return nil
	}

	var err error

	x.requestsTotal, err = x.metricsCollector.NewCounterVec(
		"requests_total",
		"Total number of XatuCBT requests",
		[]string{"method", "network", "status"},
	)
	if err != nil {
		return fmt.Errorf("failed to create requests_total metric: %w", err)
	}

	x.requestDuration, err = x.metricsCollector.NewHistogramVec(
		"request_duration_seconds",
		"Duration of XatuCBT requests in seconds",
		[]string{"method", "network"},
		prometheus.DefBuckets,
	)
	if err != nil {
		return fmt.Errorf("failed to create request_duration metric: %w", err)
	}

	x.cacheHitsTotal, err = x.metricsCollector.NewCounterVec(
		"cache_hits_total",
		"Total number of cache hits",
		[]string{"method", "network"},
	)
	if err != nil {
		return fmt.Errorf("failed to create cache_hits_total metric: %w", err)
	}

	x.cacheMissesTotal, err = x.metricsCollector.NewCounterVec(
		"cache_misses_total",
		"Total number of cache misses",
		[]string{"method", "network"},
	)
	if err != nil {
		return fmt.Errorf("failed to create cache_misses_total metric: %w", err)
	}

	return nil
}

// storeInCache stores a response in the cache
func (x *XatuCBT) storeInCache(key string, value interface{}, ttl time.Duration) {
	if x.cacheClient == nil {
		return
	}

	data, err := json.Marshal(value)
	if err != nil {
		x.log.WithError(err).Warn("Failed to marshal data for cache")

		return
	}

	if err := x.cacheClient.Set(key, data, ttl); err != nil {
		x.log.WithError(err).Warn("Failed to store in cache")
	}
}
