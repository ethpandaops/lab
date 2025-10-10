package xatu_cbt

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodListFctBlockBlobCountHead = "ListFctBlockBlobCountHead"
)

// ListFctBlockBlobCountHead returns blob count data from the fct_block_blob_count_head table.
func (x *XatuCBT) ListFctBlockBlobCountHead(
	ctx context.Context,
	req *cbtproto.ListFctBlockBlobCountHeadRequest,
) (resp *cbtproto.ListFctBlockBlobCountHeadResponse, err error) {
	var (
		network string
		items   []*cbtproto.FctBlockBlobCountHead
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctBlockBlobCountHead, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctBlockBlobCountHead, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctBlockBlobCountHeadQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		item, scanErr := scanFctBlockBlobCountHead(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctBlockBlobCountHead: Failed to scan row")

			return nil
		}

		items = append(items, item)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query int_block_blob_count_head: %w", err)
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
	return &cbtproto.ListFctBlockBlobCountHeadResponse{
		FctBlockBlobCountHead: items,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(items)),
		),
	}, nil
}

// scanFctBlockBlobCountHead scans a single fct_block_blob_count_head row from the database.
func scanFctBlockBlobCountHead(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctBlockBlobCountHead, error) {
	var (
		item cbtproto.FctBlockBlobCountHead
	)

	if err := scanner.Scan(
		&item.UpdatedDateTime,
		&item.Slot,
		&item.SlotStartDateTime,
		&item.Epoch,
		&item.EpochStartDateTime,
		&item.BlockRoot,
		&item.BlobCount,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	return &item, nil
}
