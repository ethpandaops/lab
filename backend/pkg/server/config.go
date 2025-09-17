package srv

import (
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/geolocation"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/grpc"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_chain_timings"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_slots"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
)

type Config struct {
	LogLevel      string                   `yaml:"logLevel" default:"info"`
	Server        *grpc.Config             `yaml:"grpc"`
	Ethereum      *ethereum.Config         `yaml:"ethereum"`
	Storage       *storage.Config          `yaml:"storage"`
	Modules       map[string]*ModuleConfig `yaml:"modules"`
	Cache         *cache.Config            `yaml:"cache"`
	Geolocation   *geolocation.Config      `yaml:"geolocation"`
	XatuCBT       *xatu_cbt.Config         `yaml:"xatu_cbt"`
	Cartographoor *cartographoor.Config    `yaml:"cartographoor"`
}

type ModuleConfig struct {
	BeaconChainTimings *beacon_chain_timings.Config `yaml:"beacon_chain_timings"`
	BeaconSlots        *beacon_slots.Config         `yaml:"beacon_slots"`
}

func (x *Config) Validate() error {
	if x.Ethereum == nil {
		return fmt.Errorf("ethereum config is required")
	}

	if err := x.Ethereum.Validate(); err != nil {
		return fmt.Errorf("ethereum config is invalid: %w", err)
	}

	if x.Modules == nil {
		return fmt.Errorf("modules config is required")
	}

	if x.Geolocation == nil {
		return fmt.Errorf("geolocation config is required")
	}

	if x.XatuCBT == nil {
		return fmt.Errorf("xatu_cbt config is required")
	}

	if err := x.XatuCBT.Validate(); err != nil {
		return fmt.Errorf("xatu_cbt config is invalid: %w", err)
	}

	// Cartographoor config is optional, but validate if provided
	if x.Cartographoor != nil {
		if err := x.Cartographoor.Validate(); err != nil {
			return fmt.Errorf("cartographoor config is invalid: %w", err)
		}
	} else {
		// Provide default configuration
		x.Cartographoor = &cartographoor.Config{}
		if err := x.Cartographoor.Validate(); err != nil {
			return fmt.Errorf("cartographoor default config validation failed: %w", err)
		}
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
