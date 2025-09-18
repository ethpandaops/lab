package grpc

import (
	"context"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// XatuCBT implements the Xatu CBT gRPC service.
type XatuCBT struct {
	pb.UnimplementedXatuCBTServer
	log            logrus.FieldLogger
	service        *xatu_cbt.XatuCBT
	ethereumClient *ethereum.Client
}

// NewXatuCBT creates a new XatuCBT implementation.
func NewXatuCBT(
	log logrus.FieldLogger,
	svc *xatu_cbt.XatuCBT,
	ethereumClient *ethereum.Client,
) *XatuCBT {
	return &XatuCBT{
		log:            log.WithField("component", "grpc/xatu_cbt"),
		service:        svc,
		ethereumClient: ethereumClient,
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

// ListFctNodeActiveLast24H returns the list of active nodes in the last 24h.
func (x *XatuCBT) ListFctNodeActiveLast24H(
	ctx context.Context,
	req *cbtproto.ListFctNodeActiveLast24HRequest,
) (*cbtproto.ListFctNodeActiveLast24HResponse, error) {
	return x.service.ListFctNodeActiveLast24h(ctx, req)
}

// ListFctBlockFirstSeenByNode returns block timing data from the fct_block_first_seen_by_node table.
func (x *XatuCBT) ListFctBlockFirstSeenByNode(
	ctx context.Context,
	req *cbtproto.ListFctBlockFirstSeenByNodeRequest,
) (*cbtproto.ListFctBlockFirstSeenByNodeResponse, error) {
	// Calculate SlotStartDateTime if not already set, more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctBlockFirstSeenByNode(ctx, req)
}

// calculateSlotStartDateTime calculates the SlotStartDateTime filter for a given slot filter.
// This enables efficient queries using the primary key in ClickHouse.
// Returns a filter that can be used by any CBT method that needs slot-based filtering.
func (x *XatuCBT) calculateSlotStartDateTime(
	ctx context.Context,
	slotFilter *cbtproto.UInt32Filter,
) *cbtproto.UInt32Filter {
	// Default fallback filter
	fallback := &cbtproto.UInt32Filter{
		Filter: &cbtproto.UInt32Filter_Gte{Gte: 0},
	}

	if slotFilter == nil {
		return fallback
	}

	// Extract network from metadata
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		x.log.Debug("No metadata in context, using fallback slot start time filter")

		return fallback
	}

	networks := md.Get("network")
	if len(networks) == 0 || x.ethereumClient == nil {
		x.log.Debug("No network in metadata or ethereum client unavailable, using fallback")

		return fallback
	}

	var (
		network    = networks[0]
		slotNumber uint64
	)

	// Get the slot number from the filter
	switch filter := slotFilter.Filter.(type) {
	case *cbtproto.UInt32Filter_Eq:
		slotNumber = uint64(filter.Eq)
	case *cbtproto.UInt32Filter_Gte:
		slotNumber = uint64(filter.Gte)
	case *cbtproto.UInt32Filter_Lte:
		slotNumber = uint64(filter.Lte)
	case *cbtproto.UInt32Filter_Gt:
		slotNumber = uint64(filter.Gt)
	case *cbtproto.UInt32Filter_Lt:
		slotNumber = uint64(filter.Lt)
	}

	if slotNumber == 0 {
		x.log.Debug("No slot number found in filter, using fallback")

		return fallback
	}

	// Try to get the network and calculate slot start time
	networkObj := x.ethereumClient.GetNetwork(network)
	if networkObj == nil {
		x.log.WithField("network", network).Debug("Network not found, using fallback")

		return fallback
	}

	wallclock := networkObj.GetWallclock()
	if wallclock == nil {
		x.log.WithField("network", network).Debug("Wallclock not available, using fallback")

		return fallback
	}

	// Calculate slot start time using wallclock
	var (
		slot              = wallclock.Slots().FromNumber(slotNumber)
		startTime         = slot.TimeWindow().Start()
		slotStartTimeUnix = startTime.Unix()
		slotStartTime     = uint32(slotStartTimeUnix) //nolint:gosec // safe for slot times.
	)

	x.log.WithFields(logrus.Fields{
		"network":       network,
		"slot":          slotNumber,
		"slotStartTime": slotStartTime,
	}).Debug("Calculated slot start time for efficient query")

	return &cbtproto.UInt32Filter{
		Filter: &cbtproto.UInt32Filter_Eq{Eq: slotStartTime},
	}
}
