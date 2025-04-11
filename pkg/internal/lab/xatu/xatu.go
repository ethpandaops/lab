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
		log:     log.WithField("component", "xatu"),
	}, nil
}

func (c *Client) Start(ctx context.Context) error {
	c.log.Info("Starting xatu client")
	clients := make(map[string]clickhouse.Client)

	if len(c.configs) == 0 {
		c.log.Warn("No networks configured for xatu client")
	}

	for network, config := range c.configs {
		c.log.Infof("Creating clickhouse client for network %s", network)

		if config == nil {
			c.log.Errorf("Nil config provided for network %s, skipping", network)
			continue
		}

		clickhouseClient, err := clickhouse.New(config, c.log.WithField("network", network))
		if err != nil {
			return fmt.Errorf("failed to create clickhouse client for network %s: %w", network, err)
		}

		// Additional nil check to prevent nil clients in the map
		if clickhouseClient == nil {
			return fmt.Errorf("clickhouse.New returned nil client without error for network %s", network)
		}

		c.log.Infof("Starting clickhouse client for network %s", network)
		if err := clickhouseClient.Start(ctx); err != nil {
			return fmt.Errorf("failed to start clickhouse client for network %s: %w", network, err)
		}

		c.log.Infof("Successfully started clickhouse client for network %s", network)

		clients[network] = clickhouseClient
	}

	c.clients = clients
	c.log.Infof("Started xatu client with %d network clients", len(clients))

	return nil
}

// GetClickhouseClientForNetwork returns a Clickhouse client for a given network
func (c *Client) GetClickhouseClientForNetwork(network string) (clickhouse.Client, error) {
	// Check if c.clients is nil
	if c.clients == nil {
		c.log.Errorf("clients map is nil when getting ClickHouse client for network %s", network)
		return nil, fmt.Errorf("clients map is not initialized for network %s", network)
	}

	client, ok := c.clients[network]
	if !ok {
		c.log.Warnf("No ClickHouse client found for network %s", network)
		return nil, fmt.Errorf("no clickhouse client found for network %s", network)
	}

	// Check for nil client (shouldn't happen but might be the cause of crashes)
	if client == nil {
		c.log.Errorf("ClickHouse client for network %s exists in map but is nil", network)
		return nil, fmt.Errorf("clickhouse client for network %s is nil", network)
	}

	return client, nil
}

func (c *Client) Stop() {
}
