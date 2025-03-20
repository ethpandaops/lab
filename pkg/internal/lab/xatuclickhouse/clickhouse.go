package xatuclickhouse

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/pkg/clickhouse"
	"github.com/ethpandaops/lab/pkg/logger"
)

// Client represents a ClickHouse client
type Client struct {
	client *clickhouse.Client
	log    *logger.Logger
	ctx    context.Context
}

// New creates a new ClickHouse client
func New(
	ctx context.Context,
	host string,
	port int,
	database string,
	username string,
	password string,
	secure bool,
	log *logger.Logger,
) (*Client, error) {
	if ctx == nil {
		return nil, fmt.Errorf("context cannot be nil")
	}

	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	if host == "" {
		return nil, fmt.Errorf("host cannot be empty")
	}

	log.WithField("host", host).WithField("port", port).
		WithField("database", database).Info("Initializing ClickHouse client")

	chClient, err := clickhouse.NewClient(
		host,
		port,
		database,
		username,
		password,
		secure,
		log,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create ClickHouse client: %w", err)
	}

	return &Client{
		client: chClient,
		log:    log,
		ctx:    ctx,
	}, nil
}

// GetClient returns the underlying ClickHouse client
func (c *Client) GetClient() *clickhouse.Client {
	return c.client
}

// Close closes the ClickHouse connection
func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}
