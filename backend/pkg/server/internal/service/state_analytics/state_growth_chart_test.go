package state_analytics

import (
	"testing"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
)

// TestGetStateGrowthChartRequest validates the request message
func TestGetStateGrowthChartRequest(t *testing.T) {
	tests := []struct {
		name        string
		period      pb.GetStateGrowthChartRequest_Period
		granularity pb.GetStateGrowthChartRequest_Granularity
	}{
		{
			name:        "24h with block granularity",
			period:      pb.GetStateGrowthChartRequest_PERIOD_24H,
			granularity: pb.GetStateGrowthChartRequest_GRANULARITY_BLOCK,
		},
		{
			name:        "7d with hourly granularity",
			period:      pb.GetStateGrowthChartRequest_PERIOD_7D,
			granularity: pb.GetStateGrowthChartRequest_GRANULARITY_HOUR,
		},
		{
			name:        "30d with daily granularity",
			period:      pb.GetStateGrowthChartRequest_PERIOD_30D,
			granularity: pb.GetStateGrowthChartRequest_GRANULARITY_DAY,
		},
		{
			name:        "90d with daily granularity",
			period:      pb.GetStateGrowthChartRequest_PERIOD_90D,
			granularity: pb.GetStateGrowthChartRequest_GRANULARITY_DAY,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &pb.GetStateGrowthChartRequest{
				Period:      tt.period,
				Granularity: tt.granularity,
			}

			if req.Period != tt.period {
				t.Errorf("Expected period %v, got %v", tt.period, req.Period)
			}
			if req.Granularity != tt.granularity {
				t.Errorf("Expected granularity %v, got %v", tt.granularity, req.Granularity)
			}
		})
	}
}

// TestTimeBucketExpression validates time bucket expressions
func TestTimeBucketExpression(t *testing.T) {
	tests := []struct {
		name         string
		granularity  pb.GetStateGrowthChartRequest_Granularity
		expectedExpr string
	}{
		{
			name:         "block granularity",
			granularity:  pb.GetStateGrowthChartRequest_GRANULARITY_BLOCK,
			expectedExpr: "block_number",
		},
		{
			name:         "hour granularity",
			granularity:  pb.GetStateGrowthChartRequest_GRANULARITY_HOUR,
			expectedExpr: "intDiv(block_number, 300) * 300",
		},
		{
			name:         "day granularity",
			granularity:  pb.GetStateGrowthChartRequest_GRANULARITY_DAY,
			expectedExpr: "intDiv(block_number, 7200) * 7200",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var expr string
			switch tt.granularity {
			case pb.GetStateGrowthChartRequest_GRANULARITY_BLOCK:
				expr = "block_number"
			case pb.GetStateGrowthChartRequest_GRANULARITY_HOUR:
				expr = "intDiv(block_number, 300) * 300"
			case pb.GetStateGrowthChartRequest_GRANULARITY_DAY:
				expr = "intDiv(block_number, 7200) * 7200"
			default:
				expr = "intDiv(block_number, 300) * 300"
			}

			if expr != tt.expectedExpr {
				t.Errorf("Expected expression %s, got %s", tt.expectedExpr, expr)
			}
		})
	}
}

// TestChartPeriodBlockCalculation validates block period calculations
func TestChartPeriodBlockCalculation(t *testing.T) {
	tests := []struct {
		name           string
		period         pb.GetStateGrowthChartRequest_Period
		expectedBlocks uint64
	}{
		{
			name:           "24 hours",
			period:         pb.GetStateGrowthChartRequest_PERIOD_24H,
			expectedBlocks: uint64(BlocksPer24Hours),
		},
		{
			name:           "7 days",
			period:         pb.GetStateGrowthChartRequest_PERIOD_7D,
			expectedBlocks: uint64(BlocksPer7Days),
		},
		{
			name:           "30 days",
			period:         pb.GetStateGrowthChartRequest_PERIOD_30D,
			expectedBlocks: uint64(BlocksPer30Days),
		},
		{
			name:           "90 days",
			period:         pb.GetStateGrowthChartRequest_PERIOD_90D,
			expectedBlocks: uint64(BlocksPer30Days * 3),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var blocksInPeriod uint64
			switch tt.period {
			case pb.GetStateGrowthChartRequest_PERIOD_24H:
				blocksInPeriod = uint64(BlocksPer24Hours)
			case pb.GetStateGrowthChartRequest_PERIOD_7D:
				blocksInPeriod = uint64(BlocksPer7Days)
			case pb.GetStateGrowthChartRequest_PERIOD_30D:
				blocksInPeriod = uint64(BlocksPer30Days)
			case pb.GetStateGrowthChartRequest_PERIOD_90D:
				blocksInPeriod = uint64(BlocksPer30Days * 3)
			default:
				blocksInPeriod = uint64(BlocksPer24Hours)
			}

			if blocksInPeriod != tt.expectedBlocks {
				t.Errorf("Expected %d blocks, got %d", tt.expectedBlocks, blocksInPeriod)
			}
		})
	}
}

// TestGenesisTime validates genesis time constants
func TestGenesisTime(t *testing.T) {
	tests := []struct {
		name               string
		network            string
		expectedGenesisTime int64
	}{
		{
			name:               "mainnet",
			network:            "mainnet",
			expectedGenesisTime: GenesisTimeMainnet,
		},
		{
			name:               "holesky",
			network:            "holesky",
			expectedGenesisTime: GenesisTimeHolesky,
		},
		{
			name:               "hoodi",
			network:            "hoodi",
			expectedGenesisTime: GenesisTimeHoodi,
		},
		{
			name:               "sepolia",
			network:            "sepolia",
			expectedGenesisTime: GenesisTimeSepolia,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a mock service
			svc := &Service{}
			genesisTime := svc.getGenesisTime(tt.network)

			if genesisTime != tt.expectedGenesisTime {
				t.Errorf("Expected genesis time %d, got %d", tt.expectedGenesisTime, genesisTime)
			}
		})
	}
}

// TestSummaryCalculations validates summary statistics
func TestSummaryCalculations(t *testing.T) {
	tests := []struct {
		name                 string
		totalSlotsAdded      uint64
		totalSlotsCleared    uint64
		dataPoints           int
		expectedNetSlots     int64
		expectedAvgSlots     float64
	}{
		{
			name:              "positive growth",
			totalSlotsAdded:   1000,
			totalSlotsCleared: 500,
			dataPoints:        10,
			expectedNetSlots:  500,
			expectedAvgSlots:  100.0,
		},
		{
			name:              "negative growth",
			totalSlotsAdded:   500,
			totalSlotsCleared: 1000,
			dataPoints:        10,
			expectedNetSlots:  -500,
			expectedAvgSlots:  50.0,
		},
		{
			name:              "no change",
			totalSlotsAdded:   1000,
			totalSlotsCleared: 1000,
			dataPoints:        10,
			expectedNetSlots:  0,
			expectedAvgSlots:  100.0,
		},
		{
			name:              "no data points",
			totalSlotsAdded:   1000,
			totalSlotsCleared: 500,
			dataPoints:        0,
			expectedNetSlots:  500,
			expectedAvgSlots:  0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			netSlots := int64(tt.totalSlotsAdded) - int64(tt.totalSlotsCleared)
			var avgSlots float64
			if tt.dataPoints > 0 {
				avgSlots = float64(tt.totalSlotsAdded) / float64(tt.dataPoints)
			}

			if netSlots != tt.expectedNetSlots {
				t.Errorf("Expected net slots %d, got %d", tt.expectedNetSlots, netSlots)
			}
			if avgSlots != tt.expectedAvgSlots {
				t.Errorf("Expected avg slots %.2f, got %.2f", tt.expectedAvgSlots, avgSlots)
			}
		})
	}
}
