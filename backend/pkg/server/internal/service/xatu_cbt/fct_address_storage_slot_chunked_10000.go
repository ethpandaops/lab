package xatu_cbt

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodListFctAddressStorageSlotChunked10000 = "ListFctAddressStorageSlotChunked10000"
)

// ListFctAddressStorageSlotChunked10000 returns storage slot data from the fct_address_storage_slot_chunked_10000 table.
func (x *XatuCBT) ListFctAddressStorageSlotChunked10000(
	ctx context.Context,
	req *cbtproto.ListFctAddressStorageSlotChunked10000Request,
) (resp *cbtproto.ListFctAddressStorageSlotChunked10000Response, err error) {
	var (
		network string
		items   []*cbtproto.FctAddressStorageSlotChunked10000
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctAddressStorageSlotChunked10000, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctAddressStorageSlotChunked10000, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctAddressStorageSlotChunked10000Query(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Execute the query with scanner pattern.
	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		item, scanErr := scanFctAddressStorageSlotChunked10000(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctAddressStorageSlotChunked10000: Failed to scan row")

			return nil
		}

		items = append(items, item)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_address_storage_slot_chunked_10000: %w", err)
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
	// Return vendored types directly (NO transformation)
	return &cbtproto.ListFctAddressStorageSlotChunked10000Response{
		FctAddressStorageSlotChunked_10000: items,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(items)),
		),
	}, nil
}

// scanFctAddressStorageSlotChunked10000 scans a single fct_address_storage_slot_chunked_10000 row from the database.
func scanFctAddressStorageSlotChunked10000(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctAddressStorageSlotChunked10000, error) {
	item := &cbtproto.FctAddressStorageSlotChunked10000{}

	if err := scanner.Scan(
		&item.UpdatedDateTime,
		&item.ChunkStartBlockNumber,
		&item.FirstAccessedSlots,
		&item.LastAccessedSlots,
	); err != nil {
		return nil, err
	}

	return item, nil
}
