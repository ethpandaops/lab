package grpc

import (
	"context"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_chain_timings"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_slots"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_public_contributors"
	"github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// ConfigService provides gRPC API for frontend configuration
type ConfigService struct {
	config.UnimplementedConfigServiceServer
	log                  logrus.FieldLogger
	ethereumClient       *ethereum.Client
	cartographoorService *cartographoor.Service
	bctService           *beacon_chain_timings.BeaconChainTimings
	xpcService           *xatu_public_contributors.XatuPublicContributors
	bsService            *beacon_slots.BeaconSlots
}

// NewConfigService creates a new ConfigService
func NewConfigService(
	log logrus.FieldLogger,
	ethereumClient *ethereum.Client,
	cartographoorService *cartographoor.Service,
	bctService *beacon_chain_timings.BeaconChainTimings,
	xpcService *xatu_public_contributors.XatuPublicContributors,
	bsService *beacon_slots.BeaconSlots,
) *ConfigService {
	return &ConfigService{
		log:                  log.WithField("grpc", "config"),
		ethereumClient:       ethereumClient,
		cartographoorService: cartographoorService,
		bctService:           bctService,
		xpcService:           xpcService,
		bsService:            bsService,
	}
}

// Start starts the gRPC service
func (c *ConfigService) Start(ctx context.Context, server *grpc.Server) error {
	c.log.Info("Starting Config gRPC service")
	config.RegisterConfigServiceServer(server, c)

	return nil
}

// Name returns the service name
func (c *ConfigService) Name() string {
	return "config"
}

// GetConfig returns the complete frontend configuration
func (c *ConfigService) GetConfig(
	ctx context.Context,
	req *config.GetConfigRequest,
) (*config.GetConfigResponse, error) {
	c.log.Debug("GetConfig called")

	// Build ethereum networks config from cartographoor data filtered by configured networks
	networksConfig := make(map[string]*config.NetworkConfig)

	// Get all networks from cartographoor
	networksData := c.cartographoorService.GetNetworksData()
	if networksData != nil && networksData.Networks != nil {
		for _, network := range networksData.Networks {
			// Only include networks that are configured in the lab
			configured := false

			for _, ethNetwork := range c.ethereumClient.Networks() {
				if ethNetwork.Name == network.Name {
					configured = true

					break
				}
			}

			if configured {
				netConfig := &config.NetworkConfig{
					Name:        network.Name,
					Status:      network.Status,
					ChainId:     network.ChainId,
					Description: network.Description,
					LastUpdated: network.LastUpdated,
				}

				// Add genesis time if available
				if network.GenesisConfig != nil {
					netConfig.GenesisTime = network.GenesisConfig.GenesisTime
				}

				// Add service URLs if available
				if len(network.ServiceUrls) > 0 {
					netConfig.ServiceUrls = network.ServiceUrls
				}

				// Add fork information if available
				if network.Forks != nil && network.Forks.Consensus != nil && network.Forks.Consensus.Electra != nil {
					netConfig.Forks = &config.ForkConfig{
						Consensus: &config.ConsensusForks{
							Electra: &config.ForkInfo{
								Epoch:             network.Forks.Consensus.Electra.Epoch,
								MinClientVersions: network.Forks.Consensus.Electra.MinClientVersions,
							},
						},
					}
				}

				networksConfig[network.Name] = netConfig
			}
		}
	}

	// Build modules config
	modulesConfig := &config.ModulesConfig{}

	// Add beacon chain timings module config
	if c.bctService != nil {
		bctConfig := c.bctService.FrontendModuleConfig()
		if bctConfig != nil {
			timeWindows := make([]*config.TimeWindow, 0, len(bctConfig.TimeWindows))
			for _, tw := range bctConfig.TimeWindows {
				timeWindows = append(timeWindows, &config.TimeWindow{
					File:  tw.File,
					Step:  tw.Step,
					Range: tw.Range,
					Label: tw.Label,
				})
			}

			modulesConfig.BeaconChainTimings = &config.BeaconChainTimingsModule{
				Networks:    bctConfig.Networks,
				TimeWindows: timeWindows,
				PathPrefix:  bctConfig.PathPrefix,
			}
		}
	}

	// Add xatu public contributors module config
	if c.xpcService != nil {
		xpcConfig := c.xpcService.FrontendModuleConfig()
		if xpcConfig != nil {
			timeWindows := make([]*config.TimeWindow, 0, len(xpcConfig.TimeWindows))
			for _, tw := range xpcConfig.TimeWindows {
				timeWindows = append(timeWindows, &config.TimeWindow{
					File:  tw.File,
					Step:  tw.Step,
					Range: tw.Range,
					Label: tw.Label,
				})
			}

			modulesConfig.XatuPublicContributors = &config.XatuPublicContributorsModule{
				Networks:    xpcConfig.Networks,
				TimeWindows: timeWindows,
				PathPrefix:  xpcConfig.PathPrefix,
				Enabled:     xpcConfig.Enabled,
			}
		}
	}

	// Add beacon module config
	if c.bsService != nil {
		bsConfig := c.bsService.FrontendModuleConfig()
		if bsConfig != nil {
			beaconNetworks := make(map[string]*config.BeaconNetworkConfig)
			for name, netCfg := range bsConfig.Networks {
				beaconNetworks[name] = &config.BeaconNetworkConfig{
					HeadLagSlots: netCfg.HeadLagSlots,
					BacklogDays:  netCfg.BacklogDays,
				}
			}

			modulesConfig.Beacon = &config.BeaconModule{
				Enabled:     bsConfig.Enabled,
				Description: bsConfig.Description,
				PathPrefix:  bsConfig.PathPrefix,
				Networks:    beaconNetworks,
			}
		}
	}

	return &config.GetConfigResponse{
		Config: &config.FrontendConfig{
			Ethereum: &config.EthereumConfig{
				Networks: networksConfig,
			},
			Modules: modulesConfig,
		},
	}, nil
}
