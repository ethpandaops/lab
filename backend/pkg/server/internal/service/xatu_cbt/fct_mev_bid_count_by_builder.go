package xatu_cbt

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodListFctMevBidCountByBuilder = "ListFctMevBidCountByBuilder"
)

// ListFctMevBidCountByBuilder returns MEV builder bid count data from the fct_mev_bid_count_by_builder table.
func (x *XatuCBT) ListFctMevBidCountByBuilder(
	ctx context.Context,
	req *cbtproto.ListFctMevBidCountByBuilderRequest,
) (resp *cbtproto.ListFctMevBidCountByBuilderResponse, err error) {
	var (
		network string
		items   []*cbtproto.FctMevBidCountByBuilder
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctMevBidCountByBuilder, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctMevBidCountByBuilder, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("fct_mev_bid_count_by_builder", network, req)
		cachedResponse = &cbtproto.ListFctMevBidCountByBuilderResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListFctMevBidCountByBuilder, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListFctMevBidCountByBuilder, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctMevBidCountByBuilderQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		item, scanErr := scanFctMevBidCountByBuilder(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctMevBidCountByBuilder: Failed to scan row")

			return nil
		}

		items = append(items, item)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_mev_bid_count_by_builder: %w", err)
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
	rsp := &cbtproto.ListFctMevBidCountByBuilderResponse{
		FctMevBidCountByBuilder: items,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(items)),
		),
	}

	// Store in cache.
	x.storeInCache(cacheKey, rsp, x.config.CacheTTL)

	return rsp, nil
}

// scanFctMevBidCountByBuilder scans a single fct_mev_bid_count_by_builder row from the database.
func scanFctMevBidCountByBuilder(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctMevBidCountByBuilder, error) {
	var (
		item                               cbtproto.FctMevBidCountByBuilder
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&item.Slot,
		&slotStartDateTime,
		&item.Epoch,
		&epochStartDateTime,
		&item.BuilderPubkey,
		&item.BidTotal,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	item.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	item.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	item.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

	return &item, nil
}
