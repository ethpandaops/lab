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
	MethodListIntBlockMevHead = "ListIntBlockMevHead"
)

// ListIntBlockMevHead returns MEV block data from the int_block_mev_head table.
func (x *XatuCBT) ListIntBlockMevHead(
	ctx context.Context,
	req *cbtproto.ListIntBlockMevHeadRequest,
) (resp *cbtproto.ListIntBlockMevHeadResponse, err error) {
	var (
		network string
		blocks  []*cbtproto.IntBlockMevHead
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListIntBlockMevHead, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListIntBlockMevHead, network))
	defer timer.ObserveDuration()

	var (
		cacheKey       = x.generateCacheKey("int_block_mev_head", network, req)
		cachedResponse = &cbtproto.ListIntBlockMevHeadResponse{}
	)

	// Check cache first.
	if found, _ := x.tryCache(cacheKey, cachedResponse); found {
		x.cacheHitsTotal.WithLabelValues(MethodListIntBlockMevHead, network).Inc()

		return cachedResponse, nil
	}

	x.cacheMissesTotal.WithLabelValues(MethodListIntBlockMevHead, network).Inc()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListIntBlockMevHeadQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		block, scanErr := scanIntBlockMevHead(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("Failed to scan row")

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
	rsp := &cbtproto.ListIntBlockMevHeadResponse{
		IntBlockMevHead: blocks,
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

// scanIntBlockMevHead scans a single int_block_mev_head row from the database.
func scanIntBlockMevHead(
	scanner clickhouse.RowScanner,
) (*cbtproto.IntBlockMevHead, error) {
	var (
		block                              cbtproto.IntBlockMevHead
		updatedDateTime, slotStartDateTime time.Time
		epochStartDateTime                 time.Time
		relayNames                         []string
		earliestBidDateTime                *time.Time
		value                              *big.Int
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&block.Slot,
		&slotStartDateTime,
		&block.Epoch,
		&epochStartDateTime,
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

	block.UpdatedDateTime = uint32(updatedDateTime.Unix())       //nolint:gosec // safe.
	block.SlotStartDateTime = uint32(slotStartDateTime.Unix())   //nolint:gosec // safe.
	block.EpochStartDateTime = uint32(epochStartDateTime.Unix()) //nolint:gosec // safe.
	block.RelayNames = relayNames

	// Handle nullable fields.
	if earliestBidDateTime != nil {
		// Convert time to milliseconds
		millis := earliestBidDateTime.UnixMilli()
		if millis >= 0 {
			block.EarliestBidDateTime = wrapperspb.UInt64(uint64(millis))
		}
	}

	if value != nil {
		// Convert big.Int to string
		block.Value = wrapperspb.String(value.String())
	}

	return &block, nil
}
