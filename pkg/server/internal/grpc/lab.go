package grpc

import (
	"context"

	"github.com/ethpandaops/lab/pkg/server/internal/service/lab"
	pb "github.com/ethpandaops/lab/pkg/server/proto/lab"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Lab struct {
	pb.UnimplementedLabServiceServer
	log logrus.FieldLogger

	labService *lab.Lab
}

// NewLab creates a new Lab implementation
func NewLab(log logrus.FieldLogger,
	labService *lab.Lab,
) *Lab {
	return &Lab{
		log:        log.WithField("component", "grpc/lab"),
		labService: labService,
	}
}

// Name returns the name of the service
func (l *Lab) Name() string {
	return "lab"
}

func (l *Lab) Start(ctx context.Context, grpcServer *grpc.Server) error {
	pb.RegisterLabServiceServer(grpcServer, l)

	l.log.Info("Lab GRPC service started")

	return nil
}

// GetFrontendConfig implements the GetFrontendConfig RPC
func (l *Lab) GetFrontendConfig(ctx context.Context, req *pb.GetFrontendConfigRequest) (*pb.GetFrontendConfigResponse, error) {
	cfg, err := l.labService.GetFrontendConfig()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get frontend config: %v", err)
	}

	return &pb.GetFrontendConfigResponse{Config: cfg}, nil
}
