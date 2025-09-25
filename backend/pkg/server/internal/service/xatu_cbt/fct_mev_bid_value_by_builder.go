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
	MethodListFctMevBidValueByBuilder = "ListFctMevBidValueByBuilder"
)

// ListFctMevBidValueByBuilder returns highest MEV bid values by builder from the fct_mev_bid_value_by_builder table.
func (x *XatuCBT) ListFctMevBidValueByBuilder(
	ctx context.Context,
	req *cbtproto.ListFctMevBidValueByBuilderRequest,
) (resp *cbtproto.ListFctMevBidValueByBuilderResponse, err error) {
	var (
		network  string
		builders []*cbtproto.FctMevBidValueByBuilder
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctMevBidValueByBuilder, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctMevBidValueByBuilder, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("fct_mev_bid_value_by_builder", network, req)
		cachedResponse = &cbtproto.ListFctMevBidValueByBuilderResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListFctMevBidValueByBuilder, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListFctMevBidValueByBuilder, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctMevBidValueByBuilderQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		builder, scanErr := scanFctMevBidValueByBuilder(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctMevBidValueByBuilder: Failed to scan row")

			return nil
		}

		builders = append(builders, builder)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_mev_bid_value_by_builder: %w", err)
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
	rsp := &cbtproto.ListFctMevBidValueByBuilderResponse{
		FctMevBidValueByBuilder: builders,
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

// scanFctMevBidValueByBuilder scans a single fct_mev_bid_value_by_builder row from the database.
func scanFctMevBidValueByBuilder(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctMevBidValueByBuilder, error) {
	var (
		builder                            cbtproto.FctMevBidValueByBuilder
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
