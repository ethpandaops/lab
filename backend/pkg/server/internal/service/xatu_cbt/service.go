package xatu_cbt

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
)

const (
	ServiceName     = "xatu_cbt"
	DefaultPageSize = 100
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
	}, nil
}

func (x *XatuCBT) Name() string {
	return ServiceName
}

func (x *XatuCBT) Start(ctx context.Context) error {
	x.log.Info("Starting XatuCBT datasource")

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

		if err := client.Start(ctx); err != nil {
			x.log.WithField("network", networkName).WithError(err).Warn("Failed to start ClickHouse client, skipping network")

			continue
		}

		x.cbtClients[networkName] = client

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

	// Stop all CBT clients
	for network, client := range x.cbtClients {
		if err := client.Stop(); err != nil {
			x.log.WithField("network", network).WithError(err).Warn("Failed to stop ClickHouse client")
		}
	}

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

// getNetworkClient extracts network from context and returns the corresponding client.
func (x *XatuCBT) getNetworkClient(ctx context.Context) (clickhouse.Client, error) {
	network, err := x.extractNetworkFromMetadata(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to extract network from metadata: %w", err)
	}

	client, ok := x.cbtClients[network]
	if !ok {
		return nil, fmt.Errorf("network %s not configured", network)
	}

	return client, nil
}

// extractNetworkFromMetadata extracts the network name from gRPC metadata.
func (x *XatuCBT) extractNetworkFromMetadata(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", fmt.Errorf("no metadata found")
	}

	networks := md.Get("network")
	if len(networks) == 0 {
		return "", fmt.Errorf("network not found in metadata")
	}

	network := networks[0]
	if network == "" {
		return "", fmt.Errorf("network is empty")
	}

	return network, nil
}
