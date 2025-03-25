package lab

import (
	"context"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Service implements the LabService gRPC service
type Service struct {
	UnimplementedLabServiceServer
	log            *logrus.Entry
	lab            *lab.Lab
	frontendConfig *FrontendConfig
}

// NewLab creates a new Lab implementation
func NewService(lab *lab.Lab) *Service {
	return &Service{
		log: lab.Log().WithField("component", "grpc/lab"),
		lab: lab,
	}
}

// Name returns the name of the service
func (s *Service) Name() string {
	return "lab"
}

func (s *Service) Start(ctx context.Context, grpcServer *grpc.Server) error {
	// Generate the frontend config directly in this service
	// s.frontendConfig = s.lab.AsFrontendConfig()

	RegisterLabServiceServer(grpcServer, s)

	s.log.Info("Lab GRPC service started")

	return nil
}

// GetFrontendConfig implements the GetFrontendConfig RPC
func (s *Service) GetFrontendConfig(ctx context.Context, req *GetFrontendConfigRequest) (*GetFrontendConfigResponse, error) {
	if s.frontendConfig == nil {
		return nil, status.Errorf(codes.Unavailable, "frontend config not available")
	}

	s.log.Debug("GetFrontendConfig request received")

	return &GetFrontendConfigResponse{
		Config: s.frontendConfig,
	}, nil
}
