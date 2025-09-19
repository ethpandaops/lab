package grpc

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_chain_timings"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_slots"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/experiments"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	"github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// ConfigService provides gRPC API for frontend configuration
type ConfigService struct {
	config.UnimplementedConfigServiceServer
	log                  logrus.FieldLogger
	xatuCBTService       *xatu_cbt.XatuCBT
	cartographoorService *cartographoor.Service
	bctService           *beacon_chain_timings.BeaconChainTimings
	bsService            *beacon_slots.BeaconSlots
	experimentsService   *experiments.ExperimentsService
}

// NewConfigService creates a new ConfigService
func NewConfigService(
	log logrus.FieldLogger,
	xatuCBTSvc *xatu_cbt.XatuCBT,
	cartographoorService *cartographoor.Service,
	bctService *beacon_chain_timings.BeaconChainTimings,
	bsService *beacon_slots.BeaconSlots,
	experimentsService *experiments.ExperimentsService,
) *ConfigService {
	return &ConfigService{
		log:                  log.WithField("grpc", "config"),
		xatuCBTService:       xatuCBTSvc,
		cartographoorService: cartographoorService,
		bctService:           bctService,
		bsService:            bsService,
		experimentsService:   experimentsService,
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
			// Only include networks that are enabled in xatu_cbt config
			if c.xatuCBTService == nil || !c.xatuCBTService.IsNetworkEnabled(network.Name) {
				continue
			}

			netConfig := &config.NetworkConfig{
				Name:        network.Name,
				Status:      network.Status,
				ChainId:     network.ChainId,
				Description: network.Description,
				LastUpdated: network.LastUpdated,
			}

			// Add genesis time - prefer xatu_cbt config override
			if c.xatuCBTService != nil {
				if overrideTime := c.xatuCBTService.GetNetworkGenesisTime(network.Name); overrideTime != nil {
					netConfig.GenesisTime = *overrideTime
				} else if network.GenesisConfig != nil {
					netConfig.GenesisTime = network.GenesisConfig.GenesisTime
				}
			} else if network.GenesisConfig != nil {
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

	// Add experiments configuration
	var experimentsConfig *config.ExperimentsConfig
	if c.experimentsService != nil {
		experimentsConfig = c.experimentsService.GetAllExperimentsConfig(ctx, false)
	}

	return &config.GetConfigResponse{
		Config: &config.FrontendConfig{
			Ethereum: &config.EthereumConfig{
				Networks: networksConfig,
			},
			Modules:     modulesConfig,
			Experiments: experimentsConfig,
		},
	}, nil
}

// GetExperimentConfig returns a single experiment's configuration with data availability
func (c *ConfigService) GetExperimentConfig(ctx context.Context, req *config.GetExperimentConfigRequest) (*config.GetExperimentConfigResponse, error) {
	c.log.WithField("experiment_id", req.ExperimentId).Debug("GetExperimentConfig called")

	if c.experimentsService == nil {
		return nil, fmt.Errorf("experiments service not available")
	}

	// Get experiment config with data availability
	experimentConfig, err := c.experimentsService.GetExperimentConfig(ctx, req.ExperimentId)
	if err != nil {
		c.log.WithError(err).
			WithField("experiment_id", req.ExperimentId).
			Error("Failed to get experiment config")

		return nil, fmt.Errorf("failed to get experiment config: %w", err)
	}

	return &config.GetExperimentConfigResponse{
		Experiment: experimentConfig,
	}, nil
}
