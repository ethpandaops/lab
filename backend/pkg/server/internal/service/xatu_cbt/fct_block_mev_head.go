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
	MethodListFctBlockMevHead = "ListFctBlockMevHead"
)

// ListFctBlockMevHead returns MEV block data from the int_block_mev_head table.
func (x *XatuCBT) ListFctBlockMevHead(
	ctx context.Context,
	req *cbtproto.ListFctBlockMevHeadRequest,
) (resp *cbtproto.ListFctBlockMevHeadResponse, err error) {
	var (
		network string
		blocks  []*cbtproto.FctBlockMevHead
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctBlockMevHead, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctBlockMevHead, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctBlockMevHeadQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		block, scanErr := scanFctBlockMevHead(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctBlockMevHead: Failed to scan row")

			return nil
		}

		blocks = append(blocks, block)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query int_block_mev_head: %w", err)
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
	return &cbtproto.ListFctBlockMevHeadResponse{
		FctBlockMevHead: blocks,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(blocks)),
		),
	}, nil
}

// scanFctBlockMevHead scans a single int_block_mev_head row from the database.
func scanFctBlockMevHead(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctBlockMevHead, error) {
	var (
		block               cbtproto.FctBlockMevHead
		relayNames          []string
		earliestBidDateTime *int64
		value               *string
	)

	if err := scanner.Scan(
		&block.UpdatedDateTime,
		&block.Slot,
		&block.SlotStartDateTime,
		&block.Epoch,
		&block.EpochStartDateTime,
		&block.BlockRoot,
		&earliestBidDateTime,
		&relayNames,
		&block.ParentHash,
		&block.BlockNumber,
		&block.BlockHash,
		&block.BuilderPubkey,
		&block.ProposerPubkey,
		&block.ProposerFeeRecipient,
		&block.GasLimit,
		&block.GasUsed,
		&value,
		&block.TransactionCount,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	block.RelayNames = relayNames

	// Handle nullable fields.
	if earliestBidDateTime != nil {
		block.EarliestBidDateTime = wrapperspb.Int64(*earliestBidDateTime)
	}

	if value != nil {
		block.Value = wrapperspb.String(*value)
	}

	return &block, nil
}
