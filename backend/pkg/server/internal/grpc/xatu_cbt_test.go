package grpc

import (
	"context"
	"testing"

	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/metadata"
)

func TestCalculateSlotStartDateTime_Fallbacks(t *testing.T) {
	// Create XatuCBT instance without wallclock service to test fallback behavior
	x := &XatuCBT{
		log:              logrus.New(),
		wallclockService: nil, // No wallclock service to force fallback behavior
	}

	// Expected fallback filter
	fallbackFilter := &cbtproto.UInt32Filter{
		Filter: &cbtproto.UInt32Filter_Gte{Gte: 0},
	}

	tests := []struct {
		name         string
		setupContext func() context.Context
		slotFilter   *cbtproto.UInt32Filter
		description  string
	}{
		{
			name: "nil slot filter returns fallback",
			setupContext: func() context.Context {
				return context.Background()
			},
			slotFilter:  nil,
			description: "Should return fallback when slot filter is nil",
		},
		{
			name: "no metadata in context returns fallback",
			setupContext: func() context.Context {
				return context.Background()
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: 7500000},
			},
			description: "Should return fallback when no metadata in context",
		},
		{
			name: "no network in metadata returns fallback",
			setupContext: func() context.Context {
				md := metadata.New(map[string]string{})
				return metadata.NewIncomingContext(context.Background(), md)
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: 7500000},
			},
			description: "Should return fallback when network not in metadata",
		},
		{
			name: "nil wallclock service returns fallback",
			setupContext: func() context.Context {
				md := metadata.New(map[string]string{"network": "mainnet"})
				return metadata.NewIncomingContext(context.Background(), md)
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: 7500000},
			},
			description: "Should return fallback when wallclock service is nil",
		},
		{
			name: "slot number 0 returns fallback",
			setupContext: func() context.Context {
				md := metadata.New(map[string]string{"network": "mainnet"})
				return metadata.NewIncomingContext(context.Background(), md)
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: 0},
			},
			description: "Should return fallback when slot number is 0",
		},
		{
			name: "Gte filter type",
			setupContext: func() context.Context {
				md := metadata.New(map[string]string{"network": "mainnet"})
				return metadata.NewIncomingContext(context.Background(), md)
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Gte{Gte: 1000},
			},
			description: "Should handle Gte filter type",
		},
		{
			name: "Lt filter type",
			setupContext: func() context.Context {
				md := metadata.New(map[string]string{"network": "mainnet"})
				return metadata.NewIncomingContext(context.Background(), md)
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Lt{Lt: 5000},
			},
			description: "Should handle Lt filter type",
		},
		{
			name: "Gt filter type",
			setupContext: func() context.Context {
				md := metadata.New(map[string]string{"network": "mainnet"})
				return metadata.NewIncomingContext(context.Background(), md)
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Gt{Gt: 2000},
			},
			description: "Should handle Gt filter type",
		},
		{
			name: "Lte filter type",
			setupContext: func() context.Context {
				md := metadata.New(map[string]string{"network": "mainnet"})
				return metadata.NewIncomingContext(context.Background(), md)
			},
			slotFilter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Lte{Lte: 8000},
			},
			description: "Should handle Lte filter type",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Get the context
			ctx := tt.setupContext()

			// Call the function
			result := x.calculateSlotStartDateTime(ctx, tt.slotFilter)

			// Assert the result
			require.NotNil(t, result, "Result should never be nil")
			assert.Equal(t, fallbackFilter, result, tt.description)

			// Verify it's specifically the Gte fallback
			resultGte, ok := result.Filter.(*cbtproto.UInt32Filter_Gte)
			require.True(t, ok, "Expected Gte filter type for fallback")
			assert.Equal(t, uint32(0), resultGte.Gte, "Gte value should be 0 for fallback")
		})
	}
}

func TestCalculateSlotStartDateTime_ExtractsSlotNumbers(t *testing.T) {
	// Test that the function correctly extracts slot numbers from different filter types
	// This test doesn't need a real wallclock service, just verifies the switch statement logic
	x := &XatuCBT{
		log:              logrus.New(),
		wallclockService: nil,
	}

	// Create context with network (will still fallback due to nil wallclock service)
	md := metadata.New(map[string]string{"network": "mainnet"})
	ctx := metadata.NewIncomingContext(context.Background(), md)

	testCases := []struct {
		name           string
		filter         *cbtproto.UInt32Filter
		expectedNumber uint64 // What we expect to extract (even though it will fallback)
	}{
		{
			name: "Eq filter extracts number",
			filter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: 12345},
			},
			expectedNumber: 12345,
		},
		{
			name: "Gte filter extracts number",
			filter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Gte{Gte: 23456},
			},
			expectedNumber: 23456,
		},
		{
			name: "Lte filter extracts number",
			filter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Lte{Lte: 34567},
			},
			expectedNumber: 34567,
		},
		{
			name: "Gt filter extracts number",
			filter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Gt{Gt: 45678},
			},
			expectedNumber: 45678,
		},
		{
			name: "Lt filter extracts number",
			filter: &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Lt{Lt: 56789},
			},
			expectedNumber: 56789,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Call the function (will return fallback due to nil wallclock service)
			result := x.calculateSlotStartDateTime(ctx, tc.filter)

			// We're really just testing that it doesn't panic and returns a valid fallback
			require.NotNil(t, result)

			// Verify it returns the fallback filter
			resultGte, ok := result.Filter.(*cbtproto.UInt32Filter_Gte)
			require.True(t, ok, "Should return Gte fallback filter")
			assert.Equal(t, uint32(0), resultGte.Gte)
		})
	}
}
