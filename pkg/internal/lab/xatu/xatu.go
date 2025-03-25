package xatu

import (
	"context"

	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
)

// Client is a client for Xatu
type Client struct {
	clickhouseClients map[string]*clickhouse.Client
}

// NewClient creates a new Xatu client
func NewClient(networks map[string]*clickhouse.Client) (*Client, error) {
	return &Client{
		clickhouseClients: networks,
	}, nil
}

// GetClickhouseClientForNetwork returns a Clickhouse client for a given network
func (c *Client) GetClickhouseClientForNetwork(network string) *clickhouse.Client {
	return c.clickhouseClients[network]
}

func (c *Client) Start(ctx context.Context) error {
	return nil
}

func (c *Client) Stop() {
}
