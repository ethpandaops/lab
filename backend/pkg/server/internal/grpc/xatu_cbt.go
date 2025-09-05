package grpc

import (
	"context"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// XatuCBT implements the Xatu CBT gRPC service.
type XatuCBT struct {
	pb.UnimplementedXatuCBTServer
	log     logrus.FieldLogger
	service *xatu_cbt.XatuCBT
}

// NewXatuCBT creates a new XatuCBT implementation.
func NewXatuCBT(
	log logrus.FieldLogger,
	svc *xatu_cbt.XatuCBT,
) *XatuCBT {
	return &XatuCBT{
		log:     log.WithField("component", "grpc/xatu_cbt"),
		service: svc,
	}
}

// Name returns the name of the service.
func (x *XatuCBT) Name() string {
	return "xatu_cbt"
}

// Start registers the service with the gRPC server.
func (x *XatuCBT) Start(ctx context.Context, grpcServer *grpc.Server) error {
	pb.RegisterXatuCBTServer(grpcServer, x)

	x.log.Info("XatuCBT gRPC service started")

	return nil
}

// ListIntXatuNodes24H returns the list of xatu nodes in the last 24h.
func (x *XatuCBT) ListIntXatuNodes24H(
	ctx context.Context,
	req *cbtproto.ListIntXatuNodes24HRequest,
) (*cbtproto.ListIntXatuNodes24HResponse, error) {
	return x.service.ListIntXatuNodes24H(ctx, req)
}
