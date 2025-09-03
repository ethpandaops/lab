package xatu_cbt_test

import (
	"context"
	"testing"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	metricsSvc := metrics.NewMetricsService("test", logger)

	tests := []struct {
		name      string
		config    *xatu_cbt.Config
		wantErr   bool
		errMsg    string
		wantValid bool
	}{
		{
			name: "valid config",
			config: &xatu_cbt.Config{
				CacheTTL:      60 * time.Second,
				MaxQueryLimit: 1000,
				DefaultLimit:  100,
				NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
					"mainnet": {
						Enabled: true,
						ClickHouse: &clickhouse.Config{
							DSN: "http://localhost:8123/default",
						},
					},
				},
			},
			wantErr:   false,
			wantValid: true,
		},
		{
			name: "invalid config - no networks",
			config: &xatu_cbt.Config{
				NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{},
			},
			wantErr: true,
			errMsg:  "at least one network must be configured",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, err := xatu_cbt.New(logger, tt.config, nil, metricsSvc)
			if tt.wantErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
				assert.Nil(t, svc)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, svc)
				assert.Equal(t, "xatu_cbt", svc.Name())
			}
		})
	}
}

func TestServiceLifecycle(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	metricsSvc := metrics.NewMetricsService("test", logger)

	config := &xatu_cbt.Config{
		CacheTTL:      60 * time.Second,
		MaxQueryLimit: 1000,
		DefaultLimit:  100,
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"mainnet": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: "http://localhost:8123/default",
				},
			},
		},
	}

	svc, err := xatu_cbt.New(logger, config, nil, metricsSvc)
	require.NoError(t, err)
	require.NotNil(t, svc)

	ctx := context.Background()

	// Test Start
	err = svc.Start(ctx)
	assert.NoError(t, err)

	// Test Stop
	err = svc.Stop()
	assert.NoError(t, err)
}

func TestListNetworks(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	metricsSvc := metrics.NewMetricsService("test", logger)

	config := &xatu_cbt.Config{
		CacheTTL:      60 * time.Second,
		MaxQueryLimit: 1000,
		DefaultLimit:  100,
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"mainnet": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: "http://localhost:8123/default",
				},
			},
			"sepolia": {
				Enabled: false,
				ClickHouse: &clickhouse.Config{
					DSN: "http://localhost:8123/default",
				},
			},
		},
	}

	svc, err := xatu_cbt.New(logger, config, nil, metricsSvc)
	require.NoError(t, err)
	require.NotNil(t, svc)

	ctx := context.Background()
	err = svc.Start(ctx)
	require.NoError(t, err)

	defer func() { _ = svc.Stop() }()

	// Test ListNetworks
	req := &pb.ListNetworksRequest{}
	resp, err := svc.ListNetworks(ctx, req)
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.NotNil(t, resp.Networks)
	assert.Len(t, resp.Networks, 1) // Only mainnet should be active
	assert.Equal(t, "mainnet", resp.Networks[0].Name)
	assert.True(t, resp.Networks[0].Enabled)
}

func TestListXatuNodesValidation(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	metricsSvc := metrics.NewMetricsService("test", logger)

	config := &xatu_cbt.Config{
		CacheTTL:      60 * time.Second,
		MaxQueryLimit: 1000,
		DefaultLimit:  100,
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"mainnet": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: "http://localhost:8123/default",
				},
			},
		},
	}

	svc, err := xatu_cbt.New(logger, config, nil, metricsSvc)
	require.NoError(t, err)
	require.NotNil(t, svc)

	ctx := context.Background()
	err = svc.Start(ctx)
	require.NoError(t, err)

	defer func() { _ = svc.Stop() }()

	// Test ListXatuNodes with empty network
	req := &pb.ListXatuNodesRequest{
		Network: "",
	}
	resp, err := svc.ListXatuNodes(ctx, req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "network is required")

	// Test ListXatuNodes with non-existent network
	req = &pb.ListXatuNodesRequest{
		Network: "nonexistent",
	}
	resp, err = svc.ListXatuNodes(ctx, req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "network nonexistent not configured")
}

func TestCacheIntegration(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	metricsSvc := metrics.NewMetricsService("test", logger)

	// Create a mock cache client
	cacheClient := cache.NewMemory(cache.MemoryConfig{DefaultTTL: 60 * time.Second}, metricsSvc)

	config := &xatu_cbt.Config{
		CacheTTL:      60 * time.Second,
		MaxQueryLimit: 1000,
		DefaultLimit:  100,
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"mainnet": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: "http://localhost:8123/default",
				},
			},
		},
	}

	svc, err := xatu_cbt.New(logger, config, cacheClient, metricsSvc)
	require.NoError(t, err)
	require.NotNil(t, svc)

	ctx := context.Background()
	err = svc.Start(ctx)
	require.NoError(t, err)

	defer func() { _ = svc.Stop() }()

	// The service will have cache integration
	// Further testing would require actual data in ClickHouse
}

func TestConfigDefaults(t *testing.T) {
	config := &xatu_cbt.Config{
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"mainnet": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: "http://localhost:8123/default",
				},
			},
		},
	}

	err := config.Validate()
	require.NoError(t, err)

	// Check defaults were applied
	assert.Equal(t, uint64(1000), config.MaxQueryLimit)
	assert.Equal(t, uint64(100), config.DefaultLimit)
	assert.Equal(t, 60*time.Second, config.CacheTTL)
}
