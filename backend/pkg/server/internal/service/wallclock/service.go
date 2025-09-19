package wallclock

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/ethpandaops/ethwallclock"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

var (
	// ErrNoDataSource indicates no data source is available
	ErrNoDataSource = errors.New("no data source available")
	// ErrNetworkNotFound indicates the network was not found
	ErrNetworkNotFound = errors.New("network not found")
	// ErrGenesisNotAvailable indicates genesis data is not available
	ErrGenesisNotAvailable = errors.New("genesis config not available")
)

// NetworkConfig represents wallclock configuration for a network
type NetworkConfig struct {
	Name           string
	GenesisTime    *string // Optional: RFC3339 time string override
	SecondsPerSlot *uint64 // Optional: defaults to 12
}

// NetworkDataProvider provides network data from external sources
type NetworkDataProvider interface {
	GetNetworkGenesis(networkName string) (time.Time, error)
}

// Service manages wallclock instances for multiple networks
type Service struct {
	log            logrus.FieldLogger
	networkConfigs map[string]*NetworkConfig
	dataProvider   NetworkDataProvider
	networks       map[string]*Network
	mu             sync.RWMutex

	// Metrics
	metrics       *metrics.Metrics
	collector     *metrics.Collector
	wallclockSlot *prometheus.GaugeVec
}

// Network represents a single network's wallclock
type Network struct {
	Name      string
	wallclock *ethwallclock.EthereumBeaconChain
	mu        sync.Mutex

	// Metrics
	metrics        *metrics.Metrics
	collector      *metrics.Collector
	wallclockEpoch *prometheus.GaugeVec
}

// New creates a new wallclock service
func New(log logrus.FieldLogger, networkConfigs map[string]*NetworkConfig, dataProvider NetworkDataProvider, metricsSvc *metrics.Metrics) *Service {
	return &Service{
		log:            log.WithField("service", "wallclock"),
		networkConfigs: networkConfigs,
		dataProvider:   dataProvider,
		networks:       make(map[string]*Network),
		metrics:        metricsSvc,
	}
}

// Start initializes wallclock instances for all enabled networks
func (s *Service) Start(ctx context.Context) error {
	s.log.Info("Starting wallclock service")

	// Initialize metrics
	if err := s.initMetrics(); err != nil {
		return fmt.Errorf("failed to initialize metrics: %w", err)
	}

	// Create wallclock for each configured network
	for name, netConfig := range s.networkConfigs {
		// Get genesis time (from override or cartographoor)
		var genesisTime time.Time

		if netConfig.GenesisTime != nil {
			var err error

			genesisTime, err = time.Parse(time.RFC3339, *netConfig.GenesisTime)
			if err != nil {
				s.log.WithField("network", name).WithError(err).Error("Failed to parse genesis time")

				continue
			}

			s.log.WithFields(logrus.Fields{
				"network":     name,
				"source":      "config_override",
				"genesis":     genesisTime.Format(time.RFC3339),
				"genesis_str": *netConfig.GenesisTime,
			}).Info("Using genesis time from config override")
		} else {
			var err error

			genesisTime, err = s.dataProvider.GetNetworkGenesis(name)
			if err != nil {
				s.log.WithField("network", name).WithError(err).Error("Failed to get genesis time")

				continue
			}

			s.log.WithFields(logrus.Fields{
				"network": name,
				"source":  "cartographoor",
				"genesis": genesisTime.Format(time.RFC3339),
			}).Info("Using genesis time from cartographoor")
		}

		// Get seconds per slot (from override or default)
		var secondsPerSlot uint64 = 12 // default
		if netConfig.SecondsPerSlot != nil {
			secondsPerSlot = *netConfig.SecondsPerSlot
		}

		// Create network wallclock
		network := &Network{
			Name:    name,
			metrics: s.metrics,
		}

		// Initialize network metrics
		if s.metrics != nil {
			network.collector = s.metrics.NewCollector("wallclock_network")
			if err := network.initMetrics(); err != nil {
				s.log.WithField("network", name).WithError(err).Warn("Failed to initialize network metrics")
			}
		}

		// Create the wallclock
		//nolint:gosec // not a security issue
		slotDuration := time.Second * time.Duration(secondsPerSlot)
		network.wallclock = ethwallclock.NewEthereumBeaconChain(genesisTime, slotDuration, 32) // 32 slots per epoch is constant

		// Set up epoch tracking
		network.wallclock.OnEpochChanged(func(epoch ethwallclock.Epoch) {
			if network.wallclockEpoch != nil {
				network.wallclockEpoch.WithLabelValues(name).Set(float64(epoch.Number()))
			}
		})

		// Set up slot tracking
		network.wallclock.OnSlotChanged(func(slot ethwallclock.Slot) {
			if s.wallclockSlot != nil {
				s.wallclockSlot.WithLabelValues(name).Set(float64(slot.Number()))
			}
		})

		s.mu.Lock()
		s.networks[name] = network
		s.mu.Unlock()

		s.log.WithFields(logrus.Fields{
			"network":        name,
			"genesis":        genesisTime.Format(time.RFC3339),
			"secondsPerSlot": secondsPerSlot,
		}).Info("Initialized network wallclock")
	}

	s.log.WithField("networks", len(s.networks)).Info("Wallclock service started successfully")

	return nil
}

// Stop stops all wallclock instances
func (s *Service) Stop() error {
	s.log.Info("Stopping wallclock service")

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, network := range s.networks {
		if network.wallclock != nil {
			network.wallclock.Stop()
		}
	}

	s.log.Info("Wallclock service stopped")

	return nil
}

// Name returns the service name
func (s *Service) Name() string {
	return "wallclock"
}

// GetNetwork returns the wallclock for a specific network
func (s *Service) GetNetwork(name string) *Network {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.networks[name]
}

// GetWallclock returns the wallclock for a specific network
func (s *Service) GetWallclock(networkName string) *ethwallclock.EthereumBeaconChain {
	network := s.GetNetwork(networkName)
	if network == nil {
		return nil
	}

	return network.GetWallclock()
}

// Networks returns all networks
func (s *Service) Networks() []*Network {
	s.mu.RLock()
	defer s.mu.RUnlock()

	networks := make([]*Network, 0, len(s.networks))
	for _, network := range s.networks {
		networks = append(networks, network)
	}

	return networks
}

// initMetrics initializes service-level metrics
func (s *Service) initMetrics() error {
	if s.metrics == nil {
		return nil
	}

	s.collector = s.metrics.NewCollector("wallclock")

	var err error

	s.wallclockSlot, err = s.collector.NewGaugeVec(
		"wallclock_slot",
		"Current wallclock slot of the network",
		[]string{"network"},
	)
	if err != nil {
		return fmt.Errorf("failed to create wallclock_slot metric: %w", err)
	}

	return nil
}

// GetWallclock returns the network's wallclock
func (n *Network) GetWallclock() *ethwallclock.EthereumBeaconChain {
	n.mu.Lock()
	defer n.mu.Unlock()

	return n.wallclock
}

// initMetrics initializes network-level metrics
func (n *Network) initMetrics() error {
	if n.collector == nil {
		return nil
	}

	var err error

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
