package clickhouse_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/docker/go-connections/nat"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

// TestClickHouseIntegration tests the ClickHouse client against a real ClickHouse instance
// started via testcontainers.
func TestClickHouseIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Define the ClickHouse container
	clickhousePort := "8123/tcp"
	req := testcontainers.ContainerRequest{
		Image:        "clickhouse/clickhouse-server:latest",
		ExposedPorts: []string{clickhousePort},
		Env: map[string]string{
			"CLICKHOUSE_USER":     "default",
			"CLICKHOUSE_PASSWORD": "password",
			"CLICKHOUSE_DB":       "test",
		},
		WaitingFor: wait.ForHTTP("/ping").WithPort(nat.Port(clickhousePort)),
	}

	// Start the container
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	require.NoError(t, err, "Failed to start ClickHouse container")
	defer func() {
		if err := container.Terminate(ctx); err != nil {
			t.Logf("Failed to terminate container: %s", err)
		}
	}()

	// Get the container's host and port
	host, err := container.Host(ctx)
	require.NoError(t, err, "Failed to get container host")

	port, err := container.MappedPort(ctx, nat.Port(clickhousePort))
	require.NoError(t, err, "Failed to get container port")

	// Create a DSN for the ClickHouse container
	dsn := fmt.Sprintf("clickhouse+http://default:password@%s:%s/test", host, port.Port())

	// Create the ClickHouse client
	config := &clickhouse.Config{
		DSN: dsn,
	}

	// Create a metrics service for the main test
	metricsSvc := metrics.NewMetricsService("test", logger)

	t.Run("TestNewClient", func(t *testing.T) {
		testNewClient(t, config, logger)
	})

	t.Run("TestClientBeforeStart", func(t *testing.T) {
		testClientBeforeStart(t, ctx, config, logger)
	})

	t.Run("TestDSNVariations", func(t *testing.T) {
		testDSNVariations(t, ctx, host, port.Port(), logger)
	})

	t.Run("TestWithMetrics", func(t *testing.T) {
		testWithMetrics(t, ctx, config, logger)
	})

	// Initialize client for subsequent tests
	client, err := clickhouse.New(config, logger, "test", metricsSvc)
	require.NoError(t, err, "Failed to create client")
	require.NoError(t, client.Start(ctx), "Failed to start client")
	defer func() { _ = client.Stop() }()

	// Run all test suites
	t.Run("TestExec", func(t *testing.T) {
		testExec(t, ctx, client)
	})

	t.Run("TestQuery", func(t *testing.T) {
		testQuery(t, ctx, client)
	})

	t.Run("TestQueryRow", func(t *testing.T) {
		testQueryRow(t, ctx, client)
	})

	t.Run("TestDataTypes", func(t *testing.T) {
		testDataTypes(t, ctx, client)
	})

	t.Run("TestClientAfterStop", func(t *testing.T) {
		testClientAfterStop(t, ctx, config, logger)
	})
}

// testDSNVariations tests different DSN formats and connection options
func testDSNVariations(t *testing.T, ctx context.Context, host, port string, logger logrus.FieldLogger) {
	// Create metrics service for the test
	metricsSvc := metrics.NewMetricsService("test", logger)

	testCases := []struct {
		name               string
		dsn                string
		insecureSkipVerify bool
		shouldSucceed      bool
	}{
		{
			name:          "Standard HTTP DSN",
			dsn:           fmt.Sprintf("clickhouse+http://default:password@%s:%s/test", host, port),
			shouldSucceed: true,
		},
		{
			name:          "HTTP DSN with Additional Parameters",
			dsn:           fmt.Sprintf("clickhouse+http://default:password@%s:%s/test?timeout=30s", host, port),
			shouldSucceed: true,
		},
		{
			name:          "HTTP DSN with No Database",
			dsn:           fmt.Sprintf("clickhouse+http://default:password@%s:%s", host, port),
			shouldSucceed: true,
		},
		{
			name:               "HTTP DSN with InsecureSkipVerify",
			dsn:                fmt.Sprintf("clickhouse+http://default:password@%s:%s/test", host, port),
			insecureSkipVerify: true,
			// InsecureSkipVerify is ignored for HTTP connections (no TLS to skip)
			shouldSucceed: true,
		},
		{
			name:          "HTTP DSN without clickhouse+ Prefix",
			dsn:           fmt.Sprintf("http://default:password@%s:%s/test", host, port),
			shouldSucceed: true,
		},
		{
			name:          "HTTPS DSN",
			dsn:           fmt.Sprintf("clickhouse+https://default:password@%s:%s/test", host, port),
			shouldSucceed: false, // Should fail as we're not using HTTPS in test container
		},
		{
			name:          "Invalid DSN with wrong credentials",
			dsn:           fmt.Sprintf("clickhouse+http://wrong:wrong@%s:%s/test", host, port),
			shouldSucceed: false,
		},
		{
			name:          "Invalid DSN with wrong format",
			dsn:           fmt.Sprintf("invalid://%s:%s", host, port),
			shouldSucceed: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			config := &clickhouse.Config{
				DSN: tc.dsn,
				ConnectionConfig: clickhouse.ConnectionConfig{
					InsecureSkipVerify: tc.insecureSkipVerify,
				},
			}

			client, err := clickhouse.New(config, logger, "test", metricsSvc)
			require.NoError(t, err, "New should not return error even with invalid DSN")

			err = client.Start(ctx)
			if tc.shouldSucceed {
				assert.NoError(t, err, "Start should succeed for valid DSN")
				if err == nil {
					// Only try queries if Start succeeded
					_, err = client.Query(ctx, "SELECT 1")
					assert.NoError(t, err, "Query should succeed after successful Start")

					// Clean up
					_ = client.Stop()
				}
			} else {
				assert.Error(t, err, "Start should fail for invalid DSN")
			}
		})
	}
}

func testNewClient(t *testing.T, config *clickhouse.Config, logger logrus.FieldLogger) {
	// Create a metrics service
	metricsSvc := metrics.NewMetricsService("test", logger)

	// Test with valid config
	client, err := clickhouse.New(config, logger, "test", metricsSvc)
	assert.NoError(t, err, "Should create client with valid config")
	assert.NotNil(t, client, "Client should not be nil")

	// Test with invalid config
	invalidConfig := &clickhouse.Config{
		DSN: "",
	}
	client, err = clickhouse.New(invalidConfig, logger, "test", metricsSvc)
	assert.Error(t, err, "Should return error with invalid config")
	assert.Nil(t, client, "Client should be nil with invalid config")
}

func testClientBeforeStart(t *testing.T, ctx context.Context, config *clickhouse.Config, logger logrus.FieldLogger) {
	// Create a metrics service
	metricsSvc := metrics.NewMetricsService("test", logger)

	// Create client but don't start it
	client, err := clickhouse.New(config, logger, "test", metricsSvc)
	require.NoError(t, err)

	// All operations should fail before Start()
	_, err = client.Query(ctx, "SELECT 1")
	assert.Error(t, err, "Query should fail before Start()")
	assert.Contains(t, err.Error(), "connection is nil")

	_, err = client.QueryRow(ctx, "SELECT 1")
	assert.Error(t, err, "QueryRow should fail before Start()")

	err = client.Exec(ctx, "SELECT 1")
	assert.Error(t, err, "Exec should fail before Start()")
	assert.Contains(t, err.Error(), "connection is nil")

	// Stop should work even if not started (it's idempotent)
	err = client.Stop()
	assert.NoError(t, err, "Stop should not error even if client was not started")
}

func testClientAfterStop(t *testing.T, ctx context.Context, config *clickhouse.Config, logger logrus.FieldLogger) {
	// Create a metrics service
	metricsSvc := metrics.NewMetricsService("test", logger)

	// Create and start client
	client, err := clickhouse.New(config, logger, "test", metricsSvc)
	require.NoError(t, err)
	require.NoError(t, client.Start(ctx))

	// Stop client
	require.NoError(t, client.Stop())

	// All operations should fail after Stop()
	_, err = client.Query(ctx, "SELECT 1")
	assert.Error(t, err, "Query should fail after Stop()")
	assert.Contains(t, err.Error(), "database is closed", "Error should mention database is closed")

	_, err = client.QueryRow(ctx, "SELECT 1")
	assert.Error(t, err, "QueryRow should fail after Stop()")

	err = client.Exec(ctx, "SELECT 1")
	assert.Error(t, err, "Exec should fail after Stop()")
	assert.Contains(t, err.Error(), "database is closed", "Error should mention database is closed")

	// Second Stop should be idempotent
	err = client.Stop()
	assert.NoError(t, err, "Second Stop should not error")
}

func testExec(t *testing.T, ctx context.Context, client clickhouse.Client) {
	// Create a test table
	err := client.Exec(ctx, "CREATE TABLE IF NOT EXISTS test_exec (id UInt32, name String) ENGINE = Memory")
	assert.NoError(t, err, "Should create table without error")

	// Insert data
	err = client.Exec(ctx, "INSERT INTO test_exec (id, name) VALUES (?, ?)", uint32(1), "test1")
	assert.NoError(t, err, "Should insert data without error")

	// Insert multiple rows
	err = client.Exec(ctx, "INSERT INTO test_exec (id, name) VALUES (?, ?), (?, ?)",
		uint32(2), "test2", uint32(3), "test3")
	assert.NoError(t, err, "Should insert multiple rows without error")

	// Test with invalid query
	err = client.Exec(ctx, "INSERT INTO non_existent_table VALUES (1)")
	assert.Error(t, err, "Should return error with invalid query")

	// Clean up
	err = client.Exec(ctx, "DROP TABLE test_exec")
	assert.NoError(t, err, "Should drop table without error")
}

func testQuery(t *testing.T, ctx context.Context, client clickhouse.Client) {
	// Create a test table
	err := client.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS test_query (
			id UInt32,
			name String,
			created_at DateTime
		) ENGINE = Memory
	`)
	assert.NoError(t, err, "Should create table without error")

	// Insert test data
	now := time.Now().Round(time.Second)
	err = client.Exec(ctx, `
		INSERT INTO test_query (id, name, created_at)
		VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
	`,
		uint32(1), "row1", now,
		uint32(2), "row2", now.Add(-1*time.Hour),
		uint32(3), "row3", now.Add(-2*time.Hour),
	)
	assert.NoError(t, err, "Should insert data without error")

	// Test basic query
	rows, err := client.Query(ctx, "SELECT * FROM test_query ORDER BY id")
	assert.NoError(t, err, "Should query without error")
	assert.Equal(t, 3, len(rows), "Should return 3 rows")

	// Verify first row
	assert.Equal(t, uint32(1), rows[0]["id"], "First row id should be 1")
	assert.Equal(t, "row1", rows[0]["name"], "First row name should be 'row1'")

	// Test query with filter
	rows, err = client.Query(ctx, "SELECT * FROM test_query WHERE id > ? ORDER BY id", uint32(1))
	assert.NoError(t, err, "Should query with filter without error")
	assert.Equal(t, 2, len(rows), "Should return 2 rows")
	assert.Equal(t, uint32(2), rows[0]["id"], "First row id should be 2")
	assert.Equal(t, uint32(3), rows[1]["id"], "Second row id should be 3")

	// Test query with no results
	rows, err = client.Query(ctx, "SELECT * FROM test_query WHERE id > ?", uint32(100))
	assert.NoError(t, err, "Should execute query with no results without error")
	assert.Equal(t, 0, len(rows), "Should return 0 rows")

	// Test with invalid query
	rows, err = client.Query(ctx, "SELECT * FROM non_existent_table")
	assert.Error(t, err, "Should return error with invalid query")
	assert.Nil(t, rows, "Rows should be nil with invalid query")

	// Clean up
	err = client.Exec(ctx, "DROP TABLE test_query")
	assert.NoError(t, err, "Should drop table without error")
}

func testQueryRow(t *testing.T, ctx context.Context, client clickhouse.Client) {
	// Create a test table
	err := client.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS test_query_row (
			id UInt32,
			name String
		) ENGINE = Memory
	`)
	assert.NoError(t, err, "Should create table without error")

	// Insert test data
	err = client.Exec(ctx, `
		INSERT INTO test_query_row (id, name)
		VALUES (?, ?), (?, ?)
	`,
		uint32(1), "test1",
		uint32(2), "test2",
	)
	assert.NoError(t, err, "Should insert data without error")

	// Test query row
	row, err := client.QueryRow(ctx, "SELECT * FROM test_query_row WHERE id = ?", uint32(1))
	assert.NoError(t, err, "Should query row without error")
	assert.NotNil(t, row, "Row should not be nil")
	assert.Equal(t, uint32(1), row["id"], "Row id should be 1")
	assert.Equal(t, "test1", row["name"], "Row name should be 'test1'")

	// Test query row with no results
	row, err = client.QueryRow(ctx, "SELECT * FROM test_query_row WHERE id = ?", uint32(100))
	assert.Error(t, err, "Should return error when no rows returned")
	assert.Nil(t, row, "Row should be nil when no rows returned")

	// Test with invalid query
	row, err = client.QueryRow(ctx, "SELECT * FROM non_existent_table")
	assert.Error(t, err, "Should return error with invalid query")
	assert.Nil(t, row, "Row should be nil with invalid query")

	// Clean up
	err = client.Exec(ctx, "DROP TABLE test_query_row")
	assert.NoError(t, err, "Should drop table without error")
}

// testDataTypes tests handling of various ClickHouse data types
func testDataTypes(t *testing.T, ctx context.Context, client clickhouse.Client) {
	// Create a test table with various data types
	err := client.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS test_data_types (
			int_val        Int32,
			uint_val       UInt32,
			float_val      Float64,
			string_val     String,
			date_val       Date,
			datetime_val   DateTime,
			bool_val       UInt8,  -- ClickHouse has no boolean type, use UInt8
			nullable_val   Nullable(String),
			array_int_val  Array(UInt32),
			decimal_val    Decimal(10, 2)
		) ENGINE = Memory
	`)
	assert.NoError(t, err, "Should create table without error")

	// Prepare test date/time values
	testDate := time.Now().Truncate(24 * time.Hour)
	testDateTime := time.Now().Truncate(time.Second)

	// Insert test data
	err = client.Exec(ctx, `
		INSERT INTO test_data_types (
			int_val, uint_val, float_val, string_val, 
			date_val, datetime_val, bool_val, nullable_val, 
			array_int_val, decimal_val
		) VALUES (
			?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?
		)
	`,
		int32(-42),        // int_val
		uint32(42),        // uint_val
		3.14159,           // float_val
		"hello",           // string_val
		testDate,          // date_val
		testDateTime,      // datetime_val
		uint8(1),          // bool_val (true)
		nil,               // nullable_val (NULL)
		"[1, 2, 3, 4, 5]", // array_int_val (array literal)
		"123.45",          // decimal_val
	)
	assert.NoError(t, err, "Should insert data without error")

	// Insert another row with different values
	err = client.Exec(ctx, `
		INSERT INTO test_data_types (
			int_val, uint_val, float_val, string_val, 
			date_val, datetime_val, bool_val, nullable_val, 
			array_int_val, decimal_val
		) VALUES (
			?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?
		)
	`,
		int32(100),                     // int_val
		uint32(200),                    // uint_val
		2.71828,                        // float_val
		"world",                        // string_val
		testDate.AddDate(0, 0, -1),     // date_val (yesterday)
		testDateTime.Add(-1*time.Hour), // datetime_val (1 hour ago)
		uint8(0),                       // bool_val (false)
		"not null",                     // nullable_val (not NULL)
		"[10, 20, 30]",                 // array_int_val
		"987.65",                       // decimal_val
	)
	assert.NoError(t, err, "Should insert second row without error")

	// Query the data
	rows, err := client.Query(ctx, "SELECT * FROM test_data_types ORDER BY uint_val")
	assert.NoError(t, err, "Should query without error")
	assert.Equal(t, 2, len(rows), "Should return 2 rows")

	// Verify first row
	assert.Equal(t, int32(-42), rows[0]["int_val"], "First row int_val should be -42")
	assert.Equal(t, uint32(42), rows[0]["uint_val"], "First row uint_val should be 42")
	rowFloatVal, ok := rows[0]["float_val"].(float64)
	assert.True(t, ok, "float_val should be convertible to float64")
	assert.InDelta(t, 3.14159, rowFloatVal, 0.00001, "First row float_val should be approximately 3.14159")
	assert.Equal(t, "hello", rows[0]["string_val"], "First row string_val should be 'hello'")

	// Note: date/time comparison might be tricky due to timezone/formatting differences
	// Depending on driver implementation, might need additional parsing

	assert.Equal(t, uint8(1), rows[0]["bool_val"], "First row bool_val should be 1 (true)")
	assert.Nil(t, rows[0]["nullable_val"], "First row nullable_val should be nil")

	// Verify second row
	assert.Equal(t, int32(100), rows[1]["int_val"], "Second row int_val should be 100")
	assert.Equal(t, uint32(200), rows[1]["uint_val"], "Second row uint_val should be 200")
	assert.InDelta(t, 2.71828, rows[1]["float_val"].(float64), 0.00001, "Second row float_val should be approximately 2.71828")
	assert.Equal(t, "world", rows[1]["string_val"], "Second row string_val should be 'world'")
	assert.Equal(t, uint8(0), rows[1]["bool_val"], "Second row bool_val should be 0 (false)")
	assert.Equal(t, "not null", rows[1]["nullable_val"], "Second row nullable_val should be 'not null'")

	// Test specific data type queries
	intVal, err := client.QueryRow(ctx, "SELECT int_val FROM test_data_types WHERE uint_val = ?", uint32(42))
	assert.NoError(t, err, "Should query int_val without error")
	assert.Equal(t, int32(-42), intVal["int_val"], "int_val should be -42")

	floatVal, err := client.QueryRow(ctx, "SELECT float_val FROM test_data_types WHERE string_val = ?", "world")
	assert.NoError(t, err, "Should query float_val without error")
	assert.InDelta(t, 2.71828, floatVal["float_val"].(float64), 0.00001, "float_val should be approximately 2.71828")

	// Test aggregate functions
	sumResult, err := client.QueryRow(ctx, "SELECT SUM(uint_val) as sum FROM test_data_types")
	assert.NoError(t, err, "Should query sum without error")
	assert.Equal(t, uint64(242), sumResult["sum"], "Sum should be 242") // 42 + 200 = 242

	// Clean up
	err = client.Exec(ctx, "DROP TABLE test_data_types")
	assert.NoError(t, err, "Should drop table without error")
}

// testWithMetrics tests the client with metrics integration
func testWithMetrics(t *testing.T, ctx context.Context, config *clickhouse.Config, logger logrus.FieldLogger) {
	metricsSvc := metrics.NewMetricsService("test", logger)

	// Create client with metrics
	client, err := clickhouse.New(config, logger, "test", metricsSvc)
	require.NoError(t, err, "Should create client with metrics")
	require.NoError(t, client.Start(ctx), "Should start client with metrics")
	defer func() { _ = client.Stop() }()

	// Perform operations that will be tracked by metrics
	_, err = client.Query(ctx, "SELECT 1")
	assert.NoError(t, err, "Query should succeed with metrics")

	err = client.Exec(ctx, "SELECT 1")
	assert.NoError(t, err, "Exec should succeed with metrics")

	_, err = client.QueryRow(ctx, "SELECT 1")
	assert.NoError(t, err, "QueryRow should succeed with metrics")
}
