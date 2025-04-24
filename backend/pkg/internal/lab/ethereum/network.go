package ethereum

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ethpandaops/ethwallclock"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
)

type Network struct {
	Name   string
	Config *NetworkConfig

	wallclock *ethwallclock.EthereumBeaconChain
	mu        sync.Mutex
	running   bool

	// Metrics
	metrics   *metrics.Metrics
	collector *metrics.Collector

	// Prometheus metrics
	wallclockEpoch *prometheus.GaugeVec
	configLoaded   *prometheus.GaugeVec
}

// initMetrics initializes network-specific metrics
func (n *Network) initMetrics() error {
	// Skip if metrics service is not provided
	if n.metrics == nil {
		return nil
	}

	// Create a collector for this network if not already created
	if n.collector == nil {
		n.collector = n.metrics.NewCollector("ethereum_network")
	}

	// Register metrics
	var err error

	// Wallclock epoch metric
	n.wallclockEpoch, err = n.collector.NewGaugeVec(
		"wallclock_epoch",
		"Current wallclock epoch of the network",
		[]string{"network"},
	)
	if err != nil {
		return fmt.Errorf("failed to create wallclock_epoch metric: %w", err)
	}

	// Config loaded metric
	n.configLoaded, err = n.collector.NewGaugeVec(
		"config_loaded",
		"Whether the network configuration was successfully loaded (1 = yes, 0 = no)",
		[]string{"network"},
	)
	if err != nil {
		return fmt.Errorf("failed to create config_loaded metric: %w", err)
	}

	return nil
}

func (n *Network) Start(ctx context.Context) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	// Initialize metrics
	if err := n.initMetrics(); err != nil {
		return fmt.Errorf("failed to initialize network metrics: %w", err)
	}

	// Create wallclock
	n.wallclock = ethwallclock.NewEthereumBeaconChain(n.Config.Genesis, time.Second*12, 32)

	// Set up epoch tracking
	n.wallclock.OnEpochChanged(func(epoch ethwallclock.Epoch) {
		n.wallclockEpoch.WithLabelValues(n.Name).Set(float64(epoch.Number()))
	})

	// Mark network as running
	n.running = true

	// Set config loaded metric
	n.configLoaded.WithLabelValues(n.Name).Set(1)

	return nil
}

func (n *Network) Stop() error {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.wallclock != nil {
		n.wallclock.Stop()
	}

	// Mark network as stopped
	n.running = false

	return nil
}

// IsRunning returns whether the network is currently running
func (n *Network) IsRunning() bool {
	n.mu.Lock()
	defer n.mu.Unlock()

	return n.running
}

func (n *Network) GetWallclock() *ethwallclock.EthereumBeaconChain {
	n.mu.Lock()
	defer n.mu.Unlock()

	return n.wallclock
}
