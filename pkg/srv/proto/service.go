package proto

import (
	"context"

	"github.com/ethpandaops/lab/pkg/srv/proto/beacon_chain_timings"
	"github.com/ethpandaops/lab/pkg/srv/proto/lab"
	"google.golang.org/grpc"
)

type Service interface {
	Start(ctx context.Context, server *grpc.Server) error
	Name() string
}

var _ Service = &lab.Service{}
var _ Service = &beacon_chain_timings.Service{}
