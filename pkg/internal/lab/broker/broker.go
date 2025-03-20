package broker

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/pkg/broker"
	"github.com/ethpandaops/lab/pkg/logger"
)

// Client represents a broker client
type Client struct {
	broker broker.Broker
	log    *logger.Logger
	ctx    context.Context
}

// New creates a new broker client
func New(ctx context.Context, url string, subject string, log *logger.Logger) (*Client, error) {
	if ctx == nil {
		return nil, fmt.Errorf("context cannot be nil")
	}

	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	if url == "" {
		return nil, fmt.Errorf("broker URL cannot be empty")
	}

	if subject == "" {
		return nil, fmt.Errorf("broker subject cannot be empty")
	}

	log.WithField("url", url).WithField("subject", subject).Info("Initializing broker")

	// Create broker client
	brokerConfig := broker.Config{
		URL:     url,
		Subject: subject,
	}

	brokerClient, err := broker.New(brokerConfig, log)
	if err != nil {
		return nil, fmt.Errorf("failed to create broker client: %w", err)
	}

	return &Client{
		broker: brokerClient,
		log:    log,
		ctx:    ctx,
	}, nil
}

// Broker returns the underlying broker
func (c *Client) Broker() broker.Broker {
	return c.broker
}

// Publish publishes a message to the broker
func (c *Client) Publish(topic string, data []byte) error {
	return c.broker.Publish(topic, data)
}

// Subscribe subscribes to a topic
func (c *Client) Subscribe(topic string, handler func([]byte)) (broker.Subscription, error) {
	return c.broker.Subscribe(topic, handler)
}

// QueueSubscribe subscribes to a topic with a queue group
func (c *Client) QueueSubscribe(topic string, queue string, handler func([]byte)) (broker.Subscription, error) {
	return c.broker.QueueSubscribe(topic, queue, handler)
}

// Close closes the broker connection
func (c *Client) Close() error {
	return c.broker.Close()
}
