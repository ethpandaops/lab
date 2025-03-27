package beacon_chain_timings

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/sirupsen/logrus"
)

const (
	BeaconChainTimingsServiceName = "beacon_chain_timings"
)

func GetStoragePath(key string) string {
	return fmt.Sprintf("%s/%s", BeaconChainTimingsServiceName, key)
}

type BeaconChainTimings struct {
	log logrus.FieldLogger

	config *Config

	ethereumConfig *ethereum.Config
	xatuClient     *xatu.Client
	storageClient  storage.Client
	cacheClient    cache.Client
	lockerClient   locker.Locker

	leaderClient leader.Client

	processCtx       context.Context
	processCtxCancel context.CancelFunc
}

func New(
	log logrus.FieldLogger,
	config *Config,
	xatuClient *xatu.Client,
	ethereumConfig *ethereum.Config,
	storageClient storage.Client,
	cacheClient cache.Client,
	lockerClient locker.Locker,
) (*BeaconChainTimings, error) {
	return &BeaconChainTimings{
		log:            log.WithField("component", "service/beacon_chain_timings"),
		config:         config,
		ethereumConfig: ethereumConfig,
		xatuClient:     xatuClient,
		storageClient:  storageClient,
		cacheClient:    cacheClient,
		lockerClient:   lockerClient,

		processCtx:       nil,
		processCtxCancel: nil,
	}, nil
}

func (b *BeaconChainTimings) Start(ctx context.Context) error {
	b.log.Info("Starting BeaconChainTimings service")

	leader := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        BeaconChainTimingsServiceName + "/batch_processing",
		TTL:             15 * time.Minute,
		RefreshInterval: 5 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader")

			if b.processCtx != nil {
				// We are already processing, so we don't need to start a new one
				b.log.Info("Already processing, skipping")

				return
			}

			// Create a new context for the process
			ctx, cancel := context.WithCancel(context.Background())

			b.processCtx = ctx
			b.processCtxCancel = cancel

			go b.processLoop()
		},
		OnRevoked: func() {
			b.log.Info("Lost leadership")
			b.processCtxCancel()
		},
	})

	leader.Start()

	b.leaderClient = leader

	return nil
}

func (b *BeaconChainTimings) Stop() {
	b.leaderClient.Stop()
}

func (b *BeaconChainTimings) processLoop() {
	for {
		select {
		case <-b.processCtx.Done():
			b.log.Info("Context cancelled, stopping BeaconChainTimings")

			return
		case <-time.After(5 * time.Second):
			if b.leaderClient.IsLeader() {
				b.process()
			}
		}
	}

}

func (b *BeaconChainTimings) Name() string {
	return BeaconChainTimingsServiceName
}

func (b *BeaconChainTimings) process() {
	// Fetch the latest state from storage
	state := &State{}

	err := b.storageClient.GetEncoded(GetStoragePath(GetStateKey()), state, storage.CodecNameJSON)
	if err != nil {
		b.log.Errorf("failed to get state: %v", err)

		return
	}

	for _, network := range b.ethereumConfig.Networks {
		if _, ok := state.BlockTimings.LastProcessed[network.Name]; !ok {
			state.BlockTimings.LastProcessed[network.Name] = time.Time{}
		}

		lastProcessed := state.BlockTimings.LastProcessed[network.Name]

		if lastProcessed.IsZero() {
			b.log.Infof("No last processed block for network: %s", network.Name)

			continue
		}

	}
}

func (b *BeaconChainTimings) processBlockTimings(network *ethereum.Network) error {
}
