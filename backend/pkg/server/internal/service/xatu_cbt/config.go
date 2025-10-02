package xatu_cbt

import (
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
)

type Config struct {
	NetworkConfigs map[string]*NetworkConfig `yaml:"network_configs"`
	MaxQueryLimit  uint64                    `yaml:"max_query_limit"`
	DefaultLimit   uint64                    `yaml:"default_limit"`
}

type NetworkConfig struct {
	Enabled        bool               `yaml:"enabled"`
	GenesisTime    *string            `yaml:"genesisTime"`    // Optional: RFC3339 time string (e.g. "2020-12-01T12:00:23Z")
	SecondsPerSlot *uint64            `yaml:"secondsPerSlot"` // Optional: defaults to 12
	ClickHouse     *clickhouse.Config `yaml:"clickhouse"`     // CBT tables
	RawClickHouse  *clickhouse.Config `yaml:"raw_clickhouse"` // Raw xatu tables
}

func (c *Config) Validate() error {
	if c.MaxQueryLimit == 0 {
		c.MaxQueryLimit = 1000
	}

	if c.DefaultLimit == 0 {
		c.DefaultLimit = 100
	}

	if len(c.NetworkConfigs) == 0 {
		return fmt.Errorf("at least one network must be configured")
	}

	// Validate each network's ClickHouse config
	for network, cfg := range c.NetworkConfigs {
		if cfg.Enabled {
			// Validate CBT ClickHouse config if present
			if cfg.ClickHouse != nil {
				if err := cfg.ClickHouse.Validate(); err != nil {
					return fmt.Errorf("network %s clickhouse config: %w", network, err)
				}
			}

			// Validate raw ClickHouse config if present
			if cfg.RawClickHouse != nil {
				if err := cfg.RawClickHouse.Validate(); err != nil {
					return fmt.Errorf("network %s raw_clickhouse config: %w", network, err)
				}
			}
		}
	}

	return nil
}
