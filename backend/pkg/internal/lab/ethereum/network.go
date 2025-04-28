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
	Spec   *Spec

	wallclock *ethwallclock.EthereumBeaconChain
	mu        sync.Mutex

	// Metrics
	metrics   *metrics.Metrics
	collector *metrics.Collector

	// Prometheus metrics
	wallclockEpoch *prometheus.GaugeVec
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

	return nil
}

func (n *Network) Start(ctx context.Context) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	if err := n.Config.Validate(); err != nil {
		return fmt.Errorf("failed to validate network config: %w", err)
	}

	// Initialize metrics
	if err := n.initMetrics(); err != nil {
		return fmt.Errorf("failed to initialize network metrics: %w", err)
	}

	// Fetch network specification
	var err error

	// Create a context with timeout
	fetchCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Update FetchSpecFromURL to use the context with timeout
	n.Spec, err = FetchSpecFromURLWithContext(fetchCtx, n.Config.ConfigURL)
	if err != nil {
		return fmt.Errorf("failed to fetch network specification: %w", err)
	}

	// Create wallclock using values from spec
	//nolint:gosec // not a security issue
	secondsPerSlot := time.Second * time.Duration(n.Spec.SecondsPerSlot)
	n.wallclock = ethwallclock.NewEthereumBeaconChain(n.Config.Genesis, secondsPerSlot, n.Spec.GetSlotsPerEpoch())

	// Set up epoch tracking
	n.wallclock.OnEpochChanged(func(epoch ethwallclock.Epoch) {
		if n.wallclockEpoch != nil {
			n.wallclockEpoch.WithLabelValues(n.Name).Set(float64(epoch.Number()))
		}
	})

	return nil
}

func (n *Network) Stop() error {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.wallclock != nil {
		n.wallclock.Stop()
	}

	return nil
}

func (n *Network) GetWallclock() *ethwallclock.EthereumBeaconChain {
	n.mu.Lock()
	defer n.mu.Unlock()

	return n.wallclock
}

// GetSpec returns the network specification
func (n *Network) GetSpec() *Spec {
	n.mu.Lock()
	defer n.mu.Unlock()

	return n.Spec
}
