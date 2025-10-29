package state_analytics

import (
	"context"
	"fmt"
	"strings"
	"time"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
)

// GetTopStateRemovers returns contracts that cleared the most storage slots in a given period
func (s *Service) GetTopStateRemovers(
	ctx context.Context,
	req *pb.GetTopStateRemoversRequest,
) (*pb.GetTopStateRemoversResponse, error) {
	startTime := time.Now()
	method := "GetTopStateRemovers"

	// Get network from context
	network, err := s.getNetworkFromContext(ctx)
	if err != nil {
		s.recordMetrics(method, "unknown", StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	s.log.WithField("network", network).Debug("Fetching top state removers")

	// Get ClickHouse client for network
	client, err := s.getClient(network)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	// Determine blocks in period
	var blocksInPeriod uint64
	switch req.Period {
	case pb.GetTopStateRemoversRequest_PERIOD_24H:
		blocksInPeriod = uint64(BlocksPer24Hours)
	case pb.GetTopStateRemoversRequest_PERIOD_7D:
		blocksInPeriod = uint64(BlocksPer7Days)
	case pb.GetTopStateRemoversRequest_PERIOD_30D:
		blocksInPeriod = uint64(BlocksPer30Days)
	default:
		blocksInPeriod = uint64(BlocksPer24Hours) // Default to 24h
	}

	// Determine limit (default 100, max 1000)
	limit := req.Limit
	if limit == 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}

	// Build query with replacements
	query := queryTopStateRemovers
	query = strings.ReplaceAll(query, "{database}", network)
	query = strings.ReplaceAll(query, "{blocks_in_period}", fmt.Sprintf("%d", blocksInPeriod))
	query = strings.ReplaceAll(query, "{bytes_per_slot}", fmt.Sprintf("%d", BytesPerSlot))
	query = strings.ReplaceAll(query, "{limit}", fmt.Sprintf("%d", limit))

	// Execute query
	rows, err := client.Query(ctx, query)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to query top state removers: %w", err)
	}

	if len(rows) == 0 {
		s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())
		return &pb.GetTopStateRemoversResponse{
			Removers:   []*pb.StateRemover{},
			StartBlock: 0,
			EndBlock:   0,
		}, nil
	}

	// Get block range for response
	blockRangeQuery := fmt.Sprintf(`
		SELECT
			max(block_number) as end_block,
			max(block_number) - %d as start_block
		FROM %s.int_address_storage_slot_last_access
	`, blocksInPeriod, network)

	blockRangeRows, err := client.Query(ctx, blockRangeQuery)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to query block range: %w", err)
	}

	var startBlock, endBlock uint64
	if len(blockRangeRows) > 0 {
		startBlock = getUint64(blockRangeRows[0], "start_block")
		endBlock = getUint64(blockRangeRows[0], "end_block")
	}

	// Calculate total slots cleared in period for percentage calculation
	var totalSlotsCleared uint64
	for _, row := range rows {
		totalSlotsCleared += getUint64(row, "slots_cleared")
	}

	// Parse results
	removers := make([]*pb.StateRemover, 0, len(rows))
	for i, row := range rows {
		address := getString(row, "address")
		slotsCleared := getUint64(row, "slots_cleared")
		bytesFreed := getUint64(row, "bytes_freed")

		// Calculate percentage of total
		var percentage float64
		if totalSlotsCleared > 0 {
			percentage = (float64(slotsCleared) / float64(totalSlotsCleared)) * 100.0
		}

		// Estimate gas refund (15,000 gas per slot cleared, approximate)
		// This is a theoretical maximum, actual refunds are capped
		estimatedGasRefund := slotsCleared * 15000

		remover := &pb.StateRemover{
			Rank:                uint32(i + 1),
			Address:             address,
			SlotsCleared:        slotsCleared,
			EstimatedBytesFreed: bytesFreed,
			EstimatedGasRefund:  estimatedGasRefund,
			Category:            "", // TODO: Add contract categorization
			Label:               "", // TODO: Add contract labeling
			PercentageOfTotal:   percentage,
		}

		removers = append(removers, remover)
	}

	s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())

	return &pb.GetTopStateRemoversResponse{
		Removers:   removers,
		StartBlock: startBlock,
		EndBlock:   endBlock,
	}, nil
}
