package ethereum

import (
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
)

// Config contains the configuration for the Ethereum service
type Config struct {
	Networks map[string]*NetworkConfig `yaml:"networks"` // Per-network configurations
}

// NetworkConfig contains the configuration for a specific Ethereum network
type NetworkConfig struct {
	Name      string             `yaml:"name"`      // Network name
	Xatu      *clickhouse.Config `yaml:"xatu"`      // Per-network Xatu config
	ConfigURL string             `yaml:"configURL"` // URL to the network's config
	Genesis   time.Time          `yaml:"genesis"`   // Genesis time
	Forks     EthereumForkConfig `yaml:"forks"`     // Forks
}

// EthereumForkConfig contains the configuration for the Ethereum fork
type EthereumForkConfig struct {
	Consensus map[string]ConsensusLayerForkConfig `yaml:"consensus"`
}

// ConsensusLayerForkConfig contains the configuration for a consensus layer fork
type ConsensusLayerForkConfig struct {
	MinClientVersions map[string]string `yaml:"min_client_versions"`
}

func (c *Config) GetNetworkConfig(name string) *NetworkConfig {
	return c.Networks[name]
}

func (c *Config) Validate() error {
	for _, network := range c.Networks {
		if err := network.Validate(); err != nil {
			return fmt.Errorf("failed to validate network config: %w", err)
		}
	}

	return nil
}
func (c *NetworkConfig) Validate() error {
	if c.Name == "" {
		return fmt.Errorf("network name is required")
	}

	if c.ConfigURL == "" {
		return fmt.Errorf("configURL is required for network %s", c.Name)
	}

	return nil
}
