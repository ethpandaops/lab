package grpc

import (
	"context"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/wallclock"
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
	log              logrus.FieldLogger
	service          *xatu_cbt.XatuCBT
	wallclockService *wallclock.Service
}

// NewXatuCBT creates a new XatuCBT implementation.
func NewXatuCBT(
	log logrus.FieldLogger,
	svc *xatu_cbt.XatuCBT,
	wallclockSvc *wallclock.Service,
) *XatuCBT {
	return &XatuCBT{
		log:              log.WithField("component", "grpc/xatu_cbt"),
		service:          svc,
		wallclockService: wallclockSvc,
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

// ListFctPreparedBlock returns prepared blocks for a specific slot.
func (x *XatuCBT) ListFctPreparedBlock(
	ctx context.Context,
	req *cbtproto.ListFctPreparedBlockRequest,
) (*cbtproto.ListFctPreparedBlockResponse, error) {
	// Calculate SlotStartDateTime if not already set, more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	x.log.WithFields(logrus.Fields{
		"slot":            req.Slot,
		"slot_start_time": req.SlotStartDateTime,
	}).Debug("ListFctPreparedBlock request")

	return x.service.ListFctPreparedBlock(ctx, req)
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
	if len(networks) == 0 || x.wallclockService == nil {
		x.log.Debug("No network in metadata or wallclock service unavailable, using fallback")

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

	// Try to get wallclock for the network and calculate slot start time
	wc := x.wallclockService.GetWallclock(network)
	if wc == nil {
		x.log.WithField("network", network).Debug("Wallclock not available, using fallback")

		return fallback
	}

	// Calculate slot start time using wallclock
	var (
		slot              = wc.Slots().FromNumber(slotNumber)
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

// ListFctAttestationFirstSeenChunked50Ms returns attestation timing data in 50ms chunks.
func (x *XatuCBT) ListFctAttestationFirstSeenChunked50Ms(
	ctx context.Context,
	req *cbtproto.ListFctAttestationFirstSeenChunked50MsRequest,
) (*cbtproto.ListFctAttestationFirstSeenChunked50MsResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctAttestationFirstSeenChunked50ms(ctx, req)
}

// ListFctAttestationCorrectnessHead returns attestation correctness data for the head chain.
func (x *XatuCBT) ListFctAttestationCorrectnessHead(
	ctx context.Context,
	req *cbtproto.ListFctAttestationCorrectnessHeadRequest,
) (*cbtproto.ListFctAttestationCorrectnessHeadResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctAttestationCorrectnessHead(ctx, req)
}

// ListFctMevBidCountByRelay returns MEV relay bid count data.
func (x *XatuCBT) ListFctMevBidCountByRelay(
	ctx context.Context,
	req *cbtproto.ListFctMevBidCountByRelayRequest,
) (*cbtproto.ListFctMevBidCountByRelayResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctMevBidCountByRelay(ctx, req)
}

// ListFctBlockBlobCountHead returns blob count data for blocks in the unfinalized chain.
func (x *XatuCBT) ListFctBlockBlobCountHead(
	ctx context.Context,
	req *cbtproto.ListFctBlockBlobCountHeadRequest,
) (*cbtproto.ListFctBlockBlobCountHeadResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctBlockBlobCountHead(ctx, req)
}

// ListFctBlockBlobFirstSeenByNode returns blob timing data from the fct_block_blob_first_seen_by_node table.
func (x *XatuCBT) ListFctBlockBlobFirstSeenByNode(
	ctx context.Context,
	req *cbtproto.ListFctBlockBlobFirstSeenByNodeRequest,
) (*cbtproto.ListFctBlockBlobFirstSeenByNodeResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctBlockBlobFirstSeenByNode(ctx, req)
}

// ListFctBlockHead returns block data from the fct_block_head table.
func (x *XatuCBT) ListFctBlockHead(
	ctx context.Context,
	req *cbtproto.ListFctBlockHeadRequest,
) (*cbtproto.ListFctBlockHeadResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctBlockHead(ctx, req)
}

// ListFctBlockMevHead returns MEV block data for the unfinalized chain.
func (x *XatuCBT) ListFctBlockMevHead(
	ctx context.Context,
	req *cbtproto.ListFctBlockMevHeadRequest,
) (*cbtproto.ListFctBlockMevHeadResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctBlockMevHead(ctx, req)
}

// ListFctMevBidHighestValueByBuilderChunked50Ms returns highest MEV bid values by builder for a slot in 50ms chunks.
func (x *XatuCBT) ListFctMevBidHighestValueByBuilderChunked50Ms(
	ctx context.Context,
	req *cbtproto.ListFctMevBidHighestValueByBuilderChunked50MsRequest,
) (*cbtproto.ListFctMevBidHighestValueByBuilderChunked50MsResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctMevBidHighestValueByBuilderChunked50ms(ctx, req)
}

// ListFctBlockProposerEntity returns proposer entity data from the fct_block_proposer_entity table.
func (x *XatuCBT) ListFctBlockProposerEntity(
	ctx context.Context,
	req *cbtproto.ListFctBlockProposerEntityRequest,
) (*cbtproto.ListFctBlockProposerEntityResponse, error) {
	// Calculate SlotStartDateTime if not already set for more efficient queries.
	if req.SlotStartDateTime == nil && req.Slot != nil {
		req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
	}

	return x.service.ListFctBlockProposerEntity(ctx, req)
}
