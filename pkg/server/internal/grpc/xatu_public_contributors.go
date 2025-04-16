package grpc

import (
	"context"

	// Needed for error checking

	xpc "github.com/ethpandaops/lab/pkg/server/internal/service/xatu_public_contributors"

	pb "github.com/ethpandaops/lab/pkg/server/proto/xatu_public_contributors"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// Service implements the Xatu Public Contributors gRPC service
type XatuPublicContributors struct {
	pb.UnimplementedXatuPublicContributorsServiceServer
	log     logrus.FieldLogger
	service *xpc.XatuPublicContributors
}

// NewXatuPublicContributors creates a new XatuPublicContributors implementation
func NewXatuPublicContributors(
	log logrus.FieldLogger,
	svc *xpc.XatuPublicContributors,
) *XatuPublicContributors {
	return &XatuPublicContributors{
		log:     log.WithField("component", "grpc/xatu_public_contributors"),
		service: svc,
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
