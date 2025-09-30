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
	MethodListFctBlockBlobFirstSeenByNode = "ListFctBlockBlobFirstSeenByNode"
)

// ListFctBlockBlobFirstSeenByNode returns blob timing data from the fct_block_blob_first_seen_by_node table.
func (x *XatuCBT) ListFctBlockBlobFirstSeenByNode(
	ctx context.Context,
	req *cbtproto.ListFctBlockBlobFirstSeenByNodeRequest,
) (resp *cbtproto.ListFctBlockBlobFirstSeenByNodeResponse, err error) {
	var (
		network string
		nodes   []*cbtproto.FctBlockBlobFirstSeenByNode
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctBlockBlobFirstSeenByNode, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctBlockBlobFirstSeenByNode, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctBlockBlobFirstSeenByNodeQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		node, scanErr := scanFctBlockBlobFirstSeenByNode(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctBlockBlobFirstSeenByNode: Failed to scan row")

			return nil
		}

		nodes = append(nodes, node)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_block_blob_first_seen_by_node: %w", err)
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
	return &cbtproto.ListFctBlockBlobFirstSeenByNodeResponse{
		FctBlockBlobFirstSeenByNode: nodes,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(nodes)),
		),
	}, nil
}

// scanFctBlockBlobFirstSeenByNode scans a single fct_block_blob_first_seen_by_node row from the database.
func scanFctBlockBlobFirstSeenByNode(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctBlockBlobFirstSeenByNode, error) {
	var (
		node                               cbtproto.FctBlockBlobFirstSeenByNode
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
		geoLongitude                       *float64
		geoLatitude                        *float64
		geoAsNumber                        *uint32
		geoAsOrg                           *string
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
		&node.BlobIndex,
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

	node.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	node.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	node.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

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
