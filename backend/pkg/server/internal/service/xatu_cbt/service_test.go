package xatu_cbt_test

import (
	"context"
	"testing"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/metadata"
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

func TestListIntXatuNodes24HValidation(t *testing.T) {
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

	// Test ListIntXatuNodes24H with missing network metadata
	req := &cbtproto.ListIntXatuNodes24HRequest{
		MetaClientName: &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Like{
				Like: "%",
			},
		},
	}
	resp, err := svc.ListIntXatuNodes24H(ctx, req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "failed to extract network from metadata")

	// Test ListIntXatuNodes24H with non-existent network
	md := metadata.New(map[string]string{"network": "nonexistent"})
	ctxWithMeta := metadata.NewIncomingContext(ctx, md)
	resp, err = svc.ListIntXatuNodes24H(ctxWithMeta, req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "network nonexistent not configured")
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
