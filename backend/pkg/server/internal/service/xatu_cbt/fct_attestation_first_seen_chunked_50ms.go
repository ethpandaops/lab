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
	MethodListFctAttestationFirstSeenChunked50ms = "ListFctAttestationFirstSeenChunked50ms"
)

// ListFctAttestationFirstSeenChunked50ms returns attestation timing data from the fct_attestation_first_seen_chunked_50ms table.
func (x *XatuCBT) ListFctAttestationFirstSeenChunked50ms(
	ctx context.Context,
	req *cbtproto.ListFctAttestationFirstSeenChunked50MsRequest,
) (resp *cbtproto.ListFctAttestationFirstSeenChunked50MsResponse, err error) {
	var (
		network string
		chunks  []*cbtproto.FctAttestationFirstSeenChunked50Ms
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctAttestationFirstSeenChunked50ms, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctAttestationFirstSeenChunked50ms, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("fct_attestation_first_seen_chunked_50ms", network, req)
		cachedResponse = &cbtproto.ListFctAttestationFirstSeenChunked50MsResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListFctAttestationFirstSeenChunked50ms, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListFctAttestationFirstSeenChunked50ms, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctAttestationFirstSeenChunked50MsQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		chunk, scanErr := scanFctAttestationFirstSeenChunked50ms(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctAttestationFirstSeenChunked50ms: Failed to scan row")

			return nil
		}

		chunks = append(chunks, chunk)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_attestation_first_seen_chunked_50ms: %w", err)
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
	rsp := &cbtproto.ListFctAttestationFirstSeenChunked50MsResponse{
		FctAttestationFirstSeenChunked_50Ms: chunks,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(chunks)),
		),
	}

	// Store in cache.
	x.storeInCache(cacheKey, rsp, x.config.CacheTTL)

	return rsp, nil
}

// scanFctAttestationFirstSeenChunked50ms scans a single fct_attestation_first_seen_chunked_50ms row from the database.
func scanFctAttestationFirstSeenChunked50ms(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctAttestationFirstSeenChunked50Ms, error) {
	var (
		chunk                              cbtproto.FctAttestationFirstSeenChunked50Ms
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&chunk.Slot,
		&slotStartDateTime,
		&chunk.Epoch,
		&epochStartDateTime,
		&chunk.BlockRoot,
		&chunk.ChunkSlotStartDiff,
		&chunk.AttestationCount,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	chunk.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	chunk.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	chunk.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

	return &chunk, nil
}
