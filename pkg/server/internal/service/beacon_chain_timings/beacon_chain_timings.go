package beacon_chain_timings

import (
	"context"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/sirupsen/logrus"
)

const (
	BeaconChainTimingsServiceName = "beacon_chain_timings"
)

type BeaconChainTimings struct {
	log           logrus.FieldLogger
	xatuClient    *xatu.Client
	storageClient storage.Client
	lockerClient  locker.Locker

	leaderClient leader.Client
}

func New(
	log logrus.FieldLogger,
	xatuClient *xatu.Client,
	storageClient storage.Client,
	lockerClient locker.Locker,
) *BeaconChainTimings {
	return &BeaconChainTimings{
		log:           log.WithField("component", "service/beacon_chain_timings"),
		xatuClient:    xatuClient,
		storageClient: storageClient,
		lockerClient:  lockerClient,
	}
}

func (b *BeaconChainTimings) Start(ctx context.Context) error {
	b.log.Info("Starting BeaconChainTimings service")

	leader := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        BeaconChainTimingsServiceName + "/batch_processing",
		TTL:             15 * time.Second,
		RefreshInterval: 5 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader")
		},
		OnRevoked: func() {
			b.log.Info("Lost leadership")
		},
	})

	leader.Start()

	b.leaderClient = leader

	return nil
}

func (b *BeaconChainTimings) Name() string {
	return BeaconChainTimingsServiceName
}
