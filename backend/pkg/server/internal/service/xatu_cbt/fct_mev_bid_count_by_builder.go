package xatu_cbt

import (
	"context"
	"fmt"

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
	return &cbtproto.ListFctMevBidCountByBuilderResponse{
		FctMevBidCountByBuilder: items,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(items)),
		),
	}, nil
}

// scanFctMevBidCountByBuilder scans a single fct_mev_bid_count_by_builder row from the database.
func scanFctMevBidCountByBuilder(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctMevBidCountByBuilder, error) {
	var (
		item cbtproto.FctMevBidCountByBuilder
	)

	if err := scanner.Scan(
		&item.UpdatedDateTime,
		&item.Slot,
		&item.SlotStartDateTime,
		&item.Epoch,
		&item.EpochStartDateTime,
		&item.BuilderPubkey,
		&item.BidTotal,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	return &item, nil
}
