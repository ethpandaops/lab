package temporal

import (
	"context"
	"fmt"

	"github.com/sirupsen/logrus"
	temporalClient "go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

type Client interface {
	Start(ctx context.Context) error
	GetClient() temporalClient.Client
	StartWorker() error
	RegisterWorkflow(workflow interface{})
	RegisterActivity(activity interface{})
	Stop() error
}

// Client represents a Temporal client
type client struct {
	client temporalClient.Client
	worker worker.Worker
	log    logrus.FieldLogger
	ctx    context.Context
	config *Config
}

// New creates a new Temporal client
func New(config *Config, log logrus.FieldLogger) (Client, error) {
	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	log.
		WithField("namespace", config.Namespace).
		WithField("taskQueue", config.TaskQueue).
		Info("Initializing Temporal client")

	return &client{
		log:    log.WithField("module", "temporal"),
		config: config,
	}, nil
}

func (c *client) Start(ctx context.Context) error {
	c.ctx = ctx

	c.log.Info("Starting Temporal client")

	// Create Temporal client options
	options := temporalClient.Options{
		HostPort:  c.config.Address,
		Namespace: c.config.Namespace,
		Logger:    newTemporalLogger(c.log),
	}

	// Create Temporal client
	cl, err := temporalClient.Dial(options)
	if err != nil {
		return fmt.Errorf("failed to create Temporal client: %w", err)
	}

	c.client = cl

	c.log.Info("Temporal client started")

	return nil
}

// GetClient returns the underlying Temporal client
func (c *client) GetClient() temporalClient.Client {
	return c.client
}

// StartWorker starts the Temporal worker
func (c *client) StartWorker() error {
	// Create worker options
	options := worker.Options{
		MaxConcurrentActivityExecutionSize:     10,
		WorkerActivitiesPerSecond:              100,
		MaxConcurrentWorkflowTaskExecutionSize: 10,
	}

	// Create worker
	w := worker.New(c.client, c.config.TaskQueue, options)

	// Start worker
	err := w.Start()
	if err != nil {
		return fmt.Errorf("failed to start Temporal worker: %w", err)
	}

	c.worker = w
	c.log.WithField("taskQueue", c.config.TaskQueue).Info("Started Temporal worker")

	return nil
}

// RegisterWorkflow registers a workflow type with the worker
func (c *client) RegisterWorkflow(workflow interface{}) {
	if c.worker != nil {
		c.worker.RegisterWorkflow(workflow)
	}
}

// RegisterActivity registers an activity type with the worker
func (c *client) RegisterActivity(activity interface{}) {
	if c.worker != nil {
		c.worker.RegisterActivity(activity)
	}
}

// ExecuteWorkflow executes a workflow
func (c *client) ExecuteWorkflow(ctx context.Context, options temporalClient.StartWorkflowOptions, workflow interface{}, args ...interface{}) (temporalClient.WorkflowRun, error) {
	return c.client.ExecuteWorkflow(ctx, options, workflow, args...)
}

// GetWorkflowHistory returns the history of a workflow
func (c *client) GetWorkflowHistory(ctx context.Context, workflowID string, runID string) ([]interface{}, error) {
	// TODO: Implement GetWorkflowHistory
	return nil, nil
}

// Stop gracefully stops the Temporal client
func (c *client) Stop() error {
	// Stop worker if it exists
	if c.worker != nil {
		c.worker.Stop()
		c.log.Info("Stopped Temporal worker")
	}

	// Close client
	c.client.Close()
	c.log.Info("Closed Temporal client")

	return nil
}

// temporalLogger implements the temporal logger interface
type temporalLogger struct {
	log logrus.FieldLogger
}

// newTemporalLogger creates a new temporal logger
func newTemporalLogger(log logrus.FieldLogger) *temporalLogger {
	return &temporalLogger{
		log: log,
	}
}

// Debug logs a debug message
func (l *temporalLogger) Debug(msg string, keyvals ...interface{}) {
	l.log.WithField("temporal", keyvals).Debug(msg)
}

// Info logs an info message
func (l *temporalLogger) Info(msg string, keyvals ...interface{}) {
	l.log.WithField("temporal", keyvals).Info(msg)
}

// Warn logs a warning message
func (l *temporalLogger) Warn(msg string, keyvals ...interface{}) {
	l.log.WithField("temporal", keyvals).Warn(msg)
}

// Error logs an error message
func (l *temporalLogger) Error(msg string, keyvals ...interface{}) {
	l.log.WithField("temporal", keyvals).Error(msg)
}
