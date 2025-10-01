package grpc

import (
	"context"
	"fmt"

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
	bsService            *beacon_slots.BeaconSlots
	experimentsService   *experiments.ExperimentsService
}

// NewConfigService creates a new ConfigService
func NewConfigService(
	log logrus.FieldLogger,
	xatuCBTSvc *xatu_cbt.XatuCBT,
	cartographoorService *cartographoor.Service,
	_ interface{}, // placeholder for removed bctService
	bsService *beacon_slots.BeaconSlots,
	experimentsService *experiments.ExperimentsService,
) *ConfigService {
	return &ConfigService{
		log:                  log.WithField("grpc", "config"),
		xatuCBTService:       xatuCBTSvc,
		cartographoorService: cartographoorService,
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

			// Add fork information if available
			if network.Forks != nil && network.Forks.Consensus != nil {
				consensusForks := &config.ConsensusForks{}
				hasForks := false

				// Add Electra fork if present
				if network.Forks.Consensus.Electra != nil {
					consensusForks.Electra = &config.ForkInfo{
						Epoch:             network.Forks.Consensus.Electra.Epoch,
						MinClientVersions: network.Forks.Consensus.Electra.MinClientVersions,
					}
					hasForks = true
				}

				// Add Fusaka fork if present
				if network.Forks.Consensus.Fusaka != nil {
					consensusForks.Fusaka = &config.ForkInfo{
						Epoch:             network.Forks.Consensus.Fusaka.Epoch,
						MinClientVersions: network.Forks.Consensus.Fusaka.MinClientVersions,
					}
					hasForks = true
				}

				if hasForks {
					netConfig.Forks = &config.ForkConfig{
						Consensus: consensusForks,
					}
				}
			}

			networksConfig[network.Name] = netConfig
		}
	}

	// Add experiments configuration
	var experimentConfigs []*config.ExperimentConfig
	if c.experimentsService != nil {
		experimentConfigs = c.experimentsService.GetAllExperimentsConfig(ctx, false)
	}

	return &config.GetConfigResponse{
		Config: &config.FrontendConfig{
			Ethereum: &config.EthereumConfig{
				Networks: networksConfig,
			},
			Experiments: experimentConfigs,
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

// GetNetworkExperimentConfig returns a single experiment's configuration with data availability for a specific network
func (c *ConfigService) GetNetworkExperimentConfig(ctx context.Context, req *config.GetNetworkExperimentConfigRequest) (*config.GetExperimentConfigResponse, error) {
	c.log.WithFields(logrus.Fields{
		"experiment_id": req.ExperimentId,
		"network":       req.Network,
	}).Debug("GetNetworkExperimentConfig called")

	// Validate request parameters
	if req.ExperimentId == "" {
		return nil, fmt.Errorf("experiment_id is required")
	}

	if req.Network == "" {
		return nil, fmt.Errorf("network is required")
	}

	if c.experimentsService == nil {
		return nil, fmt.Errorf("experiments service not available")
	}

	// Get experiment config with data availability for specific network
	experimentConfig, err := c.experimentsService.GetNetworkExperimentConfig(ctx, req.ExperimentId, req.Network)
	if err != nil {
		c.log.WithError(err).
			WithFields(logrus.Fields{
				"experiment_id": req.ExperimentId,
				"network":       req.Network,
			}).
			Error("Failed to get network experiment config")

		return nil, fmt.Errorf("failed to get network experiment config: %w", err)
	}

	// Remove the Networks field for network-specific response
	// This is done by not setting it in the response, which effectively removes it from the JSON output
	// as protobuf omits zero/nil values in JSON marshaling
	experimentConfig.Networks = nil

	return &config.GetExperimentConfigResponse{
		Experiment: experimentConfig,
	}, nil
}
