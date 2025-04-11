package srv

import (
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/server/internal/grpc"
	"github.com/ethpandaops/lab/pkg/server/internal/service/beacon_chain_timings"
	"github.com/ethpandaops/lab/pkg/server/internal/service/xatu_public_contributors"
)

// Config contains the configuration for the srv service
type Config struct {
	Server   *grpc.Config              `yaml:"grpc"`
	Networks map[string]*NetworkConfig `yaml:"networks"` // Per-network configurations
	Storage  *storage.Config           `yaml:"storage"`
	Modules  map[string]*ModuleConfig  `yaml:"modules"` // Per-module configurations
	// Broker   *broker.Config            `yaml:"broker"` // Broker is not used yet
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

// EthereumConfig contains the configuration for the Ethereum service
type EthereumConfig struct {
	Networks map[string]*NetworkConfig `yaml:"networks"` // Per-network configurations
}

// NetworkConfig contains the configuration for a specific Ethereum network
type NetworkConfig struct {
	NetworkConfig *ethereum.Config
	Xatu          *clickhouse.Config `yaml:"xatu"`      // Per-network Xatu config
	ConfigURL     string             `yaml:"configURL"` // URL to the network's config
	Genesis       time.Time          `yaml:"genesis"`   // Genesis time
	Validator     ValidatorSet       `yaml:"validator"` // Validator set
	Forks         EthereumForkConfig `yaml:"forks"`     // Forks
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

func (x *Config) Validate() error {
	return nil
}

func (x *Config) GetXatuConfig() map[string]*clickhouse.Config {
	xatuConfig := make(map[string]*clickhouse.Config)
	for networkName, networkConfig := range x.Networks {
		if networkConfig.Xatu != nil {
			xatuConfig[networkName] = networkConfig.Xatu
		}
	}

	return xatuConfig
}
