package temporal

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/pkg/logger"
	"github.com/ethpandaops/lab/pkg/temporal"
)

// Client represents a Temporal client
type Client struct {
	client *temporal.Client
	log    *logger.Logger
	ctx    context.Context
}

// New creates a new Temporal client
func New(ctx context.Context, address string, namespace string, taskQueue string, log *logger.Logger) (*Client, error) {
	if ctx == nil {
		return nil, fmt.Errorf("context cannot be nil")
	}

	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	if address == "" {
		return nil, fmt.Errorf("address cannot be empty")
	}

	if namespace == "" {
		return nil, fmt.Errorf("namespace cannot be empty")
	}

	if taskQueue == "" {
		return nil, fmt.Errorf("task queue cannot be empty")
	}

	log.WithField("address", address).
		WithField("namespace", namespace).
		WithField("taskQueue", taskQueue).
		Info("Initializing Temporal client")

	temporalClient, err := temporal.NewClient(
		address,
		namespace,
		taskQueue,
		log,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Temporal client: %w", err)
	}

	return &Client{
		client: temporalClient,
		log:    log,
		ctx:    ctx,
	}, nil
}

// GetClient returns the underlying Temporal client
func (c *Client) GetClient() *temporal.Client {
	return c.client
}

// StartWorker starts the Temporal worker
func (c *Client) StartWorker() error {
	if c.client == nil {
		return fmt.Errorf("temporal client is nil")
	}

	c.log.Info("Starting Temporal worker")
	return c.client.StartWorker(c.ctx)
}

// Close closes the Temporal client
func (c *Client) Close() {
	if c.client != nil {
		c.client.Close()
	}
}
