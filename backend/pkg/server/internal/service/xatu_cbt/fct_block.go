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
	MethodListFctBlockForStateExpiry = "ListFctBlockForStateExpiry"
)

// ListFctBlockForStateExpiry returns the execution block number from approximately 1 year ago.
// This is a special query for state expiry that finds a block from 1 year ago (minus 11 days).
func (x *XatuCBT) ListFctBlockForStateExpiry(
	ctx context.Context,
) (resp *cbtproto.ListFctBlockResponse, err error) {
	var (
		network string
		blocks  []*cbtproto.FctBlock
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctBlockForStateExpiry, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctBlockForStateExpiry, network))
	defer timer.ObserveDuration()

	// Calculate the time range: from 1 year ago to 354 days ago (1 year - 11 days)
	now := time.Now().UTC()
	oneYearAgo := now.Add(-365 * 24 * time.Hour)
	threeFiveFourDaysAgo := now.Add(-354 * 24 * time.Hour)

	// Convert to Unix timestamps
	startTime := uint32(oneYearAgo.Unix())         //nolint:gosec // safe for slot times
	endTime := uint32(threeFiveFourDaysAgo.Unix()) //nolint:gosec // safe for slot times

	// Build the special request for state expiry
	req := &cbtproto.ListFctBlockRequest{
		SlotStartDateTime: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Between{
				Between: &cbtproto.UInt32Range{
					Min: startTime,
					Max: wrapperspb.UInt32(endTime),
				},
			},
		},
		PageSize: 1,                          // Only need one block
		OrderBy:  "slot_start_date_time ASC", // Get the oldest block in the range
	}

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctBlockQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		block, scanErr := scanFctBlock(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctBlock: Failed to scan row")

			return nil
		}

		blocks = append(blocks, block)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_block for state expiry: %w", err)
	}

	return &cbtproto.ListFctBlockResponse{
		FctBlock: blocks,
	}, nil
}

// scanFctBlock scans a row from the fct_block table
func scanFctBlock(scanner clickhouse.RowScanner) (*cbtproto.FctBlock, error) {
	block := &cbtproto.FctBlock{}

	var (
		blockTotalBytes                                  *uint32
		blockTotalBytesCompressed                        *uint32
		executionPayloadBaseFeePerGas                    *string
		executionPayloadBlobGasUsed                      *uint64
		executionPayloadExcessBlobGas                    *uint64
		executionPayloadGasLimit                         *uint64
		executionPayloadGasUsed                          *uint64
		executionPayloadTransactionsCount                *uint32
		executionPayloadTransactionsTotalBytes           *uint32
		executionPayloadTransactionsTotalBytesCompressed *uint32
	)

	err := scanner.Scan(
		&block.UpdatedDateTime,
		&block.Slot,
		&block.SlotStartDateTime,
		&block.Epoch,
		&block.EpochStartDateTime,
		&block.BlockRoot,
		&block.BlockVersion,
		&blockTotalBytes,
		&blockTotalBytesCompressed,
		&block.ParentRoot,
		&block.StateRoot,
		&block.ProposerIndex,
		&block.Eth1DataBlockHash,
		&block.Eth1DataDepositRoot,
		&block.ExecutionPayloadBlockHash,
		&block.ExecutionPayloadBlockNumber,
		&block.ExecutionPayloadFeeRecipient,
		&executionPayloadBaseFeePerGas,
		&executionPayloadBlobGasUsed,
		&executionPayloadExcessBlobGas,
		&executionPayloadGasLimit,
		&executionPayloadGasUsed,
		&block.ExecutionPayloadStateRoot,
		&block.ExecutionPayloadParentHash,
		&executionPayloadTransactionsCount,
		&executionPayloadTransactionsTotalBytes,
		&executionPayloadTransactionsTotalBytesCompressed,
		&block.Status,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan fct_block: %w", err)
	}

	// Handle nullable fields
	if blockTotalBytes != nil {
		block.BlockTotalBytes = wrapperspb.UInt32(*blockTotalBytes)
	}

	if blockTotalBytesCompressed != nil {
		block.BlockTotalBytesCompressed = wrapperspb.UInt32(*blockTotalBytesCompressed)
	}

	if executionPayloadBaseFeePerGas != nil {
		block.ExecutionPayloadBaseFeePerGas = wrapperspb.String(*executionPayloadBaseFeePerGas)
	}

	if executionPayloadBlobGasUsed != nil {
		block.ExecutionPayloadBlobGasUsed = wrapperspb.UInt64(*executionPayloadBlobGasUsed)
	}

	if executionPayloadExcessBlobGas != nil {
		block.ExecutionPayloadExcessBlobGas = wrapperspb.UInt64(*executionPayloadExcessBlobGas)
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

	if executionPayloadTransactionsTotalBytesCompressed != nil {
		block.ExecutionPayloadTransactionsTotalBytesCompressed = wrapperspb.UInt32(*executionPayloadTransactionsTotalBytesCompressed)
	}

	return block, nil
}
