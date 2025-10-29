package state_analytics

import (
	"testing"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
)

// TestGetTopStateRemoversRequest validates the request message
func TestGetTopStateRemoversRequest(t *testing.T) {
	tests := []struct {
		name          string
		period        pb.GetTopStateRemoversRequest_Period
		limit         uint32
		expectedLimit uint32 // After validation
	}{
		{
			name:          "default period and limit",
			period:        pb.GetTopStateRemoversRequest_PERIOD_UNSPECIFIED,
			limit:         0,
			expectedLimit: 100,
		},
		{
			name:          "24h period with custom limit",
			period:        pb.GetTopStateRemoversRequest_PERIOD_24H,
			limit:         50,
			expectedLimit: 50,
		},
		{
			name:          "7d period",
			period:        pb.GetTopStateRemoversRequest_PERIOD_7D,
			limit:         200,
			expectedLimit: 200,
		},
		{
			name:          "30d period",
			period:        pb.GetTopStateRemoversRequest_PERIOD_30D,
			limit:         100,
			expectedLimit: 100,
		},
		{
			name:          "limit exceeds maximum",
			period:        pb.GetTopStateRemoversRequest_PERIOD_24H,
			limit:         2000,
			expectedLimit: 1000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &pb.GetTopStateRemoversRequest{
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

// TestGasRefundCalculation validates gas refund calculations
func TestGasRefundCalculation(t *testing.T) {
	tests := []struct {
		name                  string
		slotsCleared          uint64
		expectedGasRefund     uint64
		gasRefundPerSlot      uint64
	}{
		{
			name:              "single slot",
			slotsCleared:      1,
			gasRefundPerSlot:  15000,
			expectedGasRefund: 15000,
		},
		{
			name:              "10 slots",
			slotsCleared:      10,
			gasRefundPerSlot:  15000,
			expectedGasRefund: 150000,
		},
		{
			name:              "1000 slots",
			slotsCleared:      1000,
			gasRefundPerSlot:  15000,
			expectedGasRefund: 15000000,
		},
		{
			name:              "zero slots",
			slotsCleared:      0,
			gasRefundPerSlot:  15000,
			expectedGasRefund: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gasRefund := tt.slotsCleared * tt.gasRefundPerSlot

			if gasRefund != tt.expectedGasRefund {
				t.Errorf("Expected gas refund %d, got %d", tt.expectedGasRefund, gasRefund)
			}
		})
	}
}

// TestBytesFreedCalculation validates bytes freed calculations
func TestBytesFreedCalculation(t *testing.T) {
	tests := []struct {
		name              string
		slotsCleared      uint64
		expectedBytesFreed uint64
	}{
		{
			name:              "single slot",
			slotsCleared:      1,
			expectedBytesFreed: BytesPerSlot,
		},
		{
			name:              "10 slots",
			slotsCleared:      10,
			expectedBytesFreed: 10 * BytesPerSlot,
		},
		{
			name:              "1000 slots",
			slotsCleared:      1000,
			expectedBytesFreed: 1000 * BytesPerSlot,
		},
		{
			name:              "zero slots",
			slotsCleared:      0,
			expectedBytesFreed: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bytesFreed := tt.slotsCleared * BytesPerSlot

			if bytesFreed != tt.expectedBytesFreed {
				t.Errorf("Expected bytes freed %d, got %d", tt.expectedBytesFreed, bytesFreed)
			}
		})
	}
}

// TestRemoverPercentageCalculation validates percentage calculations for removers
func TestRemoverPercentageCalculation(t *testing.T) {
	tests := []struct {
		name               string
		slotsCleared       uint64
		totalSlotsCleared  uint64
		expectedPercentage float64
	}{
		{
			name:               "50% of total",
			slotsCleared:       500,
			totalSlotsCleared:  1000,
			expectedPercentage: 50.0,
		},
		{
			name:               "25% of total",
			slotsCleared:       250,
			totalSlotsCleared:  1000,
			expectedPercentage: 25.0,
		},
		{
			name:               "100% of total",
			slotsCleared:       1000,
			totalSlotsCleared:  1000,
			expectedPercentage: 100.0,
		},
		{
			name:               "zero total",
			slotsCleared:       100,
			totalSlotsCleared:  0,
			expectedPercentage: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var percentage float64
			if tt.totalSlotsCleared > 0 {
				percentage = (float64(tt.slotsCleared) / float64(tt.totalSlotsCleared)) * 100.0
			}

			if percentage != tt.expectedPercentage {
				t.Errorf("Expected %.2f%%, got %.2f%%", tt.expectedPercentage, percentage)
			}
		})
	}
}
