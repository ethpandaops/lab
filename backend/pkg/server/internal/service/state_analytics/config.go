package state_analytics

import (
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
)

// Config holds configuration for the state analytics service
type Config struct {
	// NetworkConfigs maps network names to their configurations
	NetworkConfigs map[string]*NetworkConfig `yaml:"network_configs"`
}

// NetworkConfig holds configuration for a specific network
type NetworkConfig struct {
	// Enabled determines if this network is active
	Enabled bool `yaml:"enabled"`

	// ClickHouse configuration for accessing Xatu data
	ClickHouse *clickhouse.Config `yaml:"clickhouse"`
}

// Validate validates the state analytics configuration
func (c *Config) Validate() error {
	if c == nil {
		return fmt.Errorf("config cannot be nil")
	}

	if len(c.NetworkConfigs) == 0 {
		return fmt.Errorf("at least one network must be configured")
	}

	// Validate each network config
	for network, netConfig := range c.NetworkConfigs {
		if netConfig == nil {
			return fmt.Errorf("network config for %s cannot be nil", network)
		}

		if netConfig.Enabled && netConfig.ClickHouse == nil {
			return fmt.Errorf("network %s is enabled but has no ClickHouse config", network)
		}

		// Validate ClickHouse config if present
		if netConfig.ClickHouse != nil {
			if err := netConfig.ClickHouse.Validate(); err != nil {
				return fmt.Errorf("invalid ClickHouse config for network %s: %w", network, err)
			}
		}
	}

	return nil
}
