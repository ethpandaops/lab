package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/ethpandaops/lab/pkg/logger"
)

// Client represents a ClickHouse client
type Client struct {
	conn driver.Conn
	log  *logger.Logger
}

// NewClient creates a new ClickHouse client
func NewClient(
	host string,
	port int,
	database string,
	username string,
	password string,
	secure bool,
	log *logger.Logger,
) (*Client, error) {
	// Build ClickHouse connection options
	opts := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d", host, port)},
		Auth: clickhouse.Auth{
			Database: database,
			Username: username,
			Password: password,
		},
		// TLS:          &clickhouse.TLSConfig{Enabled: secure},
		MaxOpenConns: 10,
		MaxIdleConns: 5,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
		DialTimeout:      time.Second * 10,
		ConnOpenStrategy: clickhouse.ConnOpenInOrder,
	}

	// Create ClickHouse connection
	conn, err := clickhouse.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to open ClickHouse connection: %w", err)
	}

	// Check connection
	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping ClickHouse: %w", err)
	}

	return &Client{
		conn: conn,
		log:  log,
	}, nil
}

// Exec executes a query
func (c *Client) Exec(ctx context.Context, query string, args ...interface{}) error {
	return c.conn.Exec(ctx, query, args...)
}

// Query executes a query and returns the result
func (c *Client) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	return c.conn.Query(ctx, query, args...)
}

// Select executes a query and scans the result into dest
func (c *Client) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	return c.conn.Select(ctx, dest, query, args...)
}

// Close closes the ClickHouse connection
func (c *Client) Close() error {
	return c.conn.Close()
}
