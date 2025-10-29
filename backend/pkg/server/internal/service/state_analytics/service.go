package state_analytics

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const (
	ServiceName   = "state_analytics"
	StatusError   = "error"
	StatusSuccess = "success"
)

// Service provides state analytics functionality
type Service struct {
	pb.UnimplementedStateAnalyticsServer

	log              logrus.FieldLogger
	config           *Config
	clickhouseClient map[string]clickhouse.Client // Network name -> ClickHouse client

	metrics          *metrics.Metrics
	metricsCollector *metrics.Collector

	// Metric collectors
	requestsTotal   *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec
}

// New creates a new state analytics service
func New(
	log logrus.FieldLogger,
	config *Config,
	metricsSvc *metrics.Metrics,
) (*Service, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid state_analytics config: %w", err)
	}

	var metricsCollector *metrics.Collector
	if metricsSvc != nil {
		metricsCollector = metricsSvc.NewCollector(ServiceName)
		log.Debug("Created metrics collector for state_analytics service")
	}

	return &Service{
		log:              log.WithField("component", "service/"+ServiceName),
		config:           config,
		metrics:          metricsSvc,
		metricsCollector: metricsCollector,
		clickhouseClient: make(map[string]clickhouse.Client),
	}, nil
}

// Name returns the service name
func (s *Service) Name() string {
	return ServiceName
}

// Start initializes and starts the state analytics service
func (s *Service) Start(ctx context.Context) error {
	s.log.Info("Starting State Analytics service")

	// Initialize metrics
	if err := s.initializeMetrics(); err != nil {
		return fmt.Errorf("failed to initialize metrics: %w", err)
	}

	// Initialize ClickHouse clients for each network
	for networkName, networkConfig := range s.config.NetworkConfigs {
		if !networkConfig.Enabled {
			s.log.WithField("network", networkName).Debug("Network disabled, skipping")
			continue
		}

		if networkConfig.ClickHouse == nil {
			s.log.WithField("network", networkName).Warn("Network enabled but no ClickHouse config provided")
			continue
		}

		client, err := clickhouse.New(networkConfig.ClickHouse, s.log, networkName, s.metrics)
		if err != nil {
			return fmt.Errorf("failed to create ClickHouse client for network %s: %w", networkName, err)
		}

		if err := client.Start(ctx); err != nil {
			s.log.WithField("network", networkName).WithError(err).Warn("Failed to start ClickHouse client")
			continue
		}

		s.clickhouseClient[networkName] = client
		s.log.WithField("network", networkName).Info("Initialized ClickHouse client for state analytics")
	}

	if len(s.clickhouseClient) == 0 {
		return fmt.Errorf("no ClickHouse clients were successfully initialized")
	}

	s.log.WithField("networks", len(s.clickhouseClient)).Info("State Analytics service started successfully")

	return nil
}

// Stop gracefully stops the state analytics service
func (s *Service) Stop() {
	s.log.Info("Stopping State Analytics service")

	// Stop all ClickHouse clients
	for network, client := range s.clickhouseClient {
		if err := client.Stop(); err != nil {
			s.log.WithField("network", network).WithError(err).Warn("Failed to stop ClickHouse client")
		}
	}

	s.log.Info("State Analytics service stopped")
}

// initializeMetrics sets up Prometheus metrics for the service
func (s *Service) initializeMetrics() error {
	if s.metricsCollector == nil {
		return nil
	}

	var err error

	s.requestsTotal, err = s.metricsCollector.NewCounterVec(
		"requests_total",
		"Total number of state analytics requests",
		[]string{"method", "network", "status"},
	)
	if err != nil {
		return fmt.Errorf("failed to create requests_total metric: %w", err)
	}

	s.requestDuration, err = s.metricsCollector.NewHistogramVec(
		"request_duration_seconds",
		"Duration of state analytics requests",
		[]string{"method", "network"},
		prometheus.DefBuckets,
	)
	if err != nil {
		return fmt.Errorf("failed to create request_duration metric: %w", err)
	}

	return nil
}

// getNetworkFromContext extracts the network name from gRPC metadata
func (s *Service) getNetworkFromContext(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", status.Error(codes.InvalidArgument, "missing metadata")
	}

	networks := md.Get("network")
	if len(networks) == 0 {
		return "", status.Error(codes.InvalidArgument, "network not specified in metadata")
	}

	network := networks[0]

	// Validate network exists in our clients
	if _, exists := s.clickhouseClient[network]; !exists {
		return "", status.Errorf(codes.NotFound, "network %s not configured", network)
	}

	return network, nil
}

// getClient returns the ClickHouse client for a given network
func (s *Service) getClient(network string) (clickhouse.Client, error) {
	client, exists := s.clickhouseClient[network]
	if !exists {
		return nil, fmt.Errorf("no ClickHouse client for network: %s", network)
	}

	return client, nil
}

// recordMetrics records request metrics if metrics are enabled
func (s *Service) recordMetrics(method, network, status string, duration float64) {
	if s.requestsTotal != nil {
		s.requestsTotal.WithLabelValues(method, network, status).Inc()
	}

	if s.requestDuration != nil {
		s.requestDuration.WithLabelValues(method, network).Observe(duration)
	}
}
