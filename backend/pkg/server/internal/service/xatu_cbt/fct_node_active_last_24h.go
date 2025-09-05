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
	MethodListFctNodeActiveLast24h = "ListFctNodeActiveLast24h"
)

// ListFctNodeActiveLast24h returns nodes active in the last 24 hours from the fact table.
func (x *XatuCBT) ListFctNodeActiveLast24h(
	ctx context.Context,
	req *cbtproto.ListFctNodeActiveLast24HRequest,
) (resp *cbtproto.ListFctNodeActiveLast24HResponse, err error) {
	var (
		network string
		nodes   []*cbtproto.FctNodeActiveLast24H
	)

	defer func() {
		status := "success"
		if err != nil {
			status = "error"
		}

		x.requestsTotal.WithLabelValues(MethodListFctNodeActiveLast24h, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctNodeActiveLast24h, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("fct_node_active_last_24h", network, req)
		cachedResponse = &cbtproto.ListFctNodeActiveLast24HResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListFctNodeActiveLast24h, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListFctNodeActiveLast24h, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctNodeActiveLast24HQuery(req)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		node, scanErr := scanFctNodeActiveLast24h(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("Failed to scan row")

			return nil
		}

		nodes = append(nodes, node)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_node_active_last_24h: %w", err)
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
	rsp := &cbtproto.ListFctNodeActiveLast24HResponse{
		FctNodeActiveLast_24H: nodes,
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

// scanFctNodeActiveLast24h scans a single fct_node_active_last_24h row from the database.
func scanFctNodeActiveLast24h(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctNodeActiveLast24H, error) {
	var (
		node                              cbtproto.FctNodeActiveLast24H
		updatedDateTime, lastSeenDateTime time.Time
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&lastSeenDateTime,
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

	node.UpdatedDateTime = uint32(updatedDateTime.Unix())   //nolint:gosec // safe.
	node.LastSeenDateTime = uint32(lastSeenDateTime.Unix()) //nolint:gosec // safe.

	return &node, nil
}
