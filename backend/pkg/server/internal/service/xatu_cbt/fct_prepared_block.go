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
	MethodListFctPreparedBlock = "ListFctPreparedBlock"
)

// ListFctPreparedBlock returns prepared blocks for a single slot
func (x *XatuCBT) ListFctPreparedBlock(
	ctx context.Context,
	req *cbtproto.ListFctPreparedBlockRequest,
) (resp *cbtproto.ListFctPreparedBlockResponse, err error) {
	var (
		network string
		blocks  []*cbtproto.FctPreparedBlock
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctPreparedBlock, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctPreparedBlock, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctPreparedBlockQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		block, scanErr := scanFctPreparedBlock(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("Failed to scan row")

			return nil
		}

		blocks = append(blocks, block)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_prepared_block: %w", err)
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
	return &cbtproto.ListFctPreparedBlockResponse{
		FctPreparedBlock: blocks,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(blocks)),
		),
	}, nil
}

// scanFctPreparedBlock scans a single fct_prepared_block row from the database.
func scanFctPreparedBlock(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctPreparedBlock, error) {
	var (
		block                                  cbtproto.FctPreparedBlock
		blockTotalBytes                        *uint32
		blockTotalBytesCompressed              *uint32
		executionPayloadValue                  *uint64
		consensusPayloadValue                  *uint64
		executionPayloadGasLimit               *uint64
		executionPayloadGasUsed                *uint64
		executionPayloadTransactionsCount      *uint32
		executionPayloadTransactionsTotalBytes *uint32
	)

	if err := scanner.Scan(
		&block.UpdatedDateTime,
		&block.Slot,
		&block.SlotStartDateTime,
		&block.EventDateTime,
		&block.MetaClientName,
		&block.MetaClientVersion,
		&block.MetaClientImplementation,
		&block.MetaConsensusImplementation,
		&block.MetaConsensusVersion,
		&block.MetaClientGeoCity,
		&block.MetaClientGeoCountry,
		&block.MetaClientGeoCountryCode,
		&block.BlockVersion,
		&blockTotalBytes,
		&blockTotalBytesCompressed,
		&executionPayloadValue,
		&consensusPayloadValue,
		&block.ExecutionPayloadBlockNumber,
		&executionPayloadGasLimit,
		&executionPayloadGasUsed,
		&executionPayloadTransactionsCount,
		&executionPayloadTransactionsTotalBytes,
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	// Convert nullable fields to protobuf wrappers
	if blockTotalBytes != nil {
		block.BlockTotalBytes = wrapperspb.UInt32(*blockTotalBytes)
	}

	if blockTotalBytesCompressed != nil {
		block.BlockTotalBytesCompressed = wrapperspb.UInt32(*blockTotalBytesCompressed)
	}

	if executionPayloadValue != nil {
		block.ExecutionPayloadValue = wrapperspb.UInt64(*executionPayloadValue)
	}

	if consensusPayloadValue != nil {
		block.ConsensusPayloadValue = wrapperspb.UInt64(*consensusPayloadValue)
	}

	if executionPayloadGasLimit != nil {
		block.ExecutionPayloadGasLimit = wrapperspb.UInt64(*executionPayloadGasLimit)
	}

	if executionPayloadGasUsed != nil {
		block.ExecutionPayloadGasUsed = wrapperspb.UInt64(*executionPayloadGasUsed)
	}

	if executionPayloadTransactionsCount != nil {
		block.ExecutionPayloadTransactionsCount = wrapperspb.UInt32(*executionPayloadTransactionsCount)
	}

	if executionPayloadTransactionsTotalBytes != nil {
		block.ExecutionPayloadTransactionsTotalBytes = wrapperspb.UInt32(*executionPayloadTransactionsTotalBytes)
	}

	return &block, nil
}
