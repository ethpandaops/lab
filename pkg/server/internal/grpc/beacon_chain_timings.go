package grpc

import (
	"time"

	"context"
	"strings"

	"github.com/ethpandaops/lab/pkg/server/internal/service/beacon_chain_timings"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

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

// containsIgnoreCase returns true if substr is in s, case-insensitive
func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// GetTimingData gets timing data for a specific network and time window
func (b *BeaconChainTimings) GetTimingData(ctx context.Context, req *pb.GetTimingDataRequest) (*pb.GetTimingDataResponse, error) {
	b.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"window":     req.WindowName,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetTimingData request received")

	timeWindow, err := b.service.GetTimeWindowConfig(req.WindowName)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	startTime := req.StartTime.AsTime()
	endTime := req.EndTime.AsTime()

	data, err := b.service.GetTimingData(req.Network, struct{ Start, End time.Time }{Start: startTime, End: endTime}, timeWindow)
	if err != nil {
		if err.Error() == "not found" {
			return nil, status.Error(codes.NotFound, err.Error())
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.GetTimingDataResponse{
		Data: []*pb.TimingData{data},
	}, nil
}

// GetSizeCDFData gets size CDF data for a specific network
func (b *BeaconChainTimings) GetSizeCDFData(ctx context.Context, req *pb.GetSizeCDFDataRequest) (*pb.GetSizeCDFDataResponse, error) {
	b.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetSizeCDFData request received")

	startTime := req.StartTime.AsTime()
	endTime := req.EndTime.AsTime()

	internalData, err := b.service.GetSizeCDFData(req.Network, struct{ Start, End time.Time }{Start: startTime, End: endTime})
	if err != nil {
		if err.Error() == "not found" {
			return nil, status.Error(codes.NotFound, err.Error())
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	converted := &pb.SizeCDFData{
		Network:        internalData.Network,
		Timestamp:      internalData.Timestamp,
		SizesKb:        internalData.SizesKb,
		Mev:            internalData.Mev,
		NonMev:         internalData.NonMev,
		SoloMev:        internalData.SoloMev,
		SoloNonMev:     internalData.SoloNonMev,
		All:            internalData.All,
		ArrivalTimesMs: map[string]*pb.SizeCDFData_DoubleList{},
	}

	for k, v := range internalData.ArrivalTimesMs {
		converted.ArrivalTimesMs[k] = &pb.SizeCDFData_DoubleList{Values: v.Values}
	}

	return &pb.GetSizeCDFDataResponse{
		Data: []*pb.SizeCDFData{converted},
	}, nil
}
