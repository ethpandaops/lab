package ethereum

import (
	"fmt"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
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
	Validator ValidatorSet       `yaml:"validator"` // Validator set
	Forks     EthereumForkConfig `yaml:"forks"`     // Forks
}

// ValidatorSet contains the configuration for the validator set
type ValidatorSet struct {
	// KnownValidatorRanges contains the known validator ranges for the network
	// This is usually the genesis validator set for testnets.
	KnownValidatorRanges map[string]string `yaml:"knownValidatorRanges"`
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
		if network.Name == "" {
			return fmt.Errorf("network name is required")
		}
	}

	return nil
}
