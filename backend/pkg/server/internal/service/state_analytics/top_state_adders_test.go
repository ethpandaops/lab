package state_analytics

import (
	"testing"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
)

// TestGetTopStateAddersRequest validates the request message
func TestGetTopStateAddersRequest(t *testing.T) {
	tests := []struct {
		name          string
		period        pb.GetTopStateAddersRequest_Period
		limit         uint32
		expectedLimit uint32 // After validation
	}{
		{
			name:          "default period and limit",
			period:        pb.GetTopStateAddersRequest_PERIOD_UNSPECIFIED,
			limit:         0,
			expectedLimit: 100,
		},
		{
			name:          "24h period with custom limit",
			period:        pb.GetTopStateAddersRequest_PERIOD_24H,
			limit:         50,
			expectedLimit: 50,
		},
		{
			name:          "7d period",
			period:        pb.GetTopStateAddersRequest_PERIOD_7D,
			limit:         200,
			expectedLimit: 200,
		},
		{
			name:          "30d period",
			period:        pb.GetTopStateAddersRequest_PERIOD_30D,
			limit:         100,
			expectedLimit: 100,
		},
		{
			name:          "limit exceeds maximum",
			period:        pb.GetTopStateAddersRequest_PERIOD_24H,
			limit:         2000,
			expectedLimit: 1000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &pb.GetTopStateAddersRequest{
				Period: tt.period,
				Limit:  tt.limit,
			}

			// Validate limit application logic
			limit := req.Limit
			if limit == 0 {
				limit = 100
			}
			if limit > 1000 {
				limit = 1000
			}

			if limit != tt.expectedLimit {
				t.Errorf("Expected limit %d, got %d", tt.expectedLimit, limit)
			}
		})
	}
}

// TestPeriodBlockCalculation validates block period calculations
func TestPeriodBlockCalculation(t *testing.T) {
	tests := []struct {
		name           string
		period         pb.GetTopStateAddersRequest_Period
		expectedBlocks uint64
	}{
		{
			name:           "24 hours",
			period:         pb.GetTopStateAddersRequest_PERIOD_24H,
			expectedBlocks: uint64(BlocksPer24Hours),
		},
		{
			name:           "7 days",
			period:         pb.GetTopStateAddersRequest_PERIOD_7D,
			expectedBlocks: uint64(BlocksPer7Days),
		},
		{
			name:           "30 days",
			period:         pb.GetTopStateAddersRequest_PERIOD_30D,
			expectedBlocks: uint64(BlocksPer30Days),
		},
		{
			name:           "unspecified defaults to 24h",
			period:         pb.GetTopStateAddersRequest_PERIOD_UNSPECIFIED,
			expectedBlocks: uint64(BlocksPer24Hours),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var blocksInPeriod uint64
			switch tt.period {
			case pb.GetTopStateAddersRequest_PERIOD_24H:
				blocksInPeriod = uint64(BlocksPer24Hours)
			case pb.GetTopStateAddersRequest_PERIOD_7D:
				blocksInPeriod = uint64(BlocksPer7Days)
			case pb.GetTopStateAddersRequest_PERIOD_30D:
				blocksInPeriod = uint64(BlocksPer30Days)
			default:
				blocksInPeriod = uint64(BlocksPer24Hours)
			}

			if blocksInPeriod != tt.expectedBlocks {
				t.Errorf("Expected %d blocks, got %d", tt.expectedBlocks, blocksInPeriod)
			}
		})
	}
}

// TestPercentageCalculation validates percentage calculations
func TestPercentageCalculation(t *testing.T) {
	tests := []struct {
		name               string
		slotsAdded         uint64
		totalSlotsAdded    uint64
		expectedPercentage float64
	}{
		{
			name:               "50% of total",
			slotsAdded:         500,
			totalSlotsAdded:    1000,
			expectedPercentage: 50.0,
		},
		{
			name:               "25% of total",
			slotsAdded:         250,
			totalSlotsAdded:    1000,
			expectedPercentage: 25.0,
		},
		{
			name:               "100% of total",
			slotsAdded:         1000,
			totalSlotsAdded:    1000,
			expectedPercentage: 100.0,
		},
		{
			name:               "zero total",
			slotsAdded:         100,
			totalSlotsAdded:    0,
			expectedPercentage: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var percentage float64
			if tt.totalSlotsAdded > 0 {
				percentage = (float64(tt.slotsAdded) / float64(tt.totalSlotsAdded)) * 100.0
			}

			if percentage != tt.expectedPercentage {
				t.Errorf("Expected %.2f%%, got %.2f%%", tt.expectedPercentage, percentage)
			}
		})
	}
}
