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
	_ "github.com/mailru/go-clickhouse/v2" // Import mailru driver for chhttp
	"github.com/sirupsen/logrus"
)

// Client represents a ClickHouse client
type Client interface {
	Start(ctx context.Context) error
	Query(ctx context.Context, query string, args ...interface{}) ([]map[string]interface{}, error)
	QueryRow(ctx context.Context, query string, args ...interface{}) (map[string]interface{}, error)
	Exec(ctx context.Context, query string, args ...interface{}) error
	Stop() error
}

// client is an implementation of the Client interface
type client struct {
	conn   *sql.DB // Use standard database/sql connection pool
	log    logrus.FieldLogger
	ctx    context.Context
	config *Config
}

// New creates a new ClickHouse client
func New(
	config *Config,
	log logrus.FieldLogger,
) (Client, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	log.WithField("dsn", config.DSN).Info("Initializing ClickHouse client")

	return &client{
		log:    log.WithField("module", "clickhouse"),
		config: config,
	}, nil
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

	if c.config.InsecureSkipVerify {
		// Attempt to add standard param, but verify if driver supports it.
		dsnParams.Add("tls_skip_verify", "true")
		c.log.Warn("Attempting to configure InsecureSkipVerify via DSN parameter (tls_skip_verify=true)")
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

	c.log.WithFields(logrus.Fields{
		"original_dsn":  originalDSN,
		"processed_dsn": dsn,
	}).Info("Attempting to connect using mailru/chhttp driver")

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
	return nil
}

// GetClient method removed as it returned v2 specific driver.Conn

// Query executes a query and returns all rows
func (c *client) Query(ctx context.Context, query string, args ...interface{}) ([]map[string]interface{}, error) {
	// Verify connection is set
	if c.conn == nil {
		return nil, fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use QueryContext from database/sql
	rows, err := c.conn.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close() // Ensure rows are closed

	// Get column names using standard sql.Rows.Columns()
	columnNames, err := rows.Columns()
	if err != nil {
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
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return result, nil
}

// QueryRow executes a query and returns a single row
func (c *client) QueryRow(ctx context.Context, query string, args ...interface{}) (map[string]interface{}, error) {
	rows, err := c.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("no rows returned")
	}

	return rows[0], nil
}

// Exec executes a query without returning rows
func (c *client) Exec(ctx context.Context, query string, args ...interface{}) error {
	// Verify connection is set
	if c.conn == nil {
		return fmt.Errorf("clickhouse connection is nil, client may not be properly initialized")
	}

	// Use ExecContext from database/sql
	_, err := c.conn.ExecContext(ctx, query, args...)
	return err // Return the error directly
}

// Stop gracefully stops the ClickHouse client
func (c *client) Stop() error {
	if c.conn == nil {
		c.log.Warn("Attempted to stop ClickHouse client but connection was nil")
		return nil
	}

	c.log.Info("Stopping ClickHouse client")

	// Close the connection pool using standard sql.DB.Close()
	return c.conn.Close()
}
