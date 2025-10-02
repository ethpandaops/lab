package xatu_cbt_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/docker/go-connections/nat"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
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
			svc, err := xatu_cbt.New(logger, tt.config, metricsSvc, nil, nil)
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
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	metricsSvc := metrics.NewMetricsService("test", logger)

	// Start ClickHouse container for testing
	host, port, cleanup := setupClickHouseContainer(t, ctx)
	defer cleanup()

	config := &xatu_cbt.Config{
		MaxQueryLimit: 1000,
		DefaultLimit:  100,
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"test": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: fmt.Sprintf("http://default:password@%s:%s/test", host, port),
				},
			},
		},
	}

	svc, err := xatu_cbt.New(logger, config, metricsSvc, nil, nil)
	require.NoError(t, err)
	require.NotNil(t, svc)

	// Test Start
	err = svc.Start(ctx)
	assert.NoError(t, err)

	// Test Stop
	err = svc.Stop()
	assert.NoError(t, err)
}

func TestListFctNodeActiveLast24hValidation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	metricsSvc := metrics.NewMetricsService("test", logger)

	// Start ClickHouse container for testing
	host, port, cleanup := setupClickHouseContainer(t, ctx)
	defer cleanup()

	config := &xatu_cbt.Config{
		MaxQueryLimit: 1000,
		DefaultLimit:  100,
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"test": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: fmt.Sprintf("http://default:password@%s:%s/test", host, port),
				},
			},
		},
	}

	svc, err := xatu_cbt.New(logger, config, metricsSvc, nil, nil)
	require.NoError(t, err)
	require.NotNil(t, svc)

	err = svc.Start(ctx)
	require.NoError(t, err)

	defer func() { _ = svc.Stop() }()

	// Test ListFctNodeActiveLast24h with missing network metadata
	req := &cbtproto.ListFctNodeActiveLast24HRequest{
		MetaClientName: &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Like{
				Like: "%",
			},
		},
	}
	resp, err := svc.ListFctNodeActiveLast24h(ctx, req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "failed to extract network from metadata")

	// Test ListFctNodeActiveLast24h with non-existent network
	md := metadata.New(map[string]string{"network": "nonexistent"})
	ctxWithMeta := metadata.NewIncomingContext(ctx, md)
	resp, err = svc.ListFctNodeActiveLast24h(ctxWithMeta, req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "network nonexistent not configured")
}

// setupClickHouseContainer starts a ClickHouse container for testing and returns connection details
func setupClickHouseContainer(t *testing.T, ctx context.Context) (string, string, func()) {
	t.Helper()

	clickhousePort := "8123/tcp"
	req := testcontainers.ContainerRequest{
		Image:        "clickhouse/clickhouse-server:25.6.3.116",
		ExposedPorts: []string{clickhousePort},
		Env: map[string]string{
			"CLICKHOUSE_USER":     "default",
			"CLICKHOUSE_PASSWORD": "password",
			"CLICKHOUSE_DB":       "test",
		},
		WaitingFor: wait.ForHTTP("/ping").WithPort(nat.Port(clickhousePort)),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Skipf("Could not start ClickHouse container: %v", err)
	}

	host, err := container.Host(ctx)
	if err != nil {
		container.Terminate(ctx)
		t.Fatalf("Failed to get container host: %v", err)
	}

	mappedPort, err := container.MappedPort(ctx, nat.Port(clickhousePort))
	if err != nil {
		container.Terminate(ctx)
		t.Fatalf("Failed to get container port: %v", err)
	}

	cleanup := func() {
		if err := container.Terminate(ctx); err != nil {
			t.Logf("Failed to terminate container: %s", err)
		}
	}

	// Wait a moment for ClickHouse to be fully ready
	time.Sleep(2 * time.Second)

	return host, mappedPort.Port(), cleanup
}

func TestConfigDefaults(t *testing.T) {
	config := &xatu_cbt.Config{
		NetworkConfigs: map[string]*xatu_cbt.NetworkConfig{
			"test": {
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
}
