package xatu_cbt

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

const (
	MethodListIntBlockHead = "ListIntBlockHead"
)

// ListIntBlockHead returns block data from the int_block_head table.
func (x *XatuCBT) ListIntBlockHead(
	ctx context.Context,
	req *cbtproto.ListIntBlockHeadRequest,
) (resp *cbtproto.ListIntBlockHeadResponse, err error) {
	var (
		network string
		blocks  []*cbtproto.IntBlockHead
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListIntBlockHead, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListIntBlockHead, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("int_block_head", network, req)
		cachedResponse = &cbtproto.ListIntBlockHeadResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListIntBlockHead, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListIntBlockHead, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListIntBlockHeadQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		block, scanErr := scanIntBlockHead(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("Failed to scan row")

			return nil
		}

		blocks = append(blocks, block)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query int_block_head: %w", err)
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
	rsp := &cbtproto.ListIntBlockHeadResponse{
		IntBlockHead: blocks,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(blocks)),
		),
	}

	// Store in cache.
	x.storeInCache(cacheKey, rsp, x.config.CacheTTL)

	return rsp, nil
}

// scanIntBlockHead scans a single int_block_head row from the database.
func scanIntBlockHead(
	scanner clickhouse.RowScanner,
) (*cbtproto.IntBlockHead, error) {
	var (
		block                              cbtproto.IntBlockHead
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time

		// Nullable fields
		blockTotalBytes                                  *uint32
		blockTotalBytesCompressed                        *uint32
		executionPayloadBaseFeePerGas                    *big.Int
		executionPayloadBlobGasUsed                      *uint64
		executionPayloadExcessBlobGas                    *uint64
		executionPayloadGasLimit                         *uint64
		executionPayloadGasUsed                          *uint64
		executionPayloadTransactionsCount                *uint32
		executionPayloadTransactionsTotalBytes           *uint32
		executionPayloadTransactionsTotalBytesCompressed *uint32
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&block.Slot,
		&slotStartDateTime,
		&block.Epoch,
		&epochStartDateTime,
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
	); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	block.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	block.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	block.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.

	// Handle nullable fields
	if blockTotalBytes != nil {
		block.BlockTotalBytes = wrapperspb.UInt32(*blockTotalBytes)
	}

	if blockTotalBytesCompressed != nil {
		block.BlockTotalBytesCompressed = wrapperspb.UInt32(*blockTotalBytesCompressed)
	}

	if executionPayloadBaseFeePerGas != nil {
		block.ExecutionPayloadBaseFeePerGas = wrapperspb.String(executionPayloadBaseFeePerGas.String())
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

	return &block, nil
}
