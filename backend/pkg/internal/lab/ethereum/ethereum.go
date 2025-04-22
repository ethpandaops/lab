package ethereum

import (
	"context"
	"fmt"

	"github.com/ethpandaops/ethwallclock"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
)

type Client struct {
	networks map[string]*Network

	// Metrics
	metrics   *metrics.Metrics
	collector *metrics.Collector

	// Prometheus metrics
	wallclockSlot *prometheus.GaugeVec
}

func NewClient(config *Config, metricsSvc *metrics.Metrics) *Client {
	networks := make(map[string]*Network)

	client := &Client{
		networks: networks,
		metrics:  metricsSvc,
	}

	// Create networks with metrics
	for name, networkConfig := range config.Networks {
		network := &Network{
			Name:    name,
			Config:  networkConfig,
			metrics: metricsSvc,
		}

		// If metrics are enabled, create a collector for this network
		if metricsSvc != nil {
			network.collector = metricsSvc.NewCollector("ethereum_network")
		}

		networks[name] = network
	}

	return client
}

// initMetrics initializes Prometheus metrics
func (c *Client) initMetrics() error {
	// Create a collector for the ethereum subsystem
	c.collector = c.metrics.NewCollector("ethereum")

	// Register metrics
	var err error

	c.wallclockSlot, err = c.collector.NewGaugeVec(
		"wallclock_slot",
		"Wallclock slot of the network",
		[]string{"network"},
	)
	if err != nil {
		return fmt.Errorf("failed to create wallclock_slot metric: %w", err)
	}

	return nil
}

func (c *Client) Networks() []*Network {
	networks := make([]*Network, 0, len(c.networks))
	for _, network := range c.networks {
		networks = append(networks, network)
	}

	return networks
}

func (c *Client) GetNetwork(name string) *Network {
	return c.networks[name]
}

func (c *Client) Start(ctx context.Context) error {
	for name, network := range c.networks {
		if err := network.Start(ctx); err != nil {
			return err
		}

		if err := c.initMetrics(); err != nil {
			return fmt.Errorf("failed to initialize metrics: %w", err)
		}

		network.GetWallclock().OnSlotChanged(func(slot ethwallclock.Slot) {
			c.wallclockSlot.WithLabelValues(name).Set(float64(slot.Number()))
		})
	}

	return nil
}

func (c *Client) Stop() error {
	for _, network := range c.networks {
		network.Stop()
	}

	return nil
}
