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

	var (
		cacheKey       = x.generateCacheKey("int_block_blob_count_head", network, req)
		cachedResponse = &cbtproto.ListFctBlockBlobCountHeadResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListFctBlockBlobCountHead, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListFctBlockBlobCountHead, network).Inc()

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
	rsp := &cbtproto.ListFctBlockBlobCountHeadResponse{
		FctBlockBlobCountHead: items,
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

// scanFctBlockBlobCountHead scans a single fct_block_blob_count_head row from the database.
func scanFctBlockBlobCountHead(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctBlockBlobCountHead, error) {
	var (
		item                               cbtproto.FctBlockBlobCountHead
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&item.Slot,
		&slotStartDateTime,
		&item.Epoch,
		&epochStartDateTime,
		&item.BlockRoot,
		&item.BlobCount,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	item.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	item.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	item.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

	return &item, nil
}
