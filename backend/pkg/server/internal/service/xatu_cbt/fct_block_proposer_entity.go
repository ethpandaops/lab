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
	MethodListFctBlockProposerEntity = "ListFctBlockProposerEntity"
)

// ListFctBlockProposerEntity returns proposer entity data from the fct_block_proposer_entity table.
func (x *XatuCBT) ListFctBlockProposerEntity(
	ctx context.Context,
	req *cbtproto.ListFctBlockProposerEntityRequest,
) (resp *cbtproto.ListFctBlockProposerEntityResponse, err error) {
	var (
		network  string
		entities []*cbtproto.FctBlockProposerEntity
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctBlockProposerEntity, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctBlockProposerEntity, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctBlockProposerEntityQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		entity, scanErr := scanFctBlockProposerEntity(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctBlockProposerEntity: Failed to scan row")

			return nil
		}

		entities = append(entities, entity)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_block_proposer_entity: %w", err)
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
	return &cbtproto.ListFctBlockProposerEntityResponse{
		FctBlockProposerEntity: entities,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(entities)),
		),
	}, nil
}

// scanFctBlockProposerEntity scans a single fct_block_proposer_entity row from the database.
func scanFctBlockProposerEntity(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctBlockProposerEntity, error) {
	var (
		entity                             cbtproto.FctBlockProposerEntity
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
		entityName                         *string // nullable field
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&entity.Slot,
		&slotStartDateTime,
		&entity.Epoch,
		&epochStartDateTime,
		&entityName,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	entity.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	entity.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	entity.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

	// Handle nullable entity field
	if entityName != nil {
		entity.Entity = &wrapperspb.StringValue{Value: *entityName}
	}

	return &entity, nil
}
