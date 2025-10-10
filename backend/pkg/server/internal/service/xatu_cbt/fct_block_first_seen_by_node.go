package xatu_cbt

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

const (
	MethodListFctBlockFirstSeenByNode = "ListFctBlockFirstSeenByNode"
)

// ListFctBlockFirstSeenByNode returns block timing data from the fct_block_first_seen_by_node table.
func (x *XatuCBT) ListFctBlockFirstSeenByNode(
	ctx context.Context,
	req *cbtproto.ListFctBlockFirstSeenByNodeRequest,
) (resp *cbtproto.ListFctBlockFirstSeenByNodeResponse, err error) {
	var (
		network string
		nodes   []*cbtproto.FctBlockFirstSeenByNode
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctBlockFirstSeenByNode, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctBlockFirstSeenByNode, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctBlockFirstSeenByNodeQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		node, scanErr := scanFctBlockFirstSeenByNode(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctBlockFirstSeenByNode: Failed to scan row")

			return nil
		}

		nodes = append(nodes, node)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_block_first_seen_by_node: %w", err)
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
	return &cbtproto.ListFctBlockFirstSeenByNodeResponse{
		FctBlockFirstSeenByNode: nodes,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(nodes)),
		),
	}, nil
}

// scanFctBlockFirstSeenByNode scans a single fct_block_first_seen_by_node row from the database.
func scanFctBlockFirstSeenByNode(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctBlockFirstSeenByNode, error) {
	var (
		node         cbtproto.FctBlockFirstSeenByNode
		geoLongitude *float64
		geoLatitude  *float64
		geoAsNumber  *uint32
		geoAsOrg     *string
	)

	if err := scanner.Scan(
		&node.UpdatedDateTime,
		&node.Source,
		&node.Slot,
		&node.SlotStartDateTime,
		&node.Epoch,
		&node.EpochStartDateTime,
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
		&geoLongitude,
		&geoLatitude,
		&geoAsNumber,
		&geoAsOrg,
		&node.MetaConsensusVersion,
		&node.MetaConsensusImplementation,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	// Convert nullable fields to protobuf wrappers
	if geoLongitude != nil {
		node.MetaClientGeoLongitude = wrapperspb.Double(*geoLongitude)
	}

	if geoLatitude != nil {
		node.MetaClientGeoLatitude = wrapperspb.Double(*geoLatitude)
	}

	if geoAsNumber != nil {
		node.MetaClientGeoAutonomousSystemNumber = wrapperspb.UInt32(*geoAsNumber)
	}

	if geoAsOrg != nil {
		node.MetaClientGeoAutonomousSystemOrganization = wrapperspb.String(*geoAsOrg)
	}

	return &node, nil
}
