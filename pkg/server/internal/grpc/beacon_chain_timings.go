package grpc

import (
	"context"

	"github.com/ethpandaops/lab/pkg/server/internal/service/beacon_chain_timings"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_chain_timings"
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

// GetTimingData gets timing data for a specific network and time window
func (b *BeaconChainTimings) GetTimingData(ctx context.Context, req *pb.GetTimingDataRequest) (*pb.GetTimingDataResponse, error) {
	b.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"window":     req.WindowName,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetTimingData request received")

	// TODO: Implement fetching data from storage
	return &pb.GetTimingDataResponse{
		Data: []*pb.TimingData{},
	}, nil
}

// GetSizeCDFData gets size CDF data for a specific network
func (b *BeaconChainTimings) GetSizeCDFData(ctx context.Context, req *pb.GetSizeCDFDataRequest) (*pb.GetSizeCDFDataResponse, error) {
	b.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetSizeCDFData request received")

	// TODO: Implement fetching data from storage
	return &pb.GetSizeCDFDataResponse{
		Data: []*pb.SizeCDFData{},
	}, nil
}
