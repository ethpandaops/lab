package xatu_cbt

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

const (
	MethodListFctAttestationCorrectnessHead = "ListFctAttestationCorrectnessHead"
)

// ListFctAttestationCorrectnessHead returns attestation correctness data from the fct_attestation_correctness_head table.
func (x *XatuCBT) ListFctAttestationCorrectnessHead(
	ctx context.Context,
	req *cbtproto.ListFctAttestationCorrectnessHeadRequest,
) (resp *cbtproto.ListFctAttestationCorrectnessHeadResponse, err error) {
	var (
		network string
		items   []*cbtproto.FctAttestationCorrectnessHead
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctAttestationCorrectnessHead, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctAttestationCorrectnessHead, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("fct_attestation_correctness_head", network, req)
		cachedResponse = &cbtproto.ListFctAttestationCorrectnessHeadResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListFctAttestationCorrectnessHead, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListFctAttestationCorrectnessHead, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctAttestationCorrectnessHeadQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		item, scanErr := scanFctAttestationCorrectnessHead(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctAttestationCorrectnessHead: Failed to scan row")

			return nil
		}

		items = append(items, item)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_attestation_correctness_head: %w", err)
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
	rsp := &cbtproto.ListFctAttestationCorrectnessHeadResponse{
		FctAttestationCorrectnessHead: items,
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

// scanFctAttestationCorrectnessHead scans a single fct_attestation_correctness_head row from the database.
func scanFctAttestationCorrectnessHead(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctAttestationCorrectnessHead, error) {
	var (
		item                               cbtproto.FctAttestationCorrectnessHead
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
		blockRoot                          *string
		votesHead                          *uint32
		votesOther                         *uint32
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&item.Slot,
		&slotStartDateTime,
		&item.Epoch,
		&epochStartDateTime,
		&blockRoot,
		&item.VotesMax,
		&votesHead,
		&votesOther,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	item.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	item.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	item.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

	// Handle nullable fields
	if blockRoot != nil {
		item.BlockRoot = &wrapperspb.StringValue{Value: *blockRoot}
	}
	if votesHead != nil {
		item.VotesHead = &wrapperspb.UInt32Value{Value: *votesHead}
	}
	if votesOther != nil {
		item.VotesOther = &wrapperspb.UInt32Value{Value: *votesOther}
	}

	return &item, nil
}
