package xatu

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// Client is a client for Xatu
type Client struct {
	configs map[string]*clickhouse.Config
	clients map[string]clickhouse.Client
	log     logrus.FieldLogger

	// Metrics
	metrics                *metrics.Metrics
	collector              *metrics.Collector
	requestsTotal          *prometheus.CounterVec
	requestDuration        *prometheus.HistogramVec
	clickhouseClientsTotal *prometheus.GaugeVec
}

// NewClient creates a new Xatu client
// The metricsSvc parameter is optional for backward compatibility
func NewClient(log logrus.FieldLogger, networks map[string]*clickhouse.Config, metricsSvc ...*metrics.Metrics) (*Client, error) {
	client := &Client{
		configs: networks,
		log:     log.WithField("component", "xatu"),
	}

	// Handle optional metrics service parameter
	if len(metricsSvc) > 0 && metricsSvc[0] != nil {
		client.metrics = metricsSvc[0]
		client.initMetrics()
	}

	return client, nil
}

// initMetrics initializes Prometheus metrics for the Xatu client
func (c *Client) initMetrics() {
	// Create a collector for the xatu subsystem
	c.collector = c.metrics.NewCollector("xatu")

	// Register metrics
	var err error
	c.requestsTotal, err = c.collector.NewCounterVec(
		"requests_total",
		"Total number of requests made to Xatu services",
		[]string{"method", "status"},
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create requests_total metric")
	}

	c.requestDuration, err = c.collector.NewHistogramVec(
		"request_duration_seconds",
		"Duration of requests to Xatu services in seconds",
		[]string{"method"},
		prometheus.DefBuckets,
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create request_duration_seconds metric")
	}

	c.clickhouseClientsTotal, err = c.collector.NewGaugeVec(
		"clickhouse_clients_total",
		"Number of ClickHouse clients by status",
		[]string{"status"},
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create clickhouse_clients_total metric")
	}
}

func (c *Client) Start(ctx context.Context) error {
	startTime := time.Now()
	c.log.Info("Starting xatu client")
	clients := make(map[string]clickhouse.Client)

	// Track success/failure for metrics
	var status string = "success"
	defer func() {
		// Record metrics if available
		c.requestsTotal.WithLabelValues("start", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.requestDuration.WithLabelValues("start").Observe(duration)

	}()

	if len(c.configs) == 0 {
		c.log.Warn("No networks configured for xatu client")
	}

	successCount := 0
	failCount := 0

	for network, config := range c.configs {
		c.log.Infof("Creating clickhouse client for network %s", network)

		if config == nil {
			c.log.Errorf("Nil config provided for network %s, skipping", network)
			failCount++
			continue
		}

		clickhouseClient, err := clickhouse.New(config, c.log.WithField("network", network), c.metrics)
		if err != nil {
			failCount++
			status = "error"
			return fmt.Errorf("failed to create clickhouse client for network %s: %w", network, err)
		}

		// Additional nil check to prevent nil clients in the map
		if clickhouseClient == nil {
			failCount++
			status = "error"
			return fmt.Errorf("clickhouse.New returned nil client without error for network %s", network)
		}

		c.log.Infof("Starting clickhouse client for network %s", network)
		if err := clickhouseClient.Start(ctx); err != nil {
			failCount++
			status = "error"
			return fmt.Errorf("failed to start clickhouse client for network %s: %w", network, err)
		}

		c.log.Infof("Successfully started clickhouse client for network %s", network)
		successCount++

		clients[network] = clickhouseClient
	}

	c.clients = clients
	c.log.Infof("Started xatu client with %d network clients", len(clients))

	// Update metrics for client counts
	if c.metrics != nil && c.clickhouseClientsTotal != nil {
		c.clickhouseClientsTotal.WithLabelValues("success").Set(float64(successCount))
		c.clickhouseClientsTotal.WithLabelValues("error").Set(float64(failCount))
	}

	return nil
}

// GetClickhouseClientForNetwork returns a Clickhouse client for a given network
func (c *Client) GetClickhouseClientForNetwork(network string) (clickhouse.Client, error) {
	startTime := time.Now()
	var status string = "success"

	defer func() {
		// Record metrics if available
		if c.metrics != nil && c.requestsTotal != nil {
			c.requestsTotal.WithLabelValues("get_clickhouse_client", status).Inc()

			if c.requestDuration != nil {
				duration := time.Since(startTime).Seconds()
				c.requestDuration.WithLabelValues("get_clickhouse_client").Observe(duration)
			}
		}
	}()

	// Check if c.clients is nil
	if c.clients == nil {
		status = "error"
		c.log.Errorf("clients map is nil when getting ClickHouse client for network %s", network)
		return nil, fmt.Errorf("clients map is not initialized for network %s", network)
	}

	client, ok := c.clients[network]
	if !ok {
		status = "not_found"
		c.log.Warnf("No ClickHouse client found for network %s", network)
		return nil, fmt.Errorf("no clickhouse client found for network %s", network)
	}

	// Check for nil client (shouldn't happen but might be the cause of crashes)
	if client == nil {
		status = "error"
		c.log.Errorf("ClickHouse client for network %s exists in map but is nil", network)
		return nil, fmt.Errorf("clickhouse client for network %s is nil", network)
	}

	return client, nil
}

func (c *Client) Stop() {
	startTime := time.Now()

	// Record metrics if available
	if c.metrics != nil && c.requestsTotal != nil {
		c.requestsTotal.WithLabelValues("stop", "success").Inc()

		if c.requestDuration != nil {
			duration := time.Since(startTime).Seconds()
			c.requestDuration.WithLabelValues("stop").Observe(duration)
		}
	}

	// Reset client count metrics
	if c.metrics != nil && c.clickhouseClientsTotal != nil {
		c.clickhouseClientsTotal.WithLabelValues("success").Set(0)
		c.clickhouseClientsTotal.WithLabelValues("error").Set(0)
	}
}
