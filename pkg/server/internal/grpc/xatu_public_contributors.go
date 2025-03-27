package grpc

import (
	"context"

	"github.com/ethpandaops/lab/pkg/server/internal/service"
	pb "github.com/ethpandaops/lab/pkg/server/proto/xatu_public_contributors"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// Service implements the Xatu Public Contributors gRPC service
type XatuPublicContributors struct {
	pb.UnimplementedXatuPublicContributorsServiceServer
	log     logrus.FieldLogger
	service *service.XatuPublicContributors
}

// NewXatuPublicContributors creates a new XatuPublicContributors implementation
func NewXatuPublicContributors(
	log logrus.FieldLogger,
	ss *service.XatuPublicContributors,
) *XatuPublicContributors {
	return &XatuPublicContributors{
		log:     log.WithField("component", "grpc/xatu_public_contributors"),
		service: ss,
	}
}

// Name returns the name of the service
func (x *XatuPublicContributors) Name() string {
	return "xatu_public_contributors"
}

func (x *XatuPublicContributors) Start(ctx context.Context, grpcServer *grpc.Server) error {
	pb.RegisterXatuPublicContributorsServiceServer(grpcServer, x)

	x.log.Info("XatuPublicContributors GRPC service started")

	return nil
}

// GetSummary gets summary data for networks
func (x *XatuPublicContributors) GetSummary(ctx context.Context, req *pb.GetSummaryRequest) (*pb.GetSummaryResponse, error) {
	x.log.WithFields(logrus.Fields{
		"network": req.Network,
	}).Debug("GetSummary request received")

	// TODO: Implement fetching data from storage
	return &pb.GetSummaryResponse{
		Data: &pb.SummaryData{},
	}, nil
}

// GetCountriesData gets countries data for a specific network and time window
func (x *XatuPublicContributors) GetCountriesData(ctx context.Context, req *pb.GetCountriesDataRequest) (*pb.GetCountriesDataResponse, error) {
	x.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"window":     req.WindowName,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetCountriesData request received")

	// TODO: Implement fetching data from storage
	return &pb.GetCountriesDataResponse{
		Data: []*pb.CountriesTimePoint{},
	}, nil
}

// GetUsersData gets users data for a specific network and time window
func (x *XatuPublicContributors) GetUsersData(ctx context.Context, req *pb.GetUsersDataRequest) (*pb.GetUsersDataResponse, error) {
	x.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"window":     req.WindowName,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetUsersData request received")

	// TODO: Implement fetching data from storage
	return &pb.GetUsersDataResponse{
		Data: []*pb.UsersTimePoint{},
	}, nil
}

// GetUserSummary gets user summary data for a specific user
func (x *XatuPublicContributors) GetUserSummary(ctx context.Context, req *pb.GetUserSummaryRequest) (*pb.GetUserSummaryResponse, error) {
	x.log.WithFields(logrus.Fields{
		"user": req.User,
	}).Debug("GetUserSummary request received")

	// TODO: Implement fetching data from storage
	return &pb.GetUserSummaryResponse{
		Data: &pb.UserSummary{},
	}, nil
}
