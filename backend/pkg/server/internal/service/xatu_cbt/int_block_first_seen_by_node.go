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
	MethodListIntBlockFirstSeenByNode = "ListIntBlockFirstSeenByNode"
)

// ListIntBlockFirstSeenByNode returns block timing data from the int_block_first_seen_by_node table.
func (x *XatuCBT) ListIntBlockFirstSeenByNode(
	ctx context.Context,
	req *cbtproto.ListIntBlockFirstSeenByNodeRequest,
) (resp *cbtproto.ListIntBlockFirstSeenByNodeResponse, err error) {
	var (
		network string
		nodes   []*cbtproto.IntBlockFirstSeenByNode
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListIntBlockFirstSeenByNode, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListIntBlockFirstSeenByNode, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("int_block_first_seen_by_node", network, req)
		cachedResponse = &cbtproto.ListIntBlockFirstSeenByNodeResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListIntBlockFirstSeenByNode, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListIntBlockFirstSeenByNode, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListIntBlockFirstSeenByNodeQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		node, scanErr := scanIntBlockFirstSeenByNode(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("Failed to scan row")

			return nil
		}

		nodes = append(nodes, node)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query int_block_first_seen_by_node: %w", err)
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
	rsp := &cbtproto.ListIntBlockFirstSeenByNodeResponse{
		IntBlockFirstSeenByNode: nodes,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(nodes)),
		),
	}

	// Store in cache.
	x.storeInCache(cacheKey, rsp, x.config.CacheTTL)

	return rsp, nil
}

// scanIntBlockFirstSeenByNode scans a single int_block_first_seen_by_node row from the database.
func scanIntBlockFirstSeenByNode(
	scanner clickhouse.RowScanner,
) (*cbtproto.IntBlockFirstSeenByNode, error) {
	var (
		node                               cbtproto.IntBlockFirstSeenByNode
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&node.Source,
		&node.Slot,
		&slotStartDateTime,
		&node.Epoch,
		&epochStartDateTime,
		&node.SeenSlotStartDiff,
		&node.BlockRoot,
		&node.Username,
		&node.NodeId,
		&node.Classification,
		&node.MetaClientName,
		&node.MetaClientVersion,
		&node.MetaClientImplementation,
		&node.MetaClientGeoCity,
		&node.MetaClientGeoCountry,
		&node.MetaClientGeoCountryCode,
		&node.MetaClientGeoContinentCode,
		&node.MetaConsensusVersion,
		&node.MetaConsensusImplementation,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	node.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	node.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	node.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

	return &node, nil
}
