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
	MethodListIntXatuNodes24H = "ListIntXatuNodes24H"
)

// ListIntXatuNodes24H returns xatu nodes from the 24h intermediate table.
func (x *XatuCBT) ListIntXatuNodes24H(
	ctx context.Context,
	req *cbtproto.ListIntXatuNodes24HRequest,
) (resp *cbtproto.ListIntXatuNodes24HResponse, err error) {
	var (
		network string
		nodes   []*cbtproto.IntXatuNodes24H
	)

	defer func() {
		status := "success"
		if err != nil {
			status = "error"
		}

		x.requestsTotal.WithLabelValues(MethodListIntXatuNodes24H, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListIntXatuNodes24H, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("int_xatu_nodes__24h", network, req)
		cachedResponse = &cbtproto.ListIntXatuNodes24HResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListIntXatuNodes24H, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListIntXatuNodes24H, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListIntXatuNodes24HQuery(req)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		node, scanErr := scanIntXatuNode24H(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("Failed to scan row")

			return nil
		}

		nodes = append(nodes, node)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query int_xatu_nodes__24h: %w", err)
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
	rsp := &cbtproto.ListIntXatuNodes24HResponse{
		IntXatuNodes__24H: nodes,
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

// scanIntXatuNode24H scans a single int_xatu_nodes__24h row from the database.
func scanIntXatuNode24H(
	scanner clickhouse.RowScanner,
) (*cbtproto.IntXatuNodes24H, error) {
	var (
		node                              cbtproto.IntXatuNodes24H
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
