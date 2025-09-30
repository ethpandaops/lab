package xatu_cbt

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/wallclock"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
)

const (
	ServiceName     = "xatu_cbt"
	DefaultPageSize = 100
	StatusError     = "error"
	StatusSuccess   = "success"
)

type XatuCBT struct {
	pb.UnimplementedXatuCBTServer

	log    logrus.FieldLogger
	config *Config

	cbtClients           map[string]clickhouse.Client
	rawClients           map[string]clickhouse.Client
	cartographoorService *cartographoor.Service
	wallclockService     *wallclock.Service

	metrics          *metrics.Metrics
	metricsCollector *metrics.Collector

	// Metric collectors
	requestsTotal   *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec
}

func New(
	log logrus.FieldLogger,
	config *Config,
	metricsSvc *metrics.Metrics,
	cartographoorService *cartographoor.Service,
	wallclockSvc *wallclock.Service,
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
		log:                  log.WithField("component", "service/"+ServiceName),
		config:               config,
		metrics:              metricsSvc,
		metricsCollector:     metricsCollector,
		cartographoorService: cartographoorService,
		wallclockService:     wallclockSvc,
		cbtClients:           make(map[string]clickhouse.Client),
		rawClients:           make(map[string]clickhouse.Client),
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

	// Initialize CBT and raw clients for each network
	for networkName, networkConfig := range x.config.NetworkConfigs {
		if !networkConfig.Enabled {
			x.log.WithField("network", networkName).Debug("Network disabled, skipping")

			continue
		}

		// Initialize CBT ClickHouse client if configured
		if networkConfig.ClickHouse != nil {
			client, err := clickhouse.New(networkConfig.ClickHouse, x.log, networkName, x.metrics)
			if err != nil {
				return fmt.Errorf("failed to create CBT ClickHouse client for network %s: %w", networkName, err)
			}

			if err := client.Start(ctx); err != nil {
				x.log.WithField("network", networkName).WithError(err).Warn("Failed to start CBT ClickHouse client")
			} else {
				x.cbtClients[networkName] = client
				x.log.WithField("network", networkName).Info("Initialized CBT ClickHouse client")
			}
		}

		// Initialize raw ClickHouse client if configured
		if networkConfig.RawClickHouse != nil {
			client, err := clickhouse.New(networkConfig.RawClickHouse, x.log, networkName, x.metrics)
			if err != nil {
				return fmt.Errorf("failed to create raw ClickHouse client for network %s: %w", networkName, err)
			}

			if err := client.Start(ctx); err != nil {
				x.log.WithField("network", networkName).WithError(err).Warn("Failed to start raw ClickHouse client")
			} else {
				x.rawClients[networkName] = client
				x.log.WithField("network", networkName).Info("Initialized raw ClickHouse client")
			}
		}

		// Warn if no clients were configured for an enabled network
		if networkConfig.ClickHouse == nil && networkConfig.RawClickHouse == nil {
			x.log.WithField("network", networkName).Warn("Network enabled but no ClickHouse configs provided")
		}
	}

	if len(x.cbtClients) == 0 && len(x.rawClients) == 0 {
		return fmt.Errorf("no ClickHouse clients were successfully initialized")
	}

	x.log.WithFields(logrus.Fields{
		"cbt_clients": len(x.cbtClients),
		"raw_clients": len(x.rawClients),
	}).Info("XatuCBT datasource started successfully")

	return nil
}

func (x *XatuCBT) Stop() error {
	x.log.Info("Stopping XatuCBT datasource")

	// Stop all CBT clients
	for network, client := range x.cbtClients {
		if err := client.Stop(); err != nil {
			x.log.WithField("network", network).WithError(err).Warn("Failed to stop CBT ClickHouse client")
		}
	}

	// Stop all raw clients
	for network, client := range x.rawClients {
		if err := client.Stop(); err != nil {
			x.log.WithField("network", network).WithError(err).Warn("Failed to stop raw ClickHouse client")
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

// extractNetworkFromMetadata extracts and validates the network name from gRPC metadata.
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

	// Validate network using cartographoor service
	if x.cartographoorService != nil {
		validatedNetwork, err := x.cartographoorService.ValidateNetwork(ctx, network)
		if err != nil {
			return "", fmt.Errorf("invalid network '%s': %w", network, err)
		}

		return validatedNetwork.Name, nil
	}

	// Fallback to original behavior if no validator is available
	return network, nil
}

// GetClickHouseClient returns the CBT ClickHouse client for the specified network
func (x *XatuCBT) GetClickHouseClient(network string) (clickhouse.Client, error) {
	client, ok := x.cbtClients[network]
	if !ok {
		return nil, fmt.Errorf("CBT ClickHouse client not configured for network %s", network)
	}

	return client, nil
}

// GetRawClickHouseClient returns the raw ClickHouse client for the specified network
func (x *XatuCBT) GetRawClickHouseClient(network string) (clickhouse.Client, error) {
	client, ok := x.rawClients[network]
	if !ok {
		return nil, fmt.Errorf("raw ClickHouse client not configured for network %s", network)
	}

	return client, nil
}

// IsNetworkEnabled checks if a network is enabled in the xatu_cbt configuration
func (x *XatuCBT) IsNetworkEnabled(network string) bool {
	if x.config == nil || x.config.NetworkConfigs == nil {
		return false
	}

	netConfig, ok := x.config.NetworkConfigs[network]
	if !ok {
		return false
	}

	return netConfig.Enabled
}

// GetEnabledNetworks returns a list of all enabled networks
func (x *XatuCBT) GetEnabledNetworks() []string {
	if x.config == nil || x.config.NetworkConfigs == nil {
		return []string{}
	}

	networks := make([]string, 0)

	for name, netConfig := range x.config.NetworkConfigs {
		if netConfig.Enabled {
			networks = append(networks, name)
		}
	}

	return networks
}

// GetNetworkGenesisTime returns the genesis time override for a network if configured
func (x *XatuCBT) GetNetworkGenesisTime(network string) *int64 {
	if x.config == nil || x.config.NetworkConfigs == nil {
		return nil
	}

	netConfig, exists := x.config.NetworkConfigs[network]
	if !exists || !netConfig.Enabled || netConfig.GenesisTime == nil {
		return nil
	}

	// Parse the RFC3339 string to get Unix timestamp
	genesisTime, err := time.Parse(time.RFC3339, *netConfig.GenesisTime)
	if err != nil {
		x.log.WithError(err).WithField("network", network).Error("Failed to parse genesis time")

		return nil
	}

	timestamp := genesisTime.Unix()

	return &timestamp
}
