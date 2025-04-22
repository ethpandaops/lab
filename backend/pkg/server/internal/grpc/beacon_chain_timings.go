package grpc

import (
	"context"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_chain_timings"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_chain_timings"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// Service implements the Beacon Chain Timings gRPC service
type BeaconChainTimings struct {
	pb.UnimplementedBeaconChainTimingsServiceServer
	log     logrus.FieldLogger
	service *beacon_chain_timings.BeaconChainTimings
}

// NewBeaconChainTimings creates a new BeaconChainTimings implementation
func NewBeaconChainTimings(
	log logrus.FieldLogger,
	ss *beacon_chain_timings.BeaconChainTimings,
) *BeaconChainTimings {
	return &BeaconChainTimings{
		log:     log.WithField("component", "grpc/beacon_chain_timings"),
		service: ss,
	}
}

// Name returns the name of the service
func (b *BeaconChainTimings) Name() string {
	return "beacon_chain_timings"
}

func (b *BeaconChainTimings) Start(ctx context.Context, grpcServer *grpc.Server) error {
	pb.RegisterBeaconChainTimingsServiceServer(grpcServer, b)

	b.log.Info("BeaconChainTimings GRPC service started")

	return nil
}
