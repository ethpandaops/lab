package lab

import (
	"context"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/server/internal/service/beacon_chain_timings"
	"github.com/ethpandaops/lab/pkg/server/internal/service/beacon_slots"
	"github.com/ethpandaops/lab/pkg/server/internal/service/xatu_public_contributors"
	pb "github.com/ethpandaops/lab/pkg/server/proto/lab"
	"github.com/sirupsen/logrus"
)

// Service name constant
const ServiceName = "lab"

type Lab struct {
	log logrus.FieldLogger

	ethereum *ethereum.Client

	bctService *beacon_chain_timings.BeaconChainTimings
	xpcService *xatu_public_contributors.XatuPublicContributors
	bsService  *beacon_slots.BeaconSlots
}

func New(
	log logrus.FieldLogger,
	ethereum *ethereum.Client,
	cacheClient cache.Client,
	bctService *beacon_chain_timings.BeaconChainTimings,
	xpcService *xatu_public_contributors.XatuPublicContributors,
	bsService *beacon_slots.BeaconSlots,
) (*Lab, error) {
	return &Lab{
		log:        log.WithField("component", "service/"+ServiceName),
		ethereum:   ethereum,
		bctService: bctService,
		xpcService: xpcService,
		bsService:  bsService,
	}, nil
}

func (l *Lab) Name() string {
	return ServiceName
}

func (l *Lab) Start(ctx context.Context) error {

	return nil
}

func (l *Lab) Stop() {
	l.log.Info("Stopping Lab service")
}

func (l *Lab) GetFrontendConfig() (*pb.FrontendConfig, error) {
	networksConfig := make(map[string]*pb.FrontendConfig_Network)
	networks := []string{}

	for _, network := range l.ethereum.Networks() {
		networksConfig[network.Name] = &pb.FrontendConfig_Network{
			GenesisTime: network.Config.Genesis.UTC().Unix(),
			Forks:       &pb.FrontendConfig_ForkConfig{}, // TODO(sam.calder-mason): Add forks
		}

		networks = append(networks, network.Name)
	}

	config := &pb.FrontendConfig{
		Config: &pb.FrontendConfig_Config{
			Ethereum: &pb.FrontendConfig_EthereumConfig{
				Networks: networksConfig,
			},
			Modules: &pb.FrontendConfig_Modules{
				BeaconChainTimings:     l.bctService.FrontendModuleConfig(),
				XatuPublicContributors: l.xpcService.FrontendModuleConfig(),
				Beacon:                 l.bsService.FrontendModuleConfig(),
			},
		},
	}

	return config, nil
}
