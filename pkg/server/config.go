package srv

import (
	"fmt"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/server/internal/grpc"
	"github.com/ethpandaops/lab/pkg/server/internal/service/beacon_chain_timings"
	"github.com/ethpandaops/lab/pkg/server/internal/service/xatu_public_contributors"
)

// Config contains the configuration for the srv service
type Config struct {
	LogLevel string                   `yaml:"logLevel" default:"info"`
	Server   *grpc.Config             `yaml:"grpc"`
	Ethereum *ethereum.Config         `yaml:"ethereum"`
	Storage  *storage.Config          `yaml:"storage"`
	Modules  map[string]*ModuleConfig `yaml:"modules"` // Per-module configurations
	Cache    *cache.Config            `yaml:"cache"`
}

// ModuleConfig contains the configuration for a specific module
type ModuleConfig struct {
	BeaconChainTimings     *beacon_chain_timings.Config     `yaml:"beacon_chain_timings"`
	XatuPublicContributors *xatu_public_contributors.Config `yaml:"xatu_public_contributors"`
}

// BeaconChainTimingsConfig contains the configuration for the Beacon Chain Timings module
type BeaconChainTimingsConfig struct {
	Enabled bool `yaml:"enabled"`
}

func (x *Config) Validate() error {
	if x.Ethereum == nil {
		return fmt.Errorf("ethereum config is required")
	}

	if err := x.Ethereum.Validate(); err != nil {
		return fmt.Errorf("ethereum config is invalid: %w", err)
	}

	return nil
}

func (x *Config) GetXatuConfig() map[string]*clickhouse.Config {
	xatuConfig := make(map[string]*clickhouse.Config)
	for networkName, networkConfig := range x.Ethereum.Networks {
		if networkConfig.Xatu != nil {
			xatuConfig[networkName] = networkConfig.Xatu
		}
	}

	return xatuConfig
}
