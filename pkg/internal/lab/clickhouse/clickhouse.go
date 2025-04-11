package clickhouse

import (
	"context"
	"crypto/tls"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/sirupsen/logrus"
)

// Client represents a ClickHouse client
type Client interface {
	Start(ctx context.Context) error
	Query(query string, args ...interface{}) ([]map[string]interface{}, error)
	QueryRow(query string, args ...interface{}) (map[string]interface{}, error)
	Exec(query string, args ...interface{}) error
	Stop() error
}

// client is an implementation of the Client interface
type client struct {
	conn   driver.Conn
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

	log.WithField("host", config.Host).WithField("port", config.Port).
		WithField("database", config.Database).Info("Initializing ClickHouse client")

	return &client{
		log:    log.WithField("module", "clickhouse"),
		config: config,
	}, nil
}

func (c *client) Start(ctx context.Context) error {
	c.log.Info("Starting ClickHouse client")

	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d", c.config.Host, c.config.Port)},
		Auth: clickhouse.Auth{
			Database: c.config.Database,
			Username: c.config.Username,
			Password: c.config.Password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		DialTimeout:     time.Second * 10,
		MaxOpenConns:    10,
		MaxIdleConns:    5,
		ConnMaxLifetime: time.Hour,
	}

	if c.config.Secure {
		options.TLS = &tls.Config{
			InsecureSkipVerify: true,
		}
	}

	conn, err := clickhouse.Open(options)
	if err != nil {
		return fmt.Errorf("failed to create ClickHouse connection: %w", err)
	}

	c.conn = conn

	c.log.Info("ClickHouse client started")

	return nil
}

// GetClient returns the underlying ClickHouse connection
func (c *client) GetClient() driver.Conn {
	return c.conn
}

// Query executes a query and returns all rows
func (c *client) Query(query string, args ...interface{}) ([]map[string]interface{}, error) {
	rows, err := c.conn.Query(c.ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	// Get column names
	columnTypes := rows.ColumnTypes()
	columnNames := make([]string, len(columnTypes))
	for i, col := range columnTypes {
		columnNames[i] = col.Name()
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

	// Check for errors after iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return result, nil
}

// QueryRow executes a query and returns a single row
func (c *client) QueryRow(query string, args ...interface{}) (map[string]interface{}, error) {
	rows, err := c.Query(query, args...)
	if err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("no rows returned")
	}

	return rows[0], nil
}

// Exec executes a query without returning rows
func (c *client) Exec(query string, args ...interface{}) error {
	return c.conn.Exec(c.ctx, query, args...)
}

// Stop gracefully stops the ClickHouse client
func (c *client) Stop() error {
	return c.conn.Close()
}
