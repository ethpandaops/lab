package xatu

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/sirupsen/logrus"
)

// Client is a client for Xatu
type Client struct {
	configs map[string]*clickhouse.Config
	clients map[string]clickhouse.Client
	log     logrus.FieldLogger
}

// NewClient creates a new Xatu client
func NewClient(log logrus.FieldLogger, networks map[string]*clickhouse.Config) (*Client, error) {
	return &Client{
		configs: networks,
		log:     log,
	}, nil
}

func (c *Client) Start(ctx context.Context) error {
	clients := make(map[string]clickhouse.Client)

	for network, config := range c.configs {
		clickhouseClient, err := clickhouse.New(config, c.log)
		if err != nil {
			return fmt.Errorf("failed to create clickhouse client for network %s: %w", network, err)
		}

		if err := clickhouseClient.Start(ctx); err != nil {
			return fmt.Errorf("failed to start clickhouse client for network %s: %w", network, err)
		}

		clients[network] = clickhouseClient
	}

	c.clients = clients

	return nil
}

// GetClickhouseClientForNetwork returns a Clickhouse client for a given network
func (c *Client) GetClickhouseClientForNetwork(network string) (clickhouse.Client, error) {
	if client, ok := c.clients[network]; ok {
		return client, nil
	}

	return nil, fmt.Errorf("no clickhouse client found for network %s", network)
}

func (c *Client) Stop() {
}
