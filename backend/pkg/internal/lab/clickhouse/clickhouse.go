// Package clickhouse provides a client for interacting with ClickHouse databases.
// It supports both native protocol (for direct connections) and HTTP/HTTPS protocol
// (for proxy connections like chproxy). The client automatically detects which protocol
// to use based on the port in the DSN:
// - Ports 9000/9440: Native protocol for direct ClickHouse connections.
// - Other ports (443/8123/etc): HTTP/HTTPS protocol for proxy connections.
//
// The package provides connection pooling, automatic retries, and comprehensive
// metrics collection for monitoring database operations.
package clickhouse

import (
	"context"
	"crypto/tls"
	"database/sql"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// Clickhouse constants.
const (
	StatusError             = "error"
	StatusSuccess           = "success"
	SchemeClickHouseHTTPS   = "clickhouse+https://"
	SchemeClickHouseHTTP    = "clickhouse+http://"
	SchemeHTTPS             = "https://"
	SchemeHTTP              = "http://"
	SchemeClickHouse        = "clickhouse://"
	PortClickHouseNative    = ":9000"
	PortClickHouseNativeTLS = ":9440"
	PortHTTPS               = ":443"
)

// RowScanner provides an interface for scanning database row values.
// This allows for flexible result processing without depending on specific driver types.
type RowScanner interface {
	Scan(dest ...interface{}) error
}

// Client defines the interface for interacting with ClickHouse database.
// It provides methods for querying, executing statements, and managing connections.
type Client interface {
	Start(ctx context.Context) error
	Query(ctx context.Context, query string, args ...interface{}) ([]map[string]interface{}, error)
	QueryRow(ctx context.Context, query string, args ...interface{}) (map[string]interface{}, error)
	QueryWithScanner(ctx context.Context, query string, scanFunc func(RowScanner) error, args ...interface{}) error
	Exec(ctx context.Context, query string, args ...interface{}) error
	Network() string
	Stop() error
}

// parsedDSNInfo holds the parsed and processed DSN information.
// This is internal runtime state used during connection setup,
// not user-provided configuration.
type parsedDSNInfo struct {
	originalDSN    string
	processedDSN   string
	parsedURL      *url.URL
	useNative      bool
	tlsEnabled     bool
	protocolReason string
}

// client implements the Client interface for ClickHouse database operations.
// It manages connection pooling, metrics collection, and protocol selection.
type client struct {
	conn        *sql.DB
	log         logrus.FieldLogger
	ctx         context.Context //nolint:containedctx // context is used for clickhouse operations.
	config      *Config
	network     string
	stopMetrics chan struct{} // Channel to signal metrics updater to stop

	// Metrics
	metrics           *metrics.Metrics
	collector         *metrics.Collector
	queriesTotal      *prometheus.CounterVec
	queryDuration     *prometheus.HistogramVec
	connectionStatus  *prometheus.GaugeVec
	connectionsActive *prometheus.GaugeVec
	connectionsIdle   *prometheus.GaugeVec
	connectionsInUse  *prometheus.GaugeVec
	connectionsWait   *prometheus.GaugeVec
	metricsDatabase   string // The database label to use in metrics.
}

// New creates a new ClickHouse client with the provided configuration.
// The client uses the official ClickHouse Go driver and supports both
// native protocol (for direct connections) and HTTP protocol (for proxy connections).
// Returns an error if the configuration is invalid or metrics service is not provided.
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

	log.Debug("Initializing ClickHouse client")

	c := &client{
		log: log.WithFields(logrus.Fields{
			"module":  "clickhouse",
			"network": network,
		}),
		config:  config,
		metrics: metricsSvc,
		network: network,
	}

	// Handle optional metrics service parameter.
	if err := c.initMetrics(); err != nil {
		return nil, fmt.Errorf("failed to initialize metrics: %w", err)
	}

	return c, nil
}

// Start initializes and starts the ClickHouse client connection.
// This method performs the following steps:
// 1. Parses and normalizes the DSN from the configuration.
// 2. Determines whether to use native protocol (for direct connections) or HTTP (for proxy).
// 3. Configures connection parameters (timeouts, pool settings, TLS).
// 4. Creates a connection pool using the official ClickHouse Go driver.
// 5. Updates metrics to reflect the connection status.
//
// The connection strategy is determined by the port in the DSN:
// - Ports 9000/9440: Direct ClickHouse connection using native protocol.
// - Other ports (443/8123/etc): Proxy connection using HTTP/HTTPS protocol.
func (c *client) Start(ctx context.Context) error {
	logctx := c.log.WithFields(logrus.Fields{
		"driver": "ClickHouse/clickhouse-go/v2",
	})
	logctx.Debug("Starting ClickHouse client")

	// Store the context for later use.
	c.ctx = ctx

	// Parse and process the DSN.
	parsedDSN, err := c.parseDSN()
	if err != nil {
		return fmt.Errorf("failed to parse DSN: %w", err)
	}

	// Ensure the path is set correctly.
	// Note: An empty path or "/" means no specific database is selected.
	if parsedDSN.parsedURL.Path == "" {
		parsedDSN.parsedURL.Path = "/"
	}

	if parsedDSN.parsedURL.Path == "/" {
		c.log.Debug("No specific database selected - queries can use fully qualified table names")
	} else {
		c.log.WithField("database", strings.TrimPrefix(parsedDSN.parsedURL.Path, "/")).Debug("Using specified database")
	}

	// Build connection parameters.
	params := c.buildConnectionParams(parsedDSN)
	parsedDSN.parsedURL.RawQuery = params.Encode()

	// Log connection details (with password masked).
	logDSN := maskPasswordForLogging(parsedDSN.parsedURL.String())
	logctx.WithFields(logrus.Fields{
		"dsn_scheme": parsedDSN.parsedURL.Scheme,
		"host":       parsedDSN.parsedURL.Host,
		"dsn":        logDSN,
		"use_native": parsedDSN.useNative,
	}).Debug("Opening ClickHouse connection")

	// Create connection options for the ClickHouse driver.
	options := c.createClickHouseOptions(parsedDSN)

	// Open the database connection.
	// This creates a connection pool that will be managed by the driver.
	conn := clickhouse.OpenDB(options)
	if conn == nil {
		return fmt.Errorf("failed to create ClickHouse connection")
	}

	// Configure connection pool settings.
	// These settings control how many connections are maintained and their lifecycle.
	conn.SetMaxOpenConns(c.config.ConnectionConfig.MaxOpenConns)       // Maximum number of open connections to the database.
	conn.SetMaxIdleConns(c.config.ConnectionConfig.MaxIdleConns)       // Maximum number of idle connections in the pool.
	conn.SetConnMaxLifetime(c.config.ConnectionConfig.ConnMaxLifetime) // Maximum lifetime of a connection.

	// Store the connection.
	c.conn = conn

	// Test the connection to ensure it's working.
	// This works regardless of whether a database is specified.
	c.log.Debug("Testing ClickHouse connection")

	if err := conn.PingContext(ctx); err != nil {
		// If ping fails, close the connection and return error.
		_ = conn.Close()

		c.connectionStatus.WithLabelValues(c.metricsDatabase, "error").Set(1)
		c.connectionStatus.WithLabelValues(c.metricsDatabase, "active").Set(0)

		return fmt.Errorf("failed to ping ClickHouse: %w", err)
	}

	c.log.Debug("ClickHouse connection test successful")

	// Update metrics to reflect successful initialization.
	c.connectionStatus.WithLabelValues(c.metricsDatabase, "active").Set(1)
	c.connectionStatus.WithLabelValues(c.metricsDatabase, "error").Set(0)

	// Set initial connection pool metrics from actual stats
	stats := c.conn.Stats()
	c.connectionsActive.WithLabelValues(c.metricsDatabase).Set(float64(stats.OpenConnections))
	c.connectionsIdle.WithLabelValues(c.metricsDatabase).Set(float64(stats.Idle))
	c.connectionsInUse.WithLabelValues(c.metricsDatabase).Set(float64(stats.InUse))
	c.connectionsWait.WithLabelValues(c.metricsDatabase).Set(float64(stats.WaitCount))

	protocolType := "HTTP"
	if parsedDSN.useNative {
		protocolType = "Native"
	}

	// Determine the database identifier for logs and metrics.
	// Priority: network name > DSN database > "default".
	dsnDatabase := strings.TrimPrefix(parsedDSN.parsedURL.Path, "/")
	database := c.network

	if database == "" {
		database = dsnDatabase
	}

	if database == "" {
		database = "default"
	}

	// Store the database identifier for use in metrics.
	c.metricsDatabase = database

	// Single consolidated log line with all key information.
	c.log.WithFields(logrus.Fields{
		"host":     parsedDSN.parsedURL.Host,
		"protocol": protocolType,
		"database": database,
	}).Info("ClickHouse client connected successfully")

	// Start metrics updater goroutine
	c.stopMetrics = make(chan struct{})
	go c.updateConnectionMetrics()

	return nil
}

// Query executes a SQL query against ClickHouse and returns all result rows.
// The results are returned as a slice of maps where each map represents a row
// with column names as keys and values as interface{}.
// This method tracks query metrics including execution time and success/error status.
func (c *client) Query(ctx context.Context, query string, args ...interface{}) ([]map[string]interface{}, error) {
	startTime := time.Now()

	var status = StatusSuccess

	defer func() {
		// Record metrics.
		c.queriesTotal.WithLabelValues(c.metricsDatabase, "query", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues(c.metricsDatabase, "query").Observe(duration)
	}()

	// Verify connection is set.
	if c.conn == nil {
		status = StatusError

		return nil, fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use QueryContext from database/sql.
	rows, err := c.conn.QueryContext(ctx, query, args...)
	if err != nil {
		status = StatusError

		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close() // Ensure rows are closed.

	// Get column names using standard sql.Rows.Columns().
	columnNames, err := rows.Columns()
	if err != nil {
		status = StatusError

		return nil, fmt.Errorf("failed to get column names: %w", err)
	}

	// Prepare result.
	var result []map[string]interface{}

	// Iterate through rows.
	for rows.Next() {
		// Create a slice of interface{} to hold the values.
		values := make([]interface{}, len(columnNames))
		valuePointers := make([]interface{}, len(columnNames))

		// Initialize the slice with pointers.
		for i := range values {
			valuePointers[i] = &values[i]
		}

		// Scan the row into the slice.
		// Scan using standard sql.Rows.Scan().
		if err := rows.Scan(valuePointers...); err != nil {
			status = StatusError

			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Create a map for the row.
		row := make(map[string]interface{})
		for i, column := range columnNames {
			row[column] = values[i]
		}

		// Add the row to the result.
		result = append(result, row)
	}

	// Check for errors after iteration using standard sql.Rows.Err().
	if err := rows.Err(); err != nil {
		status = StatusError

		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return result, nil
}

// QueryWithScanner executes a query and provides a custom scanning function for each row.
// This is more efficient than Query when you need to scan results into custom structs.
// The scanFunc is called once for each row and should handle the scanning logic.
// This method is useful for large result sets where you want to avoid the overhead
// of creating intermediate map structures.
func (c *client) QueryWithScanner(ctx context.Context, query string, scanFunc func(RowScanner) error, args ...interface{}) error {
	startTime := time.Now()

	var status = StatusSuccess

	defer func() {
		// Record metrics.
		c.queriesTotal.WithLabelValues(c.metricsDatabase, "query_scanner", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues(c.metricsDatabase, "query_scanner").Observe(duration)
	}()

	// Verify connection is set.
	if c.conn == nil {
		status = StatusError

		return fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use QueryContext from database/sql.
	rows, err := c.conn.QueryContext(ctx, query, args...)
	if err != nil {
		status = StatusError

		return fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close() // Ensure rows are closed.

	// Iterate through rows and call scanFunc for each.
	for rows.Next() {
		if err := scanFunc(rows); err != nil {
			status = StatusError

			return fmt.Errorf("failed to scan row: %w", err)
		}
	}

	// Check for errors after iteration using standard sql.Rows.Err().
	if err := rows.Err(); err != nil {
		status = StatusError

		return fmt.Errorf("error iterating rows: %w", err)
	}

	return nil
}

// QueryRow executes a query that is expected to return at most one row.
// Returns an error if no rows are found or if the query fails.
// This is a convenience method that internally uses Query and returns only the first row.
func (c *client) QueryRow(ctx context.Context, query string, args ...interface{}) (map[string]interface{}, error) {
	startTime := time.Now()

	var status = StatusSuccess

	defer func() {
		// Record metrics.
		c.queriesTotal.WithLabelValues(c.metricsDatabase, "query_row", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues(c.metricsDatabase, "query_row").Observe(duration)
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

// Exec executes a query that doesn't return rows (e.g., INSERT, UPDATE, DELETE, DDL).
// This method is used for mutations and schema changes.
// It tracks execution metrics similar to Query methods.
func (c *client) Exec(ctx context.Context, query string, args ...interface{}) error {
	startTime := time.Now()

	var status = StatusSuccess

	defer func() {
		c.queriesTotal.WithLabelValues(c.metricsDatabase, "exec", status).Inc()

		duration := time.Since(startTime).Seconds()
		c.queryDuration.WithLabelValues(c.metricsDatabase, "exec").Observe(duration)
	}()

	// Verify connection is set.
	if c.conn == nil {
		status = StatusError

		return fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use ExecContext from database/sql.
	_, err := c.conn.ExecContext(ctx, query, args...)
	if err != nil {
		status = StatusError
	}

	return err // Return the error directly.
}

// Network returns the network identifier this client is configured for.
// This is used to identify which blockchain network's data this client is accessing.
func (c *client) Network() string {
	return c.network
}

// Stop gracefully stops the ClickHouse client and closes all connections.
func (c *client) Stop() error {
	if c.conn == nil {
		c.log.Warn("Attempted to stop ClickHouse client but connection was nil")

		return nil
	}

	c.log.Info("Stopping ClickHouse client")

	// Stop metrics updater goroutine
	if c.stopMetrics != nil {
		close(c.stopMetrics)
	}

	// Update connection metrics.
	c.connectionStatus.WithLabelValues(c.metricsDatabase, "active").Set(0)
	c.connectionStatus.WithLabelValues(c.metricsDatabase, "error").Set(0)
	c.connectionsActive.WithLabelValues(c.metricsDatabase).Set(0)
	c.connectionsIdle.WithLabelValues(c.metricsDatabase).Set(0)
	c.connectionsInUse.WithLabelValues(c.metricsDatabase).Set(0)

	// Close the connection pool using standard sql.DB.Close().
	return c.conn.Close()
}

// initMetrics initializes Prometheus metrics for monitoring ClickHouse operations.
// This includes metrics for:
// - Total queries executed (by type and status).
// - Query duration histogram.
// - Connection status (active/error).
// - Number of active connections.
func (c *client) initMetrics() error {
	// Create a collector for the clickhouse subsystem.
	var err error

	c.collector = c.metrics.NewCollector("clickhouse")

	// Register metrics.
	c.queriesTotal, err = c.collector.NewCounterVec(
		"queries_total",
		"Total number of ClickHouse queries executed",
		[]string{"database", "query_type", "status"},
	)
	if err != nil {
		return fmt.Errorf("failed to create queries_total metric: %w", err)
	}

	c.queryDuration, err = c.collector.NewHistogramVec(
		"query_duration_seconds",
		"Duration of ClickHouse queries in seconds",
		[]string{"database", "query_type"},
		prometheus.DefBuckets,
	)
	if err != nil {
		return fmt.Errorf("failed to create query_duration_seconds metric: %w", err)
	}

	c.connectionStatus, err = c.collector.NewGaugeVec(
		"connection_status",
		"Status of ClickHouse connection (1=connected, 0=disconnected)",
		[]string{"database", "status"},
	)
	if err != nil {
		return fmt.Errorf("failed to create connection_status metric: %w", err)
	}

	c.connectionsActive, err = c.collector.NewGaugeVec(
		"connections_active",
		"Number of active ClickHouse connections (OpenConnections from pool stats)",
		[]string{"database"},
	)
	if err != nil {
		return fmt.Errorf("failed to create connections_active metric: %w", err)
	}

	c.connectionsIdle, err = c.collector.NewGaugeVec(
		"connections_idle",
		"Number of idle ClickHouse connections in the pool",
		[]string{"database"},
	)
	if err != nil {
		return fmt.Errorf("failed to create connections_idle metric: %w", err)
	}

	c.connectionsInUse, err = c.collector.NewGaugeVec(
		"connections_in_use",
		"Number of ClickHouse connections currently in use",
		[]string{"database"},
	)
	if err != nil {
		return fmt.Errorf("failed to create connections_in_use metric: %w", err)
	}

	c.connectionsWait, err = c.collector.NewGaugeVec(
		"connections_wait_count",
		"Total number of connections waited for",
		[]string{"database"},
	)
	if err != nil {
		return fmt.Errorf("failed to create connections_wait_count metric: %w", err)
	}

	return nil
}

// updateConnectionMetrics periodically updates connection pool metrics
func (c *client) updateConnectionMetrics() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if c.conn != nil {
				stats := c.conn.Stats()
				c.connectionsActive.WithLabelValues(c.metricsDatabase).Set(float64(stats.OpenConnections))
				c.connectionsIdle.WithLabelValues(c.metricsDatabase).Set(float64(stats.Idle))
				c.connectionsInUse.WithLabelValues(c.metricsDatabase).Set(float64(stats.InUse))
				c.connectionsWait.WithLabelValues(c.metricsDatabase).Set(float64(stats.WaitCount))
			}
		case <-c.stopMetrics:
			return
		}
	}
}

// parseDSN processes the DSN and determines the connection protocol.
func (c *client) parseDSN() (*parsedDSNInfo, error) {
	info := &parsedDSNInfo{
		originalDSN: c.config.DSN,
	}

	// Determine if we should use native protocol based on port.
	// Native protocol is used for direct ClickHouse connections (ports 9000, 9440).
	// HTTP protocol is used for proxy connections (e.g., chproxy).
	info.useNative = isDirectClickHousePort(info.originalDSN)

	// Normalize the DSN scheme based on the detected protocol.
	dsn, logMessage := normalizeScheme(info.originalDSN, info.useNative)
	info.processedDSN = dsn
	info.protocolReason = logMessage

	if logMessage != "" {
		c.log.Debug(logMessage)
	}

	// Validate the DSN format.
	if !strings.Contains(dsn, "://") {
		return nil, fmt.Errorf("unsupported DSN format: %s", dsn)
	}

	// Parse the URL.
	parsedURL, err := url.Parse(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSN: %w", err)
	}

	// Validate that we have a recognized scheme.
	validSchemes := map[string]bool{
		"http":       true,
		"https":      true,
		"clickhouse": true,
	}
	if !validSchemes[parsedURL.Scheme] {
		return nil, fmt.Errorf("unsupported DSN scheme: %s", parsedURL.Scheme)
	}

	info.parsedURL = parsedURL

	// Determine if TLS is enabled.
	info.tlsEnabled = strings.HasPrefix(dsn, SchemeHTTPS) ||
		(strings.HasPrefix(dsn, SchemeClickHouse) && strings.Contains(parsedURL.Host, PortClickHouseNativeTLS))

	return info, nil
}

// buildConnectionParams creates URL query parameters for the connection.
func (c *client) buildConnectionParams(dsnInfo *parsedDSNInfo) url.Values {
	params := url.Values{}

	// Timeout settings from configuration.
	params.Set("dial_timeout", c.config.ConnectionConfig.DialTimeout.String())
	params.Set("read_timeout", c.config.ConnectionConfig.ReadTimeout.String())
	params.Set("write_timeout", c.config.ConnectionConfig.WriteTimeout.String())
	params.Set("max_execution_time", fmt.Sprintf("%d", c.config.ConnectionConfig.MaxExecutionTime))

	// Connection pool settings from configuration.
	params.Set("max_open_conns", fmt.Sprintf("%d", c.config.ConnectionConfig.MaxOpenConns))
	params.Set("max_idle_conns", fmt.Sprintf("%d", c.config.ConnectionConfig.MaxIdleConns))
	params.Set("conn_max_lifetime", c.config.ConnectionConfig.ConnMaxLifetime.String())

	// TLS settings based on the scheme.
	if strings.HasPrefix(dsnInfo.processedDSN, SchemeHTTPS) {
		params.Set("secure", "true")

		if c.config.ConnectionConfig.InsecureSkipVerify {
			params.Set("skip_verify", "true")
			c.log.Warn("TLS verification disabled")
		}

		c.log.Debug("Using HTTPS mode")
	} else if strings.HasPrefix(dsnInfo.processedDSN, SchemeHTTP) {
		params.Set("secure", "false")
		c.log.Debug("Using HTTP mode")
	}

	return params
}

// createClickHouseOptions builds the connection options for the ClickHouse driver.
func (c *client) createClickHouseOptions(dsnInfo *parsedDSNInfo) *clickhouse.Options {
	// Extract authentication details.
	// Note: Database is optional. If not specified in the DSN, it will be empty.
	// This allows queries to use fully qualified table names (e.g., mainnet.tablename).
	auth := clickhouse.Auth{
		Database: strings.TrimPrefix(dsnInfo.parsedURL.Path, "/"),
		Username: dsnInfo.parsedURL.User.Username(),
	}

	if password, ok := dsnInfo.parsedURL.User.Password(); ok {
		auth.Password = password
	}

	// Determine the protocol to use.
	protocol := clickhouse.HTTP
	if dsnInfo.useNative {
		protocol = clickhouse.Native
	}

	// Build the options.
	options := &clickhouse.Options{
		Addr:     []string{dsnInfo.parsedURL.Host},
		Auth:     auth,
		Protocol: protocol,
	}

	// Add TLS configuration if needed.
	if dsnInfo.tlsEnabled {
		options.TLS = &tls.Config{
			InsecureSkipVerify: c.config.ConnectionConfig.InsecureSkipVerify, //nolint:gosec // configurable via config.
		}
	}

	return options
}

// maskPasswordForLogging removes the password from DSN for safe logging.
func maskPasswordForLogging(dsn string) string {
	u, err := url.Parse(dsn)
	if err != nil {
		return dsn // Return original if parsing fails.
	}

	if _, pwdSet := u.User.Password(); pwdSet {
		u.User = url.User(u.User.Username())
	}

	return u.String()
}

// isDirectClickHousePort checks if the port indicates a direct ClickHouse connection.
// Common ClickHouse native ports: 9000 (native), 9440 (native with TLS).
// Proxy ports: 443 (HTTPS), 8443 (HTTPS), 8123 (HTTP), 8124 (HTTPS).
func isDirectClickHousePort(dsn string) bool {
	return strings.Contains(dsn, PortClickHouseNative) || strings.Contains(dsn, PortClickHouseNativeTLS)
}

// normalizeScheme converts various DSN schemes to a standardized format.
// Handles: clickhouse+https://, clickhouse+http://, https://, http://, clickhouse://.
func normalizeScheme(dsn string, useNativeProtocol bool) (string, string) {
	var logMessage string

	if useNativeProtocol {
		// For direct ClickHouse connections, convert to native protocol.
		switch {
		case strings.HasPrefix(dsn, SchemeClickHouseHTTPS):
			dsn = strings.Replace(dsn, SchemeClickHouseHTTPS, SchemeClickHouse, 1)
			logMessage = "Using native protocol with TLS for direct ClickHouse connection"
		case strings.HasPrefix(dsn, SchemeClickHouseHTTP):
			dsn = strings.Replace(dsn, SchemeClickHouseHTTP, SchemeClickHouse, 1)
			logMessage = "Using native protocol for direct ClickHouse connection"
		case strings.HasPrefix(dsn, SchemeHTTPS):
			dsn = strings.Replace(dsn, SchemeHTTPS, SchemeClickHouse, 1)
			logMessage = "Converting to native protocol with TLS for direct connection"
		case strings.HasPrefix(dsn, SchemeHTTP):
			dsn = strings.Replace(dsn, SchemeHTTP, SchemeClickHouse, 1)
			logMessage = "Converting to native protocol for direct connection"
		case !strings.HasPrefix(dsn, SchemeClickHouse):
			if !strings.Contains(dsn, "://") {
				dsn = SchemeClickHouse + dsn
				logMessage = "Adding native ClickHouse protocol for direct connection"
			}
		}
	} else {
		// For proxy connections (e.g., chproxy), use HTTP/HTTPS protocol.
		switch {
		case strings.HasPrefix(dsn, SchemeClickHouseHTTPS):
			dsn = strings.Replace(dsn, SchemeClickHouseHTTPS, SchemeHTTPS, 1)
			logMessage = "Using HTTPS protocol for ClickHouse connection via proxy"
		case strings.HasPrefix(dsn, SchemeClickHouseHTTP):
			// Special handling for port 443 which typically indicates HTTPS.
			if strings.Contains(dsn, PortHTTPS) {
				dsn = strings.Replace(dsn, SchemeClickHouseHTTP, SchemeHTTPS, 1)
				logMessage = "Converting to HTTPS due to port 443"
			} else {
				dsn = strings.Replace(dsn, SchemeClickHouseHTTP, SchemeHTTP, 1)
				logMessage = "Using HTTP protocol for ClickHouse connection"
			}
		case strings.HasPrefix(dsn, SchemeClickHouse):
			// Convert native protocol to HTTP/HTTPS for proxy compatibility.
			if strings.Contains(dsn, PortHTTPS) {
				dsn = strings.Replace(dsn, SchemeClickHouse, SchemeHTTPS, 1)
				logMessage = "Converting to HTTPS for proxy compatibility"
			} else {
				dsn = strings.Replace(dsn, SchemeClickHouse, SchemeHTTP, 1)
				logMessage = "Converting to HTTP for proxy compatibility"
			}
		case strings.HasPrefix(dsn, SchemeHTTPS) || strings.HasPrefix(dsn, SchemeHTTP):
			logMessage = "Using HTTP/HTTPS protocol for proxy"
		default:
			// No scheme provided, add one based on port.
			if !strings.Contains(dsn, "://") {
				if strings.Contains(dsn, PortHTTPS) {
					dsn = SchemeHTTPS + dsn
					logMessage = "Adding HTTPS protocol for port 443"
				} else {
					dsn = SchemeHTTP + dsn
					logMessage = "Adding HTTP protocol"
				}
			}
		}
	}

	return dsn, logMessage
}
