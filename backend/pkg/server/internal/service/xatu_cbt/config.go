package xatu_cbt

import (
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
)

type Config struct {
	CacheTTL       time.Duration             `yaml:"cache_ttl"`
	NetworkConfigs map[string]*NetworkConfig `yaml:"network_configs"`
	MaxQueryLimit  uint64                    `yaml:"max_query_limit"`
	DefaultLimit   uint64                    `yaml:"default_limit"`
}

type NetworkConfig struct {
	Enabled    bool               `yaml:"enabled"`
	ClickHouse *clickhouse.Config `yaml:"clickhouse"`
}

func (c *Config) Validate() error {
	if c.MaxQueryLimit == 0 {
		c.MaxQueryLimit = 1000
	}

	if c.DefaultLimit == 0 {
		c.DefaultLimit = 100
	}

	if c.CacheTTL == 0 {
		c.CacheTTL = 60 * time.Second
	}

	if len(c.NetworkConfigs) == 0 {
		return fmt.Errorf("at least one network must be configured")
	}

	// Validate each network's ClickHouse config
	for network, cfg := range c.NetworkConfigs {
		if cfg.Enabled && cfg.ClickHouse != nil {
			if err := cfg.ClickHouse.Validate(); err != nil {
				return fmt.Errorf("network %s clickhouse config: %w", network, err)
			}
		}
	}

	return nil
}
