package xatu_cbt

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodListFctMevBidHighestValueByBuilderChunked50ms = "ListFctMevBidHighestValueByBuilderChunked50ms"
)

// ListFctMevBidHighestValueByBuilderChunked50ms returns highest MEV bid values by builder in 50ms chunks.
func (x *XatuCBT) ListFctMevBidHighestValueByBuilderChunked50ms(
	ctx context.Context,
	req *cbtproto.ListFctMevBidHighestValueByBuilderChunked50MsRequest,
) (resp *cbtproto.ListFctMevBidHighestValueByBuilderChunked50MsResponse, err error) {
	var (
		network  string
		builders []*cbtproto.FctMevBidHighestValueByBuilderChunked50Ms
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctMevBidHighestValueByBuilderChunked50ms, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctMevBidHighestValueByBuilderChunked50ms, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("fct_mev_bid_highest_value_by_builder_chunked_50ms", network, req)
		cachedResponse = &cbtproto.ListFctMevBidHighestValueByBuilderChunked50MsResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListFctMevBidHighestValueByBuilderChunked50ms, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListFctMevBidHighestValueByBuilderChunked50ms, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctMevBidHighestValueByBuilderChunked50MsQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		builder, scanErr := scanFctMevBidHighestValueByBuilderChunked50ms(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctMevBidHighestValueByBuilderChunked50ms: Failed to scan row")

			return nil
		}

		builders = append(builders, builder)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_mev_bid_highest_value_by_builder_chunked_50ms: %w", err)
	}

	// Calculate pagination.
	pageSize := req.PageSize
	if pageSize == 0 {
		pageSize = DefaultPageSize
	}

	// Get current offset from token.
	currentOffset, err := cbtproto.DecodePageToken(req.PageToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decode page token: %w", err)
	}

	//nolint:gosec // conversion safe.
	rsp := &cbtproto.ListFctMevBidHighestValueByBuilderChunked50MsResponse{
		FctMevBidHighestValueByBuilderChunked_50Ms: builders,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(builders)),
		),
	}

	// Store in cache.
	x.storeInCache(cacheKey, rsp, x.config.CacheTTL)

	return rsp, nil
}

// scanFctMevBidHighestValueByBuilderChunked50ms scans a single fct_mev_bid_highest_value_by_builder_chunked_50ms row from the database.
func scanFctMevBidHighestValueByBuilderChunked50ms(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctMevBidHighestValueByBuilderChunked50Ms, error) {
	var (
		builder                            cbtproto.FctMevBidHighestValueByBuilderChunked50Ms
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
		earliestBidDateTime                time.Time
		relayNames                         []string
		value                              *big.Int
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&builder.Slot,
		&slotStartDateTime,
		&builder.Epoch,
		&epochStartDateTime,
		&builder.ChunkSlotStartDiff,
		&earliestBidDateTime,
		&relayNames,
		&builder.BlockHash,
		&builder.BuilderPubkey,
		&value,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	builder.UpdatedDateTime = uint32(updatedDateTime.Unix())              //nolint:gosec // safe.
	builder.SlotStartDateTime = uint32(slotStartDateTime.Unix())          //nolint:gosec // safe.
	builder.EpochStartDateTime = uint32(epochStartDateTime.Unix())        //nolint:gosec // safe.
	builder.EarliestBidDateTime = uint64(earliestBidDateTime.UnixMilli()) //nolint:gosec // safe.
	builder.RelayNames = relayNames

	// Convert big.Int to string
	if value != nil {
		builder.Value = value.String()
	}

	return &builder, nil
}
