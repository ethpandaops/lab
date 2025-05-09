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
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_public_contributors"
)

type Config struct {
	LogLevel    string                   `yaml:"logLevel" default:"info"`
	Server      *grpc.Config             `yaml:"grpc"`
	Ethereum    *ethereum.Config         `yaml:"ethereum"`
	Storage     *storage.Config          `yaml:"storage"`
	Modules     map[string]*ModuleConfig `yaml:"modules"`
	Cache       *cache.Config            `yaml:"cache"`
	Geolocation *geolocation.Config      `yaml:"geolocation"`
}

type ModuleConfig struct {
	BeaconChainTimings     *beacon_chain_timings.Config     `yaml:"beacon_chain_timings"`
	XatuPublicContributors *xatu_public_contributors.Config `yaml:"xatu_public_contributors"`
	BeaconSlots            *beacon_slots.Config             `yaml:"beacon_slots"`
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
