package state_analytics

import (
	"context"
	"fmt"
	"strings"
	"time"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	// Genesis times for different networks (Unix timestamps)
	// These are execution layer genesis times for use with canonical_execution_storage_diffs table
	GenesisTimeMainnet = 1438269973 // July 30, 2015 3:26:13 PM UTC (Ethereum mainnet genesis)
	GenesisTimeHolesky = 1695902400 // Sep 28, 2023 12:00:00 PM UTC
	GenesisTimeHoodi   = 1712923200 // Apr 12, 2024 12:00:00 PM UTC
	GenesisTimeSepolia = 1655733600 // Jun 20, 2022 2:00:00 PM UTC
)

// GetStateGrowthChart returns time-series data of state growth
func (s *Service) GetStateGrowthChart(
	ctx context.Context,
	req *pb.GetStateGrowthChartRequest,
) (*pb.GetStateGrowthChartResponse, error) {
	startTime := time.Now()
	method := "GetStateGrowthChart"

	// Get network from context
	network, err := s.getNetworkFromContext(ctx)
	if err != nil {
		s.recordMetrics(method, "unknown", StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	s.log.WithField("network", network).Debug("Fetching state growth chart")

	// Get ClickHouse client for network
	client, err := s.getClient(network)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	// Determine blocks in period
	var blocksInPeriod uint64
	switch req.Period {
	case pb.GetStateGrowthChartRequest_PERIOD_24H:
		blocksInPeriod = uint64(BlocksPer24Hours)
	case pb.GetStateGrowthChartRequest_PERIOD_7D:
		blocksInPeriod = uint64(BlocksPer7Days)
	case pb.GetStateGrowthChartRequest_PERIOD_30D:
		blocksInPeriod = uint64(BlocksPer30Days)
	case pb.GetStateGrowthChartRequest_PERIOD_90D:
		blocksInPeriod = uint64(BlocksPer30Days * 3)
	default:
		blocksInPeriod = uint64(BlocksPer24Hours) // Default to 24h
	}

	// Determine time bucket expression based on granularity
	var timeBucketExpr string
	switch req.Granularity {
	case pb.GetStateGrowthChartRequest_GRANULARITY_BLOCK:
		timeBucketExpr = "block_number"
	case pb.GetStateGrowthChartRequest_GRANULARITY_HOUR:
		// Group by hour (300 blocks per hour)
		timeBucketExpr = "intDiv(block_number, 300) * 300"
	case pb.GetStateGrowthChartRequest_GRANULARITY_DAY:
		// Group by day (7200 blocks per day)
		timeBucketExpr = "intDiv(block_number, 7200) * 7200"
	default:
		// Default to hourly for reasonable data points
		timeBucketExpr = "intDiv(block_number, 300) * 300"
	}

	// Build query with replacements
	query := queryStateGrowthChart
	query = strings.ReplaceAll(query, "{database}", network)
	query = strings.ReplaceAll(query, "{blocks_in_period}", fmt.Sprintf("%d", blocksInPeriod))
	query = strings.ReplaceAll(query, "{bytes_per_slot}", fmt.Sprintf("%d", BytesPerSlot))
	query = strings.ReplaceAll(query, "{time_bucket_expression}", timeBucketExpr)

	// Execute query
	rows, err := client.Query(ctx, query)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to query state growth chart: %w", err)
	}

	if len(rows) == 0 {
		s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())
		return &pb.GetStateGrowthChartResponse{
			DataPoints: []*pb.StateGrowthDataPoint{},
			Summary:    &pb.StateSummary{},
		}, nil
	}

	// Get genesis time for network
	genesisTime := s.getGenesisTime(network)

	// Parse results into data points
	dataPoints := make([]*pb.StateGrowthDataPoint, 0, len(rows))
	var totalSlotsAdded, totalSlotsCleared uint64
	var totalBytesAdded, totalBytesCleared uint64

	for _, row := range rows {
		blockNumber := getUint64(row, "time_bucket")
		slotsAdded := getUint64(row, "slots_added")
		slotsCleared := getUint64(row, "slots_cleared")
		netSlots := getInt64(row, "net_slots")
		bytesAdded := getUint64(row, "bytes_added")
		bytesCleared := getUint64(row, "bytes_cleared")
		netBytes := getInt64(row, "net_bytes")

		// Calculate timestamp (block time = genesis + block_number * 12 seconds)
		blockTimestamp := time.Unix(genesisTime+int64(blockNumber)*12, 0)

		dataPoint := &pb.StateGrowthDataPoint{
			Timestamp:     timestamppb.New(blockTimestamp),
			BlockNumber:   blockNumber,
			SlotsAdded:    slotsAdded,
			SlotsCleared:  slotsCleared,
			NetSlots:      netSlots,
			BytesAdded:    bytesAdded,
			BytesCleared:  bytesCleared,
			NetBytes:      netBytes,
		}

		dataPoints = append(dataPoints, dataPoint)

		// Accumulate totals
		totalSlotsAdded += slotsAdded
		totalSlotsCleared += slotsCleared
		totalBytesAdded += bytesAdded
		totalBytesCleared += bytesCleared
	}

	// Calculate summary statistics
	netSlots := int64(totalSlotsAdded) - int64(totalSlotsCleared)
	netBytes := int64(totalBytesAdded) - int64(totalBytesCleared)
	avgSlotsPerBlock := float64(0)
	if len(dataPoints) > 0 {
		avgSlotsPerBlock = float64(totalSlotsAdded) / float64(len(dataPoints))
	}

	summary := &pb.StateSummary{
		TotalSlotsAdded:   totalSlotsAdded,
		TotalSlotsCleared: totalSlotsCleared,
		NetSlots:          netSlots,
		TotalBytesAdded:   totalBytesAdded,
		TotalBytesCleared: totalBytesCleared,
		NetBytes:          netBytes,
		AvgSlotsPerBlock:  avgSlotsPerBlock,
	}

	s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())

	return &pb.GetStateGrowthChartResponse{
		DataPoints: dataPoints,
		Summary:    summary,
	}, nil
}

// getGenesisTime returns the genesis timestamp for a given network
func (s *Service) getGenesisTime(network string) int64 {
	switch network {
	case "mainnet":
		return GenesisTimeMainnet
	case "holesky":
		return GenesisTimeHolesky
	case "hoodi":
		return GenesisTimeHoodi
	case "sepolia":
		return GenesisTimeSepolia
	default:
		return GenesisTimeMainnet // Default to mainnet
	}
}
