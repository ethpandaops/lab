package grpc

import (
	"context"

	"google.golang.org/grpc"
)

// Service represents a gRPC service
type Service interface {
	Start(ctx context.Context, server *grpc.Server) error
	Name() string
}

var _ Service = &Lab{}
var _ Service = &BeaconChainTimings{}
var _ Service = &XatuPublicContributors{}
