package clickhouse

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"strings"
	"time"

	// Import the v1 driver (_ "github.com/ClickHouse/clickhouse-go")
	// The blank identifier is used because we only need its side effects (registering the driver).
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	_ "github.com/mailru/go-clickhouse/v2" // Import mailru driver for chhttp
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// Status constants for metrics
const (
	StatusError   = "error"
	StatusSuccess = "success"
)

// RowScanner interface for scanning database rows
type RowScanner interface {
	Scan(dest ...interface{}) error
}

// Client represents a ClickHouse client
type Client interface {
	Start(ctx context.Context) error
	Query(ctx context.Context, query string, args ...interface{}) ([]map[string]interface{}, error)
	QueryRow(ctx context.Context, query string, args ...interface{}) (map[string]interface{}, error)
	QueryWithScanner(ctx context.Context, query string, scanFunc func(RowScanner) error, args ...interface{}) error
	Exec(ctx context.Context, query string, args ...interface{}) error
	Network() string
	Stop() error
}

// client is an implementation of the Client interface
type client struct {
	conn    *sql.DB // Use standard database/sql connection pool
	log     logrus.FieldLogger
	ctx     context.Context //nolint:containedctx // context is used for clickhouse operations
	config  *Config
	network string

	// Metrics
	metrics           *metrics.Metrics
	collector         *metrics.Collector
	queriesTotal      *prometheus.CounterVec
	queryDuration     *prometheus.HistogramVec
	connectionStatus  *prometheus.GaugeVec
	connectionsActive *prometheus.GaugeVec
}

// New creates a new ClickHouse client
func New(
	config *Config,
	log logrus.FieldLogger,
	network string,
	metricsSvc *metrics.Metrics,
) (Client, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	if metricsSvc == nil {
		return nil, fmt.Errorf("metrics service is required")
	}

	log.Info("Initializing ClickHouse client")

	c := &client{
		log: log.WithFields(logrus.Fields{
			"module":  "clickhouse",
			"network": network,
		}),
		config:  config,
		metrics: metricsSvc,
		network: network,
	}

	// Handle optional metrics service parameter
	if err := c.initMetrics(); err != nil {
		return nil, fmt.Errorf("failed to initialize metrics: %w", err)
	}

	return c, nil
}

// initMetrics initializes Prometheus metrics for the ClickHouse client
func (c *client) initMetrics() error {
	// Create a collector for the clickhouse subsystem
	var err error

	c.collector = c.metrics.NewCollector("clickhouse")

	// Register metrics
	c.queriesTotal, err = c.collector.NewCounterVec(
		"queries_total",
		"Total number of ClickHouse queries executed",
		[]string{"query_type", "status"},
	)
	if err != nil {
		return fmt.Errorf("failed to create queries_total metric: %w", err)
	}

	c.queryDuration, err = c.collector.NewHistogramVec(
		"query_duration_seconds",
		"Duration of ClickHouse queries in seconds",
		[]string{"query_type"},
		prometheus.DefBuckets,
	)
	if err != nil {
		return fmt.Errorf("failed to create query_duration_seconds metric: %w", err)
	}

	c.connectionStatus, err = c.collector.NewGaugeVec(
		"connection_status",
		"Status of ClickHouse connection (1=connected, 0=disconnected)",
		[]string{"status"},
	)
	if err != nil {
		return fmt.Errorf("failed to create connection_status metric: %w", err)
	}

	c.connectionsActive, err = c.collector.NewGaugeVec(
		"connections_active",
		"Number of active ClickHouse connections",
		[]string{},
	)
	if err != nil {
		return fmt.Errorf("failed to create connections_active metric: %w", err)
	}

	return nil
}

func (c *client) Start(ctx context.Context) error {
	c.log.Info("Starting ClickHouse client using database/sql driver (v1)")

	// Store the context (can be used for PingContext, etc.)
	c.ctx = ctx

	// Prepare DSN: Convert custom "clickhouse+" prefix to standard http/https scheme.
	dsn := c.config.DSN
	originalDSN := dsn // Keep original for logging/reference

	if strings.HasPrefix(dsn, "clickhouse+https://") {
		dsn = strings.TrimPrefix(dsn, "clickhouse+") // Becomes https://...

		c.log.Info("Converted 'clickhouse+https://' prefix to standard 'https://'.")
	} else if strings.HasPrefix(dsn, "clickhouse+http://") {
		// Check if port or params indicate HTTPS despite the http prefix
		if strings.Contains(originalDSN, ":443") || strings.Contains(originalDSN, "protocol=https") {
			dsn = "https" + strings.TrimPrefix(dsn, "clickhouse+http") // Becomes https://...

			c.log.Info("Converted 'clickhouse+http://' prefix with port 443/protocol=https to standard 'https://'.")
		} else {
			dsn = strings.TrimPrefix(dsn, "clickhouse+") // Becomes http://...

			c.log.Info("Converted 'clickhouse+http://' prefix to standard 'http://'.")
		}
	}

	// Append common parameters like timeouts.
	// Note: tls_skip_verify might need to be handled differently with this driver if needed.
	// Check mailru/go-clickhouse/v2 docs for DSN options.
	dsnParams := url.Values{}
	dsnParams.Add("read_timeout", "30s")  // Add 's' unit
	dsnParams.Add("write_timeout", "30s") // Add 's' unit

	if c.config.InsecureSkipVerify && strings.HasPrefix(dsn, "https://") {
		// Only add tls_skip_verify for HTTPS connections
		// Note: mailru/go-clickhouse/v2 driver may not support this parameter
		dsnParams.Add("tls_skip_verify", "true")
		c.log.Warn("Attempting to configure InsecureSkipVerify via DSN parameter (tls_skip_verify=true)")
	} else if c.config.InsecureSkipVerify {
		c.log.Debug("InsecureSkipVerify configured but connection is HTTP, skipping TLS parameter")
	}

	// Append parameters to DSN
	paramStr := dsnParams.Encode()
	if paramStr != "" {
		if strings.Contains(dsn, "?") {
			dsn += "&" + paramStr
		} else {
			dsn += "?" + paramStr
		}
	}

	c.log.Info("Using mailru/chhttp driver")

	// Open connection pool using database/sql
	conn, err := sql.Open("chhttp", dsn) // Use "chhttp" driver name
	if err != nil {
		// Mask password in error log if present
		loggedDSN := dsn

		if u, parseErr := url.Parse(dsn); parseErr == nil {
			if _, pwdSet := u.User.Password(); pwdSet {
				u.User = url.User(u.User.Username()) // Remove password
				loggedDSN = u.String()
			}
		}
		// Log the original DSN in case of error for easier debugging
		return fmt.Errorf("failed to open mailru/chhttp connection pool for original DSN '%s' (processed as '%s'): %w", originalDSN, loggedDSN, err)
	}

	// Configure connection pool settings
	conn.SetMaxOpenConns(10)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(time.Hour)

	// Test connection with a ping
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second) // Add timeout to ping
	defer cancel()

	if err := conn.PingContext(pingCtx); err != nil {
		conn.Close() // Close pool if ping fails

		return fmt.Errorf("failed to ping ClickHouse: %w", err)
	}

	c.conn = conn
	c.log.Info("ClickHouse client started successfully (mailru/chhttp driver)")

	// Update connection metrics
	c.connectionStatus.WithLabelValues("active").Set(1)
	c.connectionStatus.WithLabelValues("error").Set(0)

	// Set initial active connections based on pool settings
	c.connectionsActive.WithLabelValues().Set(float64(5)) // Using MaxIdleConns as initial value

	return nil
}

// Query executes a query and returns all rows
func (c *client) Query(ctx context.Context, query string, args ...interface{}) ([]map[string]interface{}, error) {
	startTime := time.Now()

	var status = "success"

	defer func() {
		// Record metrics
		c.queriesTotal.WithLabelValues("query", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues("query").Observe(duration)
	}()

	// Verify connection is set
	if c.conn == nil {
		status = StatusError

		return nil, fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use QueryContext from database/sql
	rows, err := c.conn.QueryContext(ctx, query, args...)
	if err != nil {
		status = StatusError

		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close() // Ensure rows are closed

	// Get column names using standard sql.Rows.Columns()
	columnNames, err := rows.Columns()
	if err != nil {
		status = StatusError

		return nil, fmt.Errorf("failed to get column names: %w", err)
	}

	// Prepare result
	var result []map[string]interface{}

	// Iterate through rows
	for rows.Next() {
		// Create a slice of interface{} to hold the values
		values := make([]interface{}, len(columnNames))
		valuePointers := make([]interface{}, len(columnNames))

		// Initialize the slice with pointers
		for i := range values {
			valuePointers[i] = &values[i]
		}

		// Scan the row into the slice
		// Scan using standard sql.Rows.Scan()
		if err := rows.Scan(valuePointers...); err != nil {
			status = StatusError

			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Create a map for the row
		row := make(map[string]interface{})
		for i, column := range columnNames {
			row[column] = values[i]
		}

		// Add the row to the result
		result = append(result, row)
	}

	// Check for errors after iteration using standard sql.Rows.Err()
	if err := rows.Err(); err != nil {
		status = StatusError

		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return result, nil
}

// QueryWithScanner executes a query and allows direct scanning into custom structs
func (c *client) QueryWithScanner(ctx context.Context, query string, scanFunc func(RowScanner) error, args ...interface{}) error {
	startTime := time.Now()

	var status = "success"

	defer func() {
		// Record metrics
		c.queriesTotal.WithLabelValues("query_scanner", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues("query_scanner").Observe(duration)
	}()

	// Verify connection is set
	if c.conn == nil {
		status = StatusError

		return fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use QueryContext from database/sql
	rows, err := c.conn.QueryContext(ctx, query, args...)
	if err != nil {
		status = StatusError

		return fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close() // Ensure rows are closed

	// Iterate through rows and call scanFunc for each
	for rows.Next() {
		if err := scanFunc(rows); err != nil {
			status = StatusError

			return fmt.Errorf("failed to scan row: %w", err)
		}
	}

	// Check for errors after iteration using standard sql.Rows.Err()
	if err := rows.Err(); err != nil {
		status = StatusError

		return fmt.Errorf("error iterating rows: %w", err)
	}

	return nil
}

// QueryRow executes a query and returns a single row
func (c *client) QueryRow(ctx context.Context, query string, args ...interface{}) (map[string]interface{}, error) {
	startTime := time.Now()

	var status = "success"

	defer func() {
		// Record metrics
		c.queriesTotal.WithLabelValues("query_row", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues("query_row").Observe(duration)
	}()

	rows, err := c.Query(ctx, query, args...)
	if err != nil {
		status = StatusError

		return nil, err
	}

	if len(rows) == 0 {
		status = StatusError

		return nil, fmt.Errorf("no rows returned")
	}

	return rows[0], nil
}

// Exec executes a query without returning rows
func (c *client) Exec(ctx context.Context, query string, args ...interface{}) error {
	startTime := time.Now()

	var status = "success"

	defer func() {
		c.queriesTotal.WithLabelValues("exec", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues("exec").Observe(duration)
	}()

	// Verify connection is set
	if c.conn == nil {
		status = StatusError

		return fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use ExecContext from database/sql
	_, err := c.conn.ExecContext(ctx, query, args...)
	if err != nil {
		status = StatusError
	}

	return err // Return the error directly
}

// Network returns the network this client is configured for
func (c *client) Network() string {
	return c.network
}

// Stop gracefully stops the ClickHouse client
func (c *client) Stop() error {
	if c.conn == nil {
		c.log.Warn("Attempted to stop ClickHouse client but connection was nil")

		return nil
	}

	c.log.Info("Stopping ClickHouse client")

	// Update connection metrics
	c.connectionStatus.WithLabelValues("active").Set(0)
	c.connectionStatus.WithLabelValues("error").Set(0)
	c.connectionsActive.WithLabelValues().Set(0)

	// Close the connection pool using standard sql.DB.Close()
	return c.conn.Close()
}
