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

// // AsFrontendConfig creates the lab configuration for the frontend
// // This has to be done here because the top level config is not available in the lab instance
// func (c *Config) AsFrontendConfig() *labpb.FrontendConfig {
// 	config := &labpb.FrontendConfig{}

// 	if c.FrontendConfig != nil {
// 		// Create modules configuration
// 		if c.Modules != nil {
// 			modules := &labpb.Modules{}

// 			// Set beacon chain timings module configuration
// 			if s.config.FrontendConfig.Modules.BeaconChainTimings != nil {
// 				bcTimings := &labpb.BeaconChainTimingsModule{
// 					Networks: s.config.FrontendConfig.Modules.BeaconChainTimings.Networks,
// 				}

// 				// Convert time windows
// 				for _, window := range s.config.FrontendConfig.Modules.BeaconChainTimings.TimeWindows {
// 					bcTimings.TimeWindows = append(bcTimings.TimeWindows, &labpb.TimeWindow{
// 						File:  window.File,
// 						Step:  window.Step,
// 						Label: window.Label,
// 						Range: window.Range,
// 					})
// 				}

// 				modules.BeaconChainTimings = bcTimings
// 			}

// 			// Set Xatu public contributors module configuration
// 			if s.config.FrontendConfig.Modules.XatuPublicContributors != nil {
// 				xatuContributors := &labpb.XatuPublicContributorsModule{
// 					Networks: s.config.FrontendConfig.Modules.XatuPublicContributors.Networks,
// 				}

// 				// Convert time windows
// 				for _, window := range s.config.FrontendConfig.Modules.XatuPublicContributors.TimeWindows {
// 					xatuContributors.TimeWindows = append(xatuContributors.TimeWindows, &labpb.TimeWindow{
// 						File:  window.File,
// 						Step:  window.Step,
// 						Label: window.Label,
// 						Range: window.Range,
// 					})
// 				}

// 				modules.XatuPublicContributors = xatuContributors
// 			}

// 			// Set beacon module configuration
// 			if s.config.FrontendConfig.Modules.Beacon != nil {
// 				beaconModule := &labpb.BeaconModule{
// 					Enabled:     s.config.FrontendConfig.Modules.Beacon.Enabled,
// 					Description: s.config.FrontendConfig.Modules.Beacon.Description,
// 					PathPrefix:  s.config.FrontendConfig.Modules.Beacon.PathPrefix,
// 					Networks:    make(map[string]*labpb.BeaconNetworkConfig),
// 				}

// 				// Convert networks
// 				for netName, netConfig := range s.config.FrontendConfig.Modules.Beacon.Networks {
// 					beaconModule.Networks[netName] = &labpb.BeaconNetworkConfig{
// 						HeadLagSlots: netConfig.HeadLagSlots,
// 						BacklogDays:  netConfig.BacklogDays,
// 					}
// 				}

// 				modules.Beacon = beaconModule
// 			}

// 			config.Modules = modules
// 		}

// 		// Set Ethereum configuration
// 		if s.config.FrontendConfig.Ethereum != nil && s.config.FrontendConfig.Ethereum.Networks != nil {
// 			ethereumConfig := &labpb.EthereumConfig{
// 				Networks: make(map[string]*labpb.Network),
// 			}

// 			// Convert networks
// 			for netName, netDetails := range s.config.FrontendConfig.Ethereum.Networks {
// 				network := &labpb.Network{
// 					GenesisTime: netDetails.GenesisTime,
// 				}

// 				// Set forks if available
// 				if netDetails.Forks != nil && netDetails.Forks.Consensus != nil && netDetails.Forks.Consensus.Electra != nil {
// 					electra := &labpb.ForkDetails{
// 						Epoch:             netDetails.Forks.Consensus.Electra.Epoch,
// 						MinClientVersions: netDetails.Forks.Consensus.Electra.MinClientVersions,
// 					}

// 					consensus := &labpb.ConsensusConfig{
// 						Electra: electra,
// 					}

// 					forks := &labpb.ForkConfig{
// 						Consensus: consensus,
// 					}

// 					network.Forks = forks
// 				}

// 				ethereumConfig.Networks[netName] = network
// 			}

// 			config.Ethereum = ethereumConfig
// 		}
// 	}

// 	return config
// }
