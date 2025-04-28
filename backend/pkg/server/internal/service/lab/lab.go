package lab

import (
	"context"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_chain_timings"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_slots"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_public_contributors"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/lab"
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

	metrics          *metrics.Metrics
	metricsCollector *metrics.Collector
}

func New(
	log logrus.FieldLogger,
	eth *ethereum.Client,
	cacheClient cache.Client,
	bctService *beacon_chain_timings.BeaconChainTimings,
	xpcService *xatu_public_contributors.XatuPublicContributors,
	bsService *beacon_slots.BeaconSlots,
	metricsSvc *metrics.Metrics,
) (*Lab, error) {
	var metricsCollector *metrics.Collector
	if metricsSvc != nil {
		metricsCollector = metricsSvc.NewCollector("api")

		log.WithField("component", "service/"+ServiceName).Debug("Created metrics collector for lab service")
	}

	return &Lab{
		log:              log.WithField("component", "service/"+ServiceName),
		ethereum:         eth,
		bctService:       bctService,
		xpcService:       xpcService,
		bsService:        bsService,
		metrics:          metricsSvc,
		metricsCollector: metricsCollector,
	}, nil
}

func (l *Lab) Name() string {
	return ServiceName
}

func (l *Lab) Start(ctx context.Context) error {
	// Initialize metrics
	l.initializeMetrics()

	return nil
}

// initializeMetrics initializes all metrics for the lab service
func (l *Lab) initializeMetrics() {
	if l.metricsCollector == nil {
		return
	}

	// API requests counter
	_, err := l.metricsCollector.NewCounterVec(
		"requests_total",
		"Total number of API requests",
		[]string{"method", "status_code"},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create requests_total metric")
	}

	// API request duration histogram
	_, err = l.metricsCollector.NewHistogramVec(
		"request_duration_seconds",
		"Duration of API requests in seconds",
		[]string{"method"},
		nil, // Use default buckets
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create request_duration_seconds metric")
	}
}

func (l *Lab) Stop() {
	l.log.Info("Stopping Lab service")
}

func (l *Lab) GetFrontendConfig() (*pb.FrontendConfig, error) {
	startTime := time.Now()

	var err error

	statusCode := "success"

	// Record metrics when the function completes
	defer func() {
		if l.metricsCollector != nil {
			// Record request count
			counter, metricErr := l.metricsCollector.NewCounterVec(
				"requests_total",
				"Total number of API requests",
				[]string{"method", "status_code"},
			)
			if metricErr == nil {
				counter.WithLabelValues("GetFrontendConfig", statusCode).Inc()
			}

			// Record request duration
			histogram, metricErr := l.metricsCollector.NewHistogramVec(
				"request_duration_seconds",
				"Duration of API requests in seconds",
				[]string{"method"},
				nil, // Use default buckets
			)
			if metricErr == nil {
				histogram.WithLabelValues("GetFrontendConfig").Observe(time.Since(startTime).Seconds())
			}
		}
	}()

	networksConfig := make(map[string]*pb.FrontendConfig_Network)

	for _, network := range l.ethereum.Networks() {
		consensusConfig := &pb.FrontendConfig_ConsensusConfig{}

		electraConfig := &pb.FrontendConfig_ForkDetails{
			Epoch: int64(int(network.Spec.ElectraForkEpoch)),
		}

		if electraConfig.Epoch != 0 {
			clientVersions, ok := network.Config.Forks.Consensus["electra"]
			if ok {
				electraConfig.MinClientVersions = clientVersions.MinClientVersions
			}
		}

		consensusConfig.Electra = electraConfig

		networksConfig[network.Name] = &pb.FrontendConfig_Network{
			GenesisTime: network.Config.Genesis.UTC().Unix(),
			Forks: &pb.FrontendConfig_ForkConfig{
				Consensus: consensusConfig,
			},
		}
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

	if err != nil {
		statusCode = "error"
	}

	return config, nil
}
