package timings

import (
	"context"
	"fmt"
	"time"

	"github.com/sirupsen/logrus"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// Workflow names and task queues
const (
	TimingsModuleWorkflowName         = "TimingsModuleWorkflow"
	BlockTimingsProcessorWorkflowName = "BlockTimingsProcessorWorkflow"
	SizeCDFProcessorWorkflowName      = "SizeCDFProcessorWorkflow"
	TimingsTaskQueue                  = "timings-task-queue"
)

// Default time windows
var DefaultTimeWindows = []TimeWindowConfig{
	{
		Name:  "Last 24 hours",
		File:  "24h",
		Range: 24 * time.Hour,
		Step:  15 * time.Minute,
	},
	{
		Name:  "Last 7 days",
		File:  "7d",
		Range: 7 * 24 * time.Hour,
		Step:  1 * time.Hour,
	},
	{
		Name:  "Last 30 days",
		File:  "30d",
		Range: 30 * 24 * time.Hour,
		Step:  6 * time.Hour,
	},
}

// TimingsModuleWorkflowParams are the parameters for the timings module workflow
type TimingsModuleWorkflowParams struct {
	Networks    []string
	TimeWindows []TimeWindowConfig
}

// TimingsModuleWorkflow coordinates the beacon chain timings processors
func TimingsModuleWorkflow(ctx workflow.Context, params TimingsModuleWorkflowParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting TimingsModuleWorkflow")

	if len(params.TimeWindows) == 0 {
		params.TimeWindows = DefaultTimeWindows
	}

	// Set up child workflow options
	childOptions := workflow.ChildWorkflowOptions{
		TaskQueue:          TimingsTaskQueue,
		WorkflowRunTimeout: 24 * time.Hour,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    10,
		},
	}

	ctx = workflow.WithChildOptions(ctx, childOptions)

	// Start processors for each network
	for _, network := range params.Networks {
		blockTimingsWorkflowID := fmt.Sprintf("block-timings-%s", network)
		sizeCDFWorkflowID := fmt.Sprintf("size-cdf-%s", network)

		// Start BlockTimingsProcessor workflow
		blockTimingsOptions := workflow.ChildWorkflowOptions{
			WorkflowID: blockTimingsWorkflowID,
		}
		blockTimingsCtx := workflow.WithChildOptions(ctx, blockTimingsOptions)
		workflow.ExecuteChildWorkflow(blockTimingsCtx, BlockTimingsProcessorWorkflowName, BlockTimingsProcessorParams{
			NetworkName: network,
		})

		// Start SizeCDFProcessor workflow
		sizeCDFOptions := workflow.ChildWorkflowOptions{
			WorkflowID: sizeCDFWorkflowID,
		}
		sizeCDFCtx := workflow.WithChildOptions(ctx, sizeCDFOptions)
		workflow.ExecuteChildWorkflow(sizeCDFCtx, SizeCDFProcessorWorkflowName, SizeCDFProcessorParams{
			NetworkName: network,
		})
	}

	// This is a long-running workflow that coordinates other workflows
	workflow.GetSignalChannel(ctx, "stop").Receive(ctx, nil)
	return nil
}

// BlockTimingsProcessorWorkflow processes block timings data
func BlockTimingsProcessorWorkflow(ctx workflow.Context, params BlockTimingsProcessorParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting BlockTimingsProcessorWorkflow", "network", params.NetworkName)

	// Set up activity options
	activityOptions := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    10 * time.Minute,
		HeartbeatTimeout:       time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	// Set processing interval
	processingInterval := 1 * time.Hour
	timeWindows := DefaultTimeWindows

	// Flag to track if workflow should exit
	var done bool

	// Main processing loop
	for !done {
		for _, window := range timeWindows {
			// Check if we need to process this window
			shouldProcess := false
			if err := workflow.ExecuteActivity(ctx, ShouldProcessActivity, DataProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  window.File,
			}).Get(ctx, &shouldProcess); err != nil {
				logger.Error("Failed to check if should process", "error", err)
				continue
			}

			if !shouldProcess {
				logger.Debug("Skipping processing", "network", params.NetworkName, "window", window.File)
				continue
			}

			// Process the window
			if err := workflow.ExecuteActivity(ctx, ProcessBlockTimingsActivity, DataProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  window.File,
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to process block timings", "error", err, "network", params.NetworkName, "window", window.File)
				continue
			}

			// Update the processor state
			if err := workflow.ExecuteActivity(ctx, UpdateProcessorStateActivity, DataProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  window.File,
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to update processor state", "error", err)
				continue
			}
		}

		// Wait for the next processing interval
		selector := workflow.NewSelector(ctx)

		// Add a timer for the processing interval
		timerFuture := workflow.NewTimer(ctx, processingInterval)
		selector.AddFuture(timerFuture, func(f workflow.Future) {
			// Timer fired, continue processing
		})

		// Add a signal handler for stop signals
		stopChannel := workflow.GetSignalChannel(ctx, "stop")
		selector.AddReceive(stopChannel, func(c workflow.ReceiveChannel, more bool) {
			if more {
				var signal string
				c.Receive(ctx, &signal)
				if signal == "stop" {
					logger.Info("Received stop signal, shutting down")
					done = true
				}
			}
		})

		// Wait for either the timer or a stop signal
		selector.Select(ctx)

		// If the context was canceled, break out of the loop
		if ctx.Err() != nil {
			break
		}
	}

	logger.Info("BlockTimingsProcessorWorkflow completed", "network", params.NetworkName)
	return nil
}

// SizeCDFProcessorWorkflow processes size CDF data
func SizeCDFProcessorWorkflow(ctx workflow.Context, params SizeCDFProcessorParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting SizeCDFProcessorWorkflow", "network", params.NetworkName)

	// Set up activity options
	activityOptions := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    10 * time.Minute,
		HeartbeatTimeout:       time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	// Set processing interval
	processingInterval := 1 * time.Hour
	timeWindows := DefaultTimeWindows

	// Flag to track if workflow should exit
	var done bool

	// Main processing loop
	for !done {
		for _, window := range timeWindows {
			// Check if we need to process this window
			shouldProcess := false
			if err := workflow.ExecuteActivity(ctx, ShouldProcessActivity, DataProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  window.File,
			}).Get(ctx, &shouldProcess); err != nil {
				logger.Error("Failed to check if should process", "error", err)
				continue
			}

			if !shouldProcess {
				logger.Debug("Skipping processing", "network", params.NetworkName, "window", window.File)
				continue
			}

			// Process the window
			if err := workflow.ExecuteActivity(ctx, ProcessSizeCDFActivity, DataProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  window.File,
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to process size CDF", "error", err, "network", params.NetworkName, "window", window.File)
				continue
			}

			// Update the processor state
			if err := workflow.ExecuteActivity(ctx, UpdateProcessorStateActivity, DataProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  window.File,
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to update processor state", "error", err)
				continue
			}
		}

		// Wait for the next processing interval
		selector := workflow.NewSelector(ctx)

		// Add a timer for the processing interval
		timerFuture := workflow.NewTimer(ctx, processingInterval)
		selector.AddFuture(timerFuture, func(f workflow.Future) {
			// Timer fired, continue processing
		})

		// Add a signal handler for stop signals
		stopChannel := workflow.GetSignalChannel(ctx, "stop")
		selector.AddReceive(stopChannel, func(c workflow.ReceiveChannel, more bool) {
			if more {
				var signal string
				c.Receive(ctx, &signal)
				if signal == "stop" {
					logger.Info("Received stop signal, shutting down")
					done = true
				}
			}
		})

		// Wait for either the timer or a stop signal
		selector.Select(ctx)

		// If the context was canceled, break out of the loop
		if ctx.Err() != nil {
			break
		}
	}

	logger.Info("SizeCDFProcessorWorkflow completed", "network", params.NetworkName)
	return nil
}

// Activity definitions

// ShouldProcessActivity checks if a network/window should be processed
func ShouldProcessActivity(ctx context.Context, params DataProcessorParams) (bool, error) {
	// Implementation will check the processor state and current time
	// This is a placeholder
	return true, nil
}

// ProcessBlockTimingsActivity processes block timings data for a network and time window
func ProcessBlockTimingsActivity(ctx context.Context, params DataProcessorParams) error {
	// Implementation will process block timings
	// This is a placeholder
	return nil
}

// ProcessSizeCDFActivity processes size CDF data for a network and time window
func ProcessSizeCDFActivity(ctx context.Context, params DataProcessorParams) error {
	// Implementation will process size CDF data
	// This is a placeholder
	return nil
}

// UpdateProcessorStateActivity updates the processor state
func UpdateProcessorStateActivity(ctx context.Context, params DataProcessorParams) error {
	// Implementation will update the processor state
	// This is a placeholder
	return nil
}

// RegisterWorkflows registers all timing workflows
func RegisterWorkflows(logger logrus.FieldLogger) {
	logger.Info("Registering timing workflows")
	// These will be registered when the Temporal worker starts
}
