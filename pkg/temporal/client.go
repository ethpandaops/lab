package temporal

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/pkg/logger"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

// Client represents a Temporal client
type Client struct {
	client     client.Client
	worker     worker.Worker
	taskQueue  string
	log        *logger.Logger
	activities map[string]interface{}
	workflows  map[string]interface{}
}

// NewClient creates a new Temporal client
func NewClient(
	address string,
	namespace string,
	taskQueue string,
	log *logger.Logger,
) (*Client, error) {
	// Create Temporal client
	c, err := client.NewClient(client.Options{
		HostPort:  address,
		Namespace: namespace,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Temporal client: %w", err)
	}

	return &Client{
		client:     c,
		taskQueue:  taskQueue,
		log:        log,
		activities: make(map[string]interface{}),
		workflows:  make(map[string]interface{}),
	}, nil
}

// RegisterWorkflow registers a workflow
func (c *Client) RegisterWorkflow(name string, workflow interface{}) {
	c.workflows[name] = workflow
}

// RegisterActivity registers an activity
func (c *Client) RegisterActivity(name string, activity interface{}) {
	c.activities[name] = activity
}

// StartWorker starts the worker
func (c *Client) StartWorker(ctx context.Context) error {
	// Create worker
	w := worker.New(c.client, c.taskQueue, worker.Options{})

	// Register workflows
	for name, workflow := range c.workflows {
		c.log.WithField("workflow", name).Debug("Registering workflow")
		w.RegisterWorkflow(workflow)
	}

	// Register activities
	for name, activity := range c.activities {
		c.log.WithField("activity", name).Debug("Registering activity")
		w.RegisterActivity(activity)
	}

	// Start worker
	c.log.WithField("task_queue", c.taskQueue).Info("Starting worker")
	if err := w.Start(); err != nil {
		return fmt.Errorf("failed to start worker: %w", err)
	}

	c.worker = w

	// Setup cancellation
	go func() {
		<-ctx.Done()
		c.log.Info("Context canceled, stopping worker")
		c.worker.Stop()
	}()

	return nil
}

// ExecuteWorkflow executes a workflow
func (c *Client) ExecuteWorkflow(
	ctx context.Context,
	options client.StartWorkflowOptions,
	workflow interface{},
	args ...interface{},
) (client.WorkflowRun, error) {
	return c.client.ExecuteWorkflow(ctx, options, workflow, args...)
}

// Close closes the Temporal client
func (c *Client) Close() {
	if c.worker != nil {
		c.worker.Stop()
	}
	if c.client != nil {
		c.client.Close()
	}
}
