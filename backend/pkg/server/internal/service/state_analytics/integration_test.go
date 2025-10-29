// +build integration

package state_analytics

import (
	"context"
	"testing"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/metadata"
)

// TestGetLatestBlockDelta_Integration tests the actual implementation against real Xatu ClickHouse
// Run with: go test -tags=integration -v ./pkg/server/internal/service/state_analytics/...
func TestGetLatestBlockDelta_Integration(t *testing.T) {
	// This test requires real ClickHouse access
	// Set XATU_CLICKHOUSE_URL environment variable
	dsn := "https://efstateless:1f614ba2-bb5c-4fcf-ae8a-d25563290942@clickhouse.xatu.ethpandaops.io:443/default"

	// Create logger
	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	// Create noop metrics for testing
	metricsSvc := metrics.NewNopMetrics("test", log)

	// Create ClickHouse config
	chConfig := &clickhouse.Config{
		DSN: dsn,
		ConnectionConfig: clickhouse.ConnectionConfig{
			MaxOpenConns:      5,
			MaxIdleConns:      2,
			ConnMaxLifetime:   time.Hour,
			DialTimeout:       10 * time.Second,
			ReadTimeout:       30 * time.Second,
			WriteTimeout:      10 * time.Second,
			MaxExecutionTime:  60,
			InsecureSkipVerify: false,
		},
	}

	// Test on holesky (smaller dataset, faster queries)
	network := "holesky"

	// Create service config
	serviceConfig := &Config{
		NetworkConfigs: map[string]*NetworkConfig{
			network: {
				Enabled:    true,
				ClickHouse: chConfig,
			},
		},
	}

	// Create the service
	svc, err := New(log, serviceConfig, metricsSvc)
	require.NoError(t, err, "Failed to create service")

	// Start the service
	ctx := context.Background()
	err = svc.Start(ctx)
	require.NoError(t, err, "Failed to start service")
	defer svc.Stop()

	// Create request
	req := &pb.GetLatestBlockDeltaRequest{}

	// Add network to context via gRPC metadata
	md := metadata.Pairs("network", network)
	ctxWithNetwork := metadata.NewIncomingContext(ctx, md)

	// Call the method
	resp, err := svc.GetLatestBlockDelta(ctxWithNetwork, req)
	require.NoError(t, err, "GetLatestBlockDelta failed")
	require.NotNil(t, resp, "Response should not be nil")

	// Validate response
	t.Logf("✅ GetLatestBlockDelta Response:")
	t.Logf("  Block Number: %d", resp.BlockNumber)
	t.Logf("  New Slots: %d", resp.NewSlotsCount)
	t.Logf("  Modified Slots: %d", resp.ModifiedSlotsCount)
	t.Logf("  Cleared Slots: %d", resp.ClearedSlotsCount)
	t.Logf("  Estimated Bytes Added: %d bytes (%.2f KB)", resp.EstimatedBytesAdded, float64(resp.EstimatedBytesAdded)/1024)
	t.Logf("  Net State Change: %d bytes (%.2f KB)", resp.NetStateChangeBytes, float64(resp.NetStateChangeBytes)/1024)

	// Basic validations
	require.Greater(t, resp.BlockNumber, uint64(0), "Block number should be positive")
	require.NotNil(t, resp.BlockTimestamp, "Block timestamp should not be nil")

	// Validate byte calculations
	expectedBytesAdded := uint64(resp.NewSlotsCount) * BytesPerSlot
	require.Equal(t, expectedBytesAdded, resp.EstimatedBytesAdded, "Bytes added calculation incorrect")

	expectedNetBytes := (int64(resp.NewSlotsCount) - int64(resp.ClearedSlotsCount)) * BytesPerSlot
	require.Equal(t, expectedNetBytes, resp.NetStateChangeBytes, "Net state change calculation incorrect")

	// Check top contributors (may be empty if no changes in latest block)
	t.Logf("  Top Contributors: %d contracts", len(resp.TopContributors))
	for i, contrib := range resp.TopContributors {
		t.Logf("    [%d] %s: new=%d, modified=%d, cleared=%d, net_bytes=%d",
			i+1, contrib.Address, contrib.NewSlots, contrib.ModifiedSlots, contrib.ClearedSlots, contrib.NetBytes)
	}

	// Success!
	t.Log("✅ Integration test passed!")
}

// TestGetTopStateAdders_Integration tests the actual implementation against real Xatu ClickHouse
// Run with: go test -tags=integration -v ./pkg/server/internal/service/state_analytics/...
func TestGetTopStateAdders_Integration(t *testing.T) {
	// This test requires real ClickHouse access
	dsn := "https://efstateless:1f614ba2-bb5c-4fcf-ae8a-d25563290942@clickhouse.xatu.ethpandaops.io:443/default"

	// Create logger
	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	// Create noop metrics for testing
	metricsSvc := metrics.NewNopMetrics("test", log)

	// Create ClickHouse config
	chConfig := &clickhouse.Config{
		DSN: dsn,
		ConnectionConfig: clickhouse.ConnectionConfig{
			MaxOpenConns:       5,
			MaxIdleConns:       2,
			ConnMaxLifetime:    time.Hour,
			DialTimeout:        10 * time.Second,
			ReadTimeout:        30 * time.Second,
			WriteTimeout:       10 * time.Second,
			MaxExecutionTime:   60,
			InsecureSkipVerify: false,
		},
	}

	// Test on holesky (smaller dataset, faster queries)
	network := "holesky"

	// Create service config
	serviceConfig := &Config{
		NetworkConfigs: map[string]*NetworkConfig{
			network: {
				Enabled:    true,
				ClickHouse: chConfig,
			},
		},
	}

	// Create the service
	svc, err := New(log, serviceConfig, metricsSvc)
	require.NoError(t, err, "Failed to create service")

	// Start the service
	ctx := context.Background()
	err = svc.Start(ctx)
	require.NoError(t, err, "Failed to start service")
	defer svc.Stop()

	// Test different periods
	tests := []struct {
		name   string
		period pb.GetTopStateAddersRequest_Period
		limit  uint32
	}{
		{
			name:   "24 hours - top 10",
			period: pb.GetTopStateAddersRequest_PERIOD_24H,
			limit:  10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			req := &pb.GetTopStateAddersRequest{
				Period: tt.period,
				Limit:  tt.limit,
			}

			// Add network to context via gRPC metadata
			md := metadata.Pairs("network", network)
			ctxWithNetwork := metadata.NewIncomingContext(ctx, md)

			// Call the method
			resp, err := svc.GetTopStateAdders(ctxWithNetwork, req)
			require.NoError(t, err, "GetTopStateAdders failed")
			require.NotNil(t, resp, "Response should not be nil")

			// Validate response
			t.Logf("✅ GetTopStateAdders Response:")
			t.Logf("  Period: %s", tt.period.String())
			t.Logf("  Start Block: %d", resp.StartBlock)
			t.Logf("  End Block: %d", resp.EndBlock)
			t.Logf("  Block Range: %d blocks", resp.EndBlock-resp.StartBlock)
			t.Logf("  Top Adders: %d contracts", len(resp.Adders))

			// Basic validations
			require.GreaterOrEqual(t, resp.EndBlock, resp.StartBlock, "End block should be >= start block")
			require.LessOrEqual(t, len(resp.Adders), int(tt.limit), "Should not exceed requested limit")

			// Print top adders
			for i, adder := range resp.Adders {
				if i >= 5 {
					break // Only print top 5
				}
				t.Logf("    [%d] %s:", adder.Rank, adder.Address)
				t.Logf("        Slots Added: %d", adder.SlotsAdded)
				t.Logf("        Bytes Added: %d (%.2f MB)", adder.EstimatedBytesAdded, float64(adder.EstimatedBytesAdded)/(1024*1024))
				t.Logf("        Percentage: %.2f%%", adder.PercentageOfTotal)
			}

			// Validate data consistency
			if len(resp.Adders) > 0 {
				// Check ranks are sequential
				for i, adder := range resp.Adders {
					require.Equal(t, uint32(i+1), adder.Rank, "Ranks should be sequential")
				}

				// Check slots are in descending order
				for i := 1; i < len(resp.Adders); i++ {
					require.GreaterOrEqual(t, resp.Adders[i-1].SlotsAdded, resp.Adders[i].SlotsAdded,
						"Slots should be in descending order")
				}

				// Validate byte calculations
				for _, adder := range resp.Adders {
					expectedBytes := adder.SlotsAdded * BytesPerSlot
					require.Equal(t, expectedBytes, adder.EstimatedBytesAdded,
						"Bytes calculation incorrect for %s", adder.Address)
				}
			}

			t.Log("✅ Integration test passed!")
		})
	}
}

// TestGetTopStateRemovers_Integration tests the actual implementation against real Xatu ClickHouse
// Run with: go test -tags=integration -v ./pkg/server/internal/service/state_analytics/...
func TestGetTopStateRemovers_Integration(t *testing.T) {
	// This test requires real ClickHouse access
	dsn := "https://efstateless:1f614ba2-bb5c-4fcf-ae8a-d25563290942@clickhouse.xatu.ethpandaops.io:443/default"

	// Create logger
	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	// Create noop metrics for testing
	metricsSvc := metrics.NewNopMetrics("test", log)

	// Create ClickHouse config
	chConfig := &clickhouse.Config{
		DSN: dsn,
		ConnectionConfig: clickhouse.ConnectionConfig{
			MaxOpenConns:       5,
			MaxIdleConns:       2,
			ConnMaxLifetime:    time.Hour,
			DialTimeout:        10 * time.Second,
			ReadTimeout:        30 * time.Second,
			WriteTimeout:       10 * time.Second,
			MaxExecutionTime:   60,
			InsecureSkipVerify: false,
		},
	}

	// Test on holesky (smaller dataset, faster queries)
	network := "holesky"

	// Create service config
	serviceConfig := &Config{
		NetworkConfigs: map[string]*NetworkConfig{
			network: {
				Enabled:    true,
				ClickHouse: chConfig,
			},
		},
	}

	// Create the service
	svc, err := New(log, serviceConfig, metricsSvc)
	require.NoError(t, err, "Failed to create service")

	// Start the service
	ctx := context.Background()
	err = svc.Start(ctx)
	require.NoError(t, err, "Failed to start service")
	defer svc.Stop()

	// Test 24 hour period
	req := &pb.GetTopStateRemoversRequest{
		Period: pb.GetTopStateRemoversRequest_PERIOD_24H,
		Limit:  10,
	}

	// Add network to context via gRPC metadata
	md := metadata.Pairs("network", network)
	ctxWithNetwork := metadata.NewIncomingContext(ctx, md)

	// Call the method
	resp, err := svc.GetTopStateRemovers(ctxWithNetwork, req)
	require.NoError(t, err, "GetTopStateRemovers failed")
	require.NotNil(t, resp, "Response should not be nil")

	// Validate response
	t.Logf("✅ GetTopStateRemovers Response:")
	t.Logf("  Period: PERIOD_24H")
	t.Logf("  Start Block: %d", resp.StartBlock)
	t.Logf("  End Block: %d", resp.EndBlock)
	t.Logf("  Block Range: %d blocks", resp.EndBlock-resp.StartBlock)
	t.Logf("  Top Removers: %d contracts", len(resp.Removers))

	// Basic validations
	require.GreaterOrEqual(t, resp.EndBlock, resp.StartBlock, "End block should be >= start block")
	require.LessOrEqual(t, len(resp.Removers), 10, "Should not exceed requested limit")

	// Print top removers
	for i, remover := range resp.Removers {
		if i >= 5 {
			break // Only print top 5
		}
		t.Logf("    [%d] %s:", remover.Rank, remover.Address)
		t.Logf("        Slots Cleared: %d", remover.SlotsCleared)
		t.Logf("        Bytes Freed: %d (%.2f KB)", remover.EstimatedBytesFreed, float64(remover.EstimatedBytesFreed)/1024)
		t.Logf("        Est. Gas Refund: %d gas", remover.EstimatedGasRefund)
		t.Logf("        Percentage: %.2f%%", remover.PercentageOfTotal)
	}

	// Validate data consistency
	if len(resp.Removers) > 0 {
		// Check ranks are sequential
		for i, remover := range resp.Removers {
			require.Equal(t, uint32(i+1), remover.Rank, "Ranks should be sequential")
		}

		// Check slots are in descending order
		for i := 1; i < len(resp.Removers); i++ {
			require.GreaterOrEqual(t, resp.Removers[i-1].SlotsCleared, resp.Removers[i].SlotsCleared,
				"Slots should be in descending order")
		}

		// Validate byte calculations
		for _, remover := range resp.Removers {
			expectedBytes := remover.SlotsCleared * BytesPerSlot
			require.Equal(t, expectedBytes, remover.EstimatedBytesFreed,
				"Bytes calculation incorrect for %s", remover.Address)
		}

		// Validate gas refund calculations
		for _, remover := range resp.Removers {
			expectedGasRefund := remover.SlotsCleared * 15000
			require.Equal(t, expectedGasRefund, remover.EstimatedGasRefund,
				"Gas refund calculation incorrect for %s", remover.Address)
		}
	}

	t.Log("✅ Integration test passed!")
}

// TestGetStateGrowthChart_Integration tests the actual implementation against real Xatu ClickHouse
// Run with: go test -tags=integration -v ./pkg/server/internal/service/state_analytics/...
func TestGetStateGrowthChart_Integration(t *testing.T) {
	// This test requires real ClickHouse access
	dsn := "https://efstateless:1f614ba2-bb5c-4fcf-ae8a-d25563290942@clickhouse.xatu.ethpandaops.io:443/default"

	// Create logger
	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	// Create noop metrics for testing
	metricsSvc := metrics.NewNopMetrics("test", log)

	// Create ClickHouse config
	chConfig := &clickhouse.Config{
		DSN: dsn,
		ConnectionConfig: clickhouse.ConnectionConfig{
			MaxOpenConns:       5,
			MaxIdleConns:       2,
			ConnMaxLifetime:    time.Hour,
			DialTimeout:        10 * time.Second,
			ReadTimeout:        30 * time.Second,
			WriteTimeout:       10 * time.Second,
			MaxExecutionTime:   60,
			InsecureSkipVerify: false,
		},
	}

	// Test on holesky (smaller dataset, faster queries)
	network := "holesky"

	// Create service config
	serviceConfig := &Config{
		NetworkConfigs: map[string]*NetworkConfig{
			network: {
				Enabled:    true,
				ClickHouse: chConfig,
			},
		},
	}

	// Create the service
	svc, err := New(log, serviceConfig, metricsSvc)
	require.NoError(t, err, "Failed to create service")

	// Start the service
	ctx := context.Background()
	err = svc.Start(ctx)
	require.NoError(t, err, "Failed to start service")
	defer svc.Stop()

	// Test 24h period with hourly granularity
	req := &pb.GetStateGrowthChartRequest{
		Period:      pb.GetStateGrowthChartRequest_PERIOD_24H,
		Granularity: pb.GetStateGrowthChartRequest_GRANULARITY_HOUR,
	}

	// Add network to context via gRPC metadata
	md := metadata.Pairs("network", network)
	ctxWithNetwork := metadata.NewIncomingContext(ctx, md)

	// Call the method
	resp, err := svc.GetStateGrowthChart(ctxWithNetwork, req)
	require.NoError(t, err, "GetStateGrowthChart failed")
	require.NotNil(t, resp, "Response should not be nil")

	// Validate response
	t.Logf("✅ GetStateGrowthChart Response:")
	t.Logf("  Period: PERIOD_24H")
	t.Logf("  Granularity: GRANULARITY_HOUR")
	t.Logf("  Data Points: %d", len(resp.DataPoints))

	// Validate summary
	require.NotNil(t, resp.Summary, "Summary should not be nil")
	t.Logf("  Summary:")
	t.Logf("    Total Slots Added: %d", resp.Summary.TotalSlotsAdded)
	t.Logf("    Total Slots Cleared: %d", resp.Summary.TotalSlotsCleared)
	t.Logf("    Net Slots: %d", resp.Summary.NetSlots)
	t.Logf("    Total Bytes Added: %d (%.2f MB)", resp.Summary.TotalBytesAdded, float64(resp.Summary.TotalBytesAdded)/(1024*1024))
	t.Logf("    Total Bytes Cleared: %d (%.2f MB)", resp.Summary.TotalBytesCleared, float64(resp.Summary.TotalBytesCleared)/(1024*1024))
	t.Logf("    Net Bytes: %d (%.2f MB)", resp.Summary.NetBytes, float64(resp.Summary.NetBytes)/(1024*1024))
	t.Logf("    Avg Slots Per Data Point: %.2f", resp.Summary.AvgSlotsPerBlock)

	// Basic validations
	require.Greater(t, len(resp.DataPoints), 0, "Should have data points")

	// Print first few data points
	t.Logf("  Sample Data Points:")
	for i, dp := range resp.DataPoints {
		if i >= 3 {
			break // Only print first 3
		}
		t.Logf("    [%d] Block %d @ %s:", i+1, dp.BlockNumber, dp.Timestamp.AsTime().Format(time.RFC3339))
		t.Logf("        Slots: +%d -%d = %d", dp.SlotsAdded, dp.SlotsCleared, dp.NetSlots)
		t.Logf("        Bytes: +%d -%d = %d", dp.BytesAdded, dp.BytesCleared, dp.NetBytes)
	}

	// Validate data consistency
	if len(resp.DataPoints) > 0 {
		// Verify timestamps are in order
		for i := 1; i < len(resp.DataPoints); i++ {
			require.True(t, resp.DataPoints[i].Timestamp.AsTime().After(resp.DataPoints[i-1].Timestamp.AsTime()),
				"Timestamps should be in ascending order")
		}

		// Validate byte calculations
		for _, dp := range resp.DataPoints {
			expectedBytesAdded := dp.SlotsAdded * BytesPerSlot
			require.Equal(t, expectedBytesAdded, dp.BytesAdded, "Bytes added calculation incorrect")

			expectedBytesCleared := dp.SlotsCleared * BytesPerSlot
			require.Equal(t, expectedBytesCleared, dp.BytesCleared, "Bytes cleared calculation incorrect")

			expectedNetBytes := int64(dp.SlotsAdded)*BytesPerSlot - int64(dp.SlotsCleared)*BytesPerSlot
			require.Equal(t, expectedNetBytes, dp.NetBytes, "Net bytes calculation incorrect")
		}

		// Validate summary totals match sum of data points
		var sumSlotsAdded, sumSlotsCleared uint64
		for _, dp := range resp.DataPoints {
			sumSlotsAdded += dp.SlotsAdded
			sumSlotsCleared += dp.SlotsCleared
		}
		require.Equal(t, sumSlotsAdded, resp.Summary.TotalSlotsAdded, "Summary slots added should match sum")
		require.Equal(t, sumSlotsCleared, resp.Summary.TotalSlotsCleared, "Summary slots cleared should match sum")

		// Validate summary net calculation
		expectedNetSlots := int64(resp.Summary.TotalSlotsAdded) - int64(resp.Summary.TotalSlotsCleared)
		require.Equal(t, expectedNetSlots, resp.Summary.NetSlots, "Summary net slots incorrect")

		expectedNetBytes := int64(resp.Summary.TotalBytesAdded) - int64(resp.Summary.TotalBytesCleared)
		require.Equal(t, expectedNetBytes, resp.Summary.NetBytes, "Summary net bytes incorrect")
	}

	t.Log("✅ Integration test passed!")
}
