package state_analytics

import (
	"context"
	"fmt"
	"strings"
	"time"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
)

// GetTopStateAdders returns contracts that created the most new storage slots in a given period
func (s *Service) GetTopStateAdders(
	ctx context.Context,
	req *pb.GetTopStateAddersRequest,
) (*pb.GetTopStateAddersResponse, error) {
	startTime := time.Now()
	method := "GetTopStateAdders"

	// Get network from context
	network, err := s.getNetworkFromContext(ctx)
	if err != nil {
		s.recordMetrics(method, "unknown", StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	s.log.WithField("network", network).Debug("Fetching top state adders")

	// Get ClickHouse client for network
	client, err := s.getClient(network)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	// Determine blocks in period
	var blocksInPeriod uint64
	switch req.Period {
	case pb.GetTopStateAddersRequest_PERIOD_24H:
		blocksInPeriod = uint64(BlocksPer24Hours)
	case pb.GetTopStateAddersRequest_PERIOD_7D:
		blocksInPeriod = uint64(BlocksPer7Days)
	case pb.GetTopStateAddersRequest_PERIOD_30D:
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
	query := queryTopStateAdders
	query = strings.ReplaceAll(query, "{database}", network)
	query = strings.ReplaceAll(query, "{blocks_in_period}", fmt.Sprintf("%d", blocksInPeriod))
	query = strings.ReplaceAll(query, "{bytes_per_slot}", fmt.Sprintf("%d", BytesPerSlot))
	query = strings.ReplaceAll(query, "{limit}", fmt.Sprintf("%d", limit))

	// Execute query
	rows, err := client.Query(ctx, query)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to query top state adders: %w", err)
	}

	if len(rows) == 0 {
		s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())
		return &pb.GetTopStateAddersResponse{
			Adders:     []*pb.StateAdder{},
			StartBlock: 0,
			EndBlock:   0,
		}, nil
	}

	// Get block range for response
	blockRangeQuery := fmt.Sprintf(`
		SELECT
			max(block_number) as end_block,
			max(block_number) - %d as start_block
		FROM %s.int_address_storage_slot_first_access
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

	// Calculate total slots added in period for percentage calculation
	var totalSlotsAdded uint64
	for _, row := range rows {
		totalSlotsAdded += getUint64(row, "slots_added")
	}

	// Parse results
	adders := make([]*pb.StateAdder, 0, len(rows))
	for i, row := range rows {
		address := getString(row, "address")
		slotsAdded := getUint64(row, "slots_added")
		bytesAdded := getUint64(row, "bytes_added")

		// Calculate percentage of total
		var percentage float64
		if totalSlotsAdded > 0 {
			percentage = (float64(slotsAdded) / float64(totalSlotsAdded)) * 100.0
		}

		adder := &pb.StateAdder{
			Rank:                 uint32(i + 1),
			Address:              address,
			SlotsAdded:           slotsAdded,
			EstimatedBytesAdded:  bytesAdded,
			Category:             "", // TODO: Add contract categorization
			Label:                "", // TODO: Add contract labeling
			PercentageOfTotal:    percentage,
		}

		adders = append(adders, adder)
	}

	s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())

	return &pb.GetTopStateAddersResponse{
		Adders:     adders,
		StartBlock: startBlock,
		EndBlock:   endBlock,
	}, nil
}
