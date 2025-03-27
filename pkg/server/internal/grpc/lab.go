package grpc

import (
	"context"

	pb "github.com/ethpandaops/lab/pkg/server/proto/lab"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Service implements the LabService gRPC service
type Lab struct {
	pb.UnimplementedLabServiceServer
	log            logrus.FieldLogger
	frontendConfig *pb.FrontendConfig
}

// NewLab creates a new Lab implementation
func NewLab(log logrus.FieldLogger) *Lab {
	return &Lab{
		log: log.WithField("component", "grpc/lab"),
	}
}

// Name returns the name of the service
func (l *Lab) Name() string {
	return "lab"
}

func (l *Lab) Start(ctx context.Context, grpcServer *grpc.Server) error {
	// Generate the frontend config directly in this service
	// s.frontendConfig = s.lab.AsFrontendConfig()

	pb.RegisterLabServiceServer(grpcServer, l)

	l.log.Info("Lab GRPC service started")

	return nil
}

// GetFrontendConfig implements the GetFrontendConfig RPC
func (l *Lab) GetFrontendConfig(ctx context.Context, req *pb.GetFrontendConfigRequest) (*pb.GetFrontendConfigResponse, error) {
	if l.frontendConfig == nil {
		return nil, status.Errorf(codes.Unavailable, "frontend config not available")
	}

	l.log.Debug("GetFrontendConfig request received")

	return &pb.GetFrontendConfigResponse{
		Config: l.frontendConfig,
	}, nil
}
