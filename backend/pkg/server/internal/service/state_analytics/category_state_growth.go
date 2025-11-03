package state_analytics

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// GetStateGrowthByCategory returns time-series state growth data categorized by contract type
func (s *Service) GetStateGrowthByCategory(
	ctx context.Context,
	req *pb.GetStateGrowthByCategoryRequest,
) (*pb.GetStateGrowthByCategoryResponse, error) {
	startTime := time.Now()
	method := "GetStateGrowthByCategory"

	// Get network from context
	network, err := s.getNetworkFromContext(ctx)
	if err != nil {
		s.recordMetrics(method, "unknown", StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	s.log.WithField("network", network).Debug("Fetching state growth by category")

	// Get ClickHouse client for network
	client, err := s.getClient(network)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	// For daily granularity, query the last 7,150 blocks (approximately 24 hours at 12 sec/block)
	var startBlock, endBlock uint64
	if req.Granularity == pb.GetStateGrowthByCategoryRequest_GRANULARITY_DAILY {
		// Query to get the latest block
		latestBlockQuery := fmt.Sprintf(`
			SELECT max(block_number) as max_block
			FROM %s.canonical_execution_storage_diffs
		`, network)

		latestRows, err := client.Query(ctx, latestBlockQuery)
		if err != nil || len(latestRows) == 0 {
			s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
			return nil, fmt.Errorf("failed to get latest block: %w", err)
		}

		endBlock = getUint64(latestRows[0], "max_block")
		// Query last 7,150 blocks (approximately 24 hours at 12 sec/block)
		if endBlock > 7149 {
			startBlock = endBlock - 7149
		} else {
			startBlock = 0
		}
	} else {
		startBlock = req.StartBlock
		endBlock = req.EndBlock
	}

	// Determine time bucket expression based on granularity
	var timeBucketExpr string
	switch req.Granularity {
	case pb.GetStateGrowthByCategoryRequest_GRANULARITY_DAILY:
		// For daily, use a constant bucket since we're querying ~1 day of data
		// No timestamp needed - we return block numbers for daily granularity
		timeBucketExpr = "'latest_period'"
	case pb.GetStateGrowthByCategoryRequest_GRANULARITY_MONTHLY:
		// Group by month (Paradigm Figure 3 style)
		timeBucketExpr = fmt.Sprintf(
			"toStartOfMonth(toDateTime(%d + block_number * 12))",
			s.getGenesisTime(network),
		)
	case pb.GetStateGrowthByCategoryRequest_GRANULARITY_YEARLY:
		// Group by year
		timeBucketExpr = fmt.Sprintf(
			"toStartOfYear(toDateTime(%d + block_number * 12))",
			s.getGenesisTime(network),
		)
	default:
		// Default to constant bucket
		timeBucketExpr = "'latest_period'"
	}

	// Set defaults for optional parameters
	topContracts := req.TopContractsPerPeriod
	if topContracts == 0 {
		topContracts = 100 // Default to top 100 contracts per period
	}

	// Build query with replacements
	query := queryStateGrowthByCategory
	query = strings.ReplaceAll(query, "{database}", network)
	query = strings.ReplaceAll(query, "{start_block}", fmt.Sprintf("%d", startBlock))
	query = strings.ReplaceAll(query, "{end_block}", fmt.Sprintf("%d", endBlock))
	query = strings.ReplaceAll(query, "{bytes_per_slot}", fmt.Sprintf("%d", BytesPerSlot))
	query = strings.ReplaceAll(query, "{time_bucket_expression}", timeBucketExpr)

	// Log the query for debugging
	s.log.WithField("network", network).Debugf("Executing state growth query: %s", query)

	// Execute query
	rows, err := client.Query(ctx, query)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to query state growth by category: %w", err)
	}

	if len(rows) == 0 {
		s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())
		return &pb.GetStateGrowthByCategoryResponse{
			TimeSeries: []*pb.CategoryGrowthTimeSeries{},
		}, nil
	}

	// Parse results and organize by time period
	type contractData struct {
		address   string
		netSlots  int64
		netBytes  int64
	}

	timePeriods := make(map[interface{}][]contractData) // time_bucket -> contracts

	for _, row := range rows {
		timeBucket := row["time_bucket"] // Can be Date, DateTime, or Year depending on granularity
		address := getString(row, "address")
		netSlots := getInt64(row, "net_slots")
		netBytes := getInt64(row, "net_bytes")

		timePeriods[timeBucket] = append(timePeriods[timeBucket], contractData{
			address:  address,
			netSlots: netSlots,
			netBytes: netBytes,
		})
	}

	// Convert to sorted time series
	var timeSeries []*pb.CategoryGrowthTimeSeries

	// Get sorted time periods (for daily this will be just one: "latest_period")
	var sortedPeriods []interface{}
	for period := range timePeriods {
		sortedPeriods = append(sortedPeriods, period)
	}

	// Sort periods (for monthly/yearly, this will sort by date; for daily it's just one bucket)
	sort.Slice(sortedPeriods, func(i, j int) bool {
		// Simple string/value comparison
		return fmt.Sprintf("%v", sortedPeriods[i]) < fmt.Sprintf("%v", sortedPeriods[j])
	})

	for _, period := range sortedPeriods {
		contracts := timePeriods[period]

		// Sort contracts by absolute net bytes (descending) and take top N
		sort.Slice(contracts, func(i, j int) bool {
			return abs(contracts[i].netBytes) > abs(contracts[j].netBytes)
		})

		// Limit to top N contracts per period
		if len(contracts) > int(topContracts) {
			contracts = contracts[:topContracts]
		}

		// Calculate total for the period
		var totalNetSlots int64
		var totalNetBytes int64
		for _, c := range contracts {
			totalNetSlots += c.netSlots
			totalNetBytes += c.netBytes
		}

		// Create category (all "Other" for now, will be enhanced with labeling later)
		categoryData := &pb.CategoryGrowthData{
			Category:      "Other",
			NetSlotsAdded: totalNetSlots,
			NetBytesAdded: totalNetBytes,
			TopContracts:  make([]*pb.ContractGrowthData, 0, len(contracts)),
		}

		// Add contract details
		for _, c := range contracts {
			var percentage float64
			if totalNetBytes != 0 {
				percentage = (float64(c.netBytes) / float64(totalNetBytes)) * 100.0
			}

			categoryData.TopContracts = append(categoryData.TopContracts, &pb.ContractGrowthData{
				Address:              c.address,
				Label:                "", // Will be filled by labeling service later
				NetSlotsAdded:        c.netSlots,
				NetBytesAdded:        c.netBytes,
				PercentageOfCategory: percentage,
			})
		}

		// For daily granularity, we don't use timestamps - just show the block number
		// For monthly/yearly, we can still derive from the period value
		var periodTime time.Time
		var blockNumber uint64

		if req.Granularity == pb.GetStateGrowthByCategoryRequest_GRANULARITY_DAILY {
			// For daily, use the end block as the reference
			blockNumber = endBlock
			// Don't set timestamp for daily - we're showing block-based data
			periodTime = time.Time{}
			s.log.Debugf("DAILY: period=%v, periodTime.IsZero()=%v", period, periodTime.IsZero())
		} else {
			// For monthly/yearly, convert period to time
			periodTime = periodToTime(period, s.getGenesisTime(network))
			if bn, ok := period.(uint64); ok {
				blockNumber = bn
			}
		}

		var timestampProto *timestamppb.Timestamp
		if !periodTime.IsZero() {
			timestampProto = timestamppb.New(periodTime)
			s.log.Debugf("Setting timestamp: %v", periodTime)
		} else {
			s.log.Debugf("NOT setting timestamp (periodTime.IsZero()=true)")
		}

		timeSeries = append(timeSeries, &pb.CategoryGrowthTimeSeries{
			Timestamp:      timestampProto,
			BlockNumber:    blockNumber,
			Categories:     []*pb.CategoryGrowthData{categoryData},
			TotalNetSlots:  totalNetSlots,
			TotalNetBytes:  totalNetBytes,
		})
	}

	s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())

	// For daily granularity, we don't set timestamps in the response
	// For monthly/yearly, use the timestamps from the data
	var startTimeProto, endTimeProto *timestamppb.Timestamp
	if req.Granularity != pb.GetStateGrowthByCategoryRequest_GRANULARITY_DAILY && len(timeSeries) > 0 {
		if timeSeries[0].Timestamp != nil {
			startTimeProto = timeSeries[0].Timestamp
		}
		if timeSeries[len(timeSeries)-1].Timestamp != nil {
			endTimeProto = timeSeries[len(timeSeries)-1].Timestamp
		}
	}

	return &pb.GetStateGrowthByCategoryResponse{
		TimeSeries: timeSeries,
		StartBlock: startBlock,
		EndBlock:   endBlock,
		StartTime:  startTimeProto,
		EndTime:    endTimeProto,
	}, nil
}

// Helper function to convert ClickHouse time bucket to Go time.Time
func periodToTime(period interface{}, genesisTime int64) time.Time {
	switch v := period.(type) {
	case time.Time:
		return v
	case int64: // Year
		return time.Date(int(v), 1, 1, 0, 0, 0, 0, time.UTC)
	case uint64: // Year
		return time.Date(int(v), 1, 1, 0, 0, 0, 0, time.UTC)
	case int32:
		return time.Date(int(v), 1, 1, 0, 0, 0, 0, time.UTC)
	case uint32:
		return time.Date(int(v), 1, 1, 0, 0, 0, 0, time.UTC)
	case string:
		// Try to parse as date
		t, err := time.Parse("2006-01-02", v)
		if err == nil {
			return t
		}
		// Try as datetime
		t, err = time.Parse(time.RFC3339, v)
		if err == nil {
			return t
		}
		return time.Unix(genesisTime, 0)
	default:
		return time.Unix(genesisTime, 0)
	}
}

// Helper function to get absolute value
func abs(n int64) int64 {
	if n < 0 {
		return -n
	}
	return n
}
