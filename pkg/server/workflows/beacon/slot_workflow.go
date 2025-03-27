package beacon

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
	SlotProcessWorkflowName     = "SlotProcessWorkflow"
	ProcessHeadSlotWorkflowName = "ProcessHeadSlotWorkflow"
	ProcessBacklogWorkflowName  = "ProcessBacklogWorkflow"
	ProcessMiddleWorkflowName   = "ProcessMiddleWorkflow"
	BeaconTaskQueue             = "beacon-task-queue"
	BacklogSleepMs              = 500 // Sleep between backlog slot processing
)

// SlotProcessWorkflowParams are the parameters for the slot process workflow
type SlotProcessWorkflowParams struct {
	NetworkName string
}

// SlotProcessWorkflow is the main workflow that coordinates head, backlog, and middle processing
func SlotProcessWorkflow(ctx workflow.Context, params SlotProcessWorkflowParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting SlotProcessWorkflow", "network", params.NetworkName)

	// Set workflow options with retry policy
	childOptions := workflow.ChildWorkflowOptions{
		WorkflowID:         fmt.Sprintf("process-head-slot-%s", params.NetworkName),
		TaskQueue:          BeaconTaskQueue,
		WorkflowRunTimeout: 24 * time.Hour,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    10,
		},
	}
	ctx = workflow.WithChildOptions(ctx, childOptions)

	// Start head processor as a child workflow
	headFuture := workflow.ExecuteChildWorkflow(ctx, ProcessHeadSlotWorkflowName, ProcessHeadSlotParams{
		NetworkName: params.NetworkName,
	})

	// Set options for backlog processor
	backlogOptions := workflow.ChildWorkflowOptions{
		WorkflowID:         fmt.Sprintf("process-backlog-%s", params.NetworkName),
		TaskQueue:          BeaconTaskQueue,
		WorkflowRunTimeout: 24 * time.Hour,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    10,
		},
	}
	backlogCtx := workflow.WithChildOptions(ctx, backlogOptions)

	// Start backlog processor as a child workflow
	backlogFuture := workflow.ExecuteChildWorkflow(backlogCtx, ProcessBacklogWorkflowName, ProcessBacklogParams{
		NetworkName: params.NetworkName,
	})

	// Set options for middle processor
	middleOptions := workflow.ChildWorkflowOptions{
		WorkflowID:         fmt.Sprintf("process-middle-%s", params.NetworkName),
		TaskQueue:          BeaconTaskQueue,
		WorkflowRunTimeout: 24 * time.Hour,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    10,
		},
	}
	middleCtx := workflow.WithChildOptions(ctx, middleOptions)

	// Start middle processor as a child workflow
	middleFuture := workflow.ExecuteChildWorkflow(middleCtx, ProcessMiddleWorkflowName, ProcessMiddleParams{
		NetworkName: params.NetworkName,
	})

	// Wait for all workflows to complete
	if err := headFuture.Get(ctx, nil); err != nil {
		logger.Error("Head processor failed", "error", err)
		return err
	}

	if err := backlogFuture.Get(ctx, nil); err != nil {
		logger.Error("Backlog processor failed", "error", err)
		return err
	}

	if err := middleFuture.Get(ctx, nil); err != nil {
		logger.Error("Middle processor failed", "error", err)
		return err
	}

	logger.Info("SlotProcessWorkflow completed successfully")
	return nil
}

// ProcessHeadSlotParams are the parameters for the head slot process workflow
type ProcessHeadSlotParams struct {
	NetworkName string
}

// ProcessHeadSlotWorkflow processes the head slot (most recent slot)
func ProcessHeadSlotWorkflow(ctx workflow.Context, params ProcessHeadSlotParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting ProcessHeadSlotWorkflow", "network", params.NetworkName)

	// Create a timer for periodic execution
	heartbeatTimeout := 12 * time.Second

	for {
		// Process the current head slot
		var result bool
		processSlotCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
			ScheduleToStartTimeout: time.Minute,
			StartToCloseTimeout:    5 * time.Minute,
			HeartbeatTimeout:       heartbeatTimeout,
			RetryPolicy: &temporal.RetryPolicy{
				InitialInterval:    time.Second,
				BackoffCoefficient: 2.0,
				MaximumInterval:    time.Minute,
				MaximumAttempts:    3,
			},
		})

		// Get the current slot
		var currentSlot int64
		if err := workflow.ExecuteActivity(processSlotCtx, GetCurrentSlotActivity, GetCurrentSlotParams{
			NetworkName: params.NetworkName,
		}).Get(processSlotCtx, &currentSlot); err != nil {
			logger.Error("Failed to get current slot", "error", err)
			// Wait before retrying
			_ = workflow.Sleep(ctx, 30*time.Second)
			continue
		}

		// Process the current slot
		if err := workflow.ExecuteActivity(processSlotCtx, ProcessSlotActivity, ProcessSlotParams{
			NetworkName: params.NetworkName,
			Slot:        currentSlot,
		}).Get(processSlotCtx, &result); err != nil {
			logger.Error("Failed to process head slot", "slot", currentSlot, "error", err)
		} else if result {
			logger.Info("Successfully processed head slot", "slot", currentSlot)
		}

		// Wait for the next slot
		_ = workflow.Sleep(ctx, 12*time.Second)
	}
}

// ProcessBacklogParams are the parameters for the backlog process workflow
type ProcessBacklogParams struct {
	NetworkName string
}

// ProcessBacklogWorkflow processes historical slots (backlog)
func ProcessBacklogWorkflow(ctx workflow.Context, params ProcessBacklogParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting ProcessBacklogWorkflow", "network", params.NetworkName)

	// Set up activity options
	activityOptions := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    5 * time.Minute,
		HeartbeatTimeout:       30 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	activityCtx := workflow.WithActivityOptions(ctx, activityOptions)

	// Get the processor state
	var state SlotProcessorState
	if err := workflow.ExecuteActivity(activityCtx, GetProcessorStateActivity, GetProcessorStateParams{
		NetworkName: params.NetworkName,
		Direction:   "backward",
	}).Get(activityCtx, &state); err != nil {
		logger.Error("Failed to get processor state", "error", err)
		return err
	}

	// If we don't have a target or current slot, calculate the target backlog slot
	if state.TargetSlot == nil || state.CurrentSlot == nil {
		var targetSlot int64
		if err := workflow.ExecuteActivity(activityCtx, CalculateTargetBacklogSlotActivity, CalculateTargetBacklogSlotParams{
			NetworkName: params.NetworkName,
		}).Get(activityCtx, &targetSlot); err != nil {
			logger.Error("Failed to calculate target backlog slot", "error", err)
			return err
		}

		// Update the state
		targetSlotVal := targetSlot
		state.TargetSlot = &targetSlotVal
		state.CurrentSlot = &targetSlotVal
		state.Direction = "backward"
	}

	// Main processing loop
	for {
		if state.CurrentSlot == nil {
			logger.Error("Current slot is nil")
			return fmt.Errorf("current slot is nil")
		}

		// Process the current slot
		var result bool
		if err := workflow.ExecuteActivity(activityCtx, ProcessSlotActivity, ProcessSlotParams{
			NetworkName: params.NetworkName,
			Slot:        *state.CurrentSlot,
		}).Get(activityCtx, &result); err != nil {
			logger.Error("Failed to process backlog slot", "slot", *state.CurrentSlot, "error", err)
		} else if result {
			logger.Info("Successfully processed backlog slot", "slot", *state.CurrentSlot)
			state.LastProcessedSlot = state.CurrentSlot
		}

		// Determine the next slot to process based on direction
		if state.Direction == "backward" {
			currentSlot := *state.CurrentSlot - 1
			state.CurrentSlot = &currentSlot
		} else {
			currentSlot := *state.CurrentSlot + 1
			state.CurrentSlot = &currentSlot
		}

		// Save the state
		if err := workflow.ExecuteActivity(activityCtx, SaveProcessorStateActivity, SaveProcessorStateParams{
			NetworkName: params.NetworkName,
			State:       state,
		}).Get(activityCtx, nil); err != nil {
			logger.Error("Failed to save processor state", "error", err)
		}

		// Sleep between backlog slot processing
		_ = workflow.Sleep(ctx, time.Millisecond*BacklogSleepMs)
	}
}

// ProcessMiddleParams are the parameters for the middle slot process workflow
type ProcessMiddleParams struct {
	NetworkName string
}

// ProcessMiddleWorkflow processes slots in the middle (between head and backlog)
func ProcessMiddleWorkflow(ctx workflow.Context, params ProcessMiddleParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting ProcessMiddleWorkflow", "network", params.NetworkName)

	// This workflow runs periodically to check for and process any missing slots

	// Set up activity options
	activityOptions := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:    5 * time.Minute,
		HeartbeatTimeout:       30 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	activityCtx := workflow.WithActivityOptions(ctx, activityOptions)

	for {
		// Check for missing slots and process them
		if err := workflow.ExecuteActivity(activityCtx, ProcessMissingSlots, ProcessMissingSlotParams{
			NetworkName: params.NetworkName,
		}).Get(activityCtx, nil); err != nil {
			logger.Error("Failed to process missing slots", "error", err)
		}

		// Run every hour
		_ = workflow.Sleep(ctx, time.Hour)
	}
}

// Activity parameter types

// GetCurrentSlotParams are the parameters for the get current slot activity
type GetCurrentSlotParams struct {
	NetworkName string
}

// ProcessSlotParams are the parameters for the process slot activity
type ProcessSlotParams struct {
	NetworkName string
	Slot        int64
}

// GetProcessorStateParams are the parameters for the get processor state activity
type GetProcessorStateParams struct {
	NetworkName string
	Direction   string
}

// SaveProcessorStateParams are the parameters for the save processor state activity
type SaveProcessorStateParams struct {
	NetworkName string
	State       SlotProcessorState
}

// CalculateTargetBacklogSlotParams are the parameters for calculating the target backlog slot
type CalculateTargetBacklogSlotParams struct {
	NetworkName string
}

// ProcessMissingSlotParams are the parameters for processing missing slots
type ProcessMissingSlotParams struct {
	NetworkName string
}

// Activity definitions

// GetCurrentSlotActivity returns the current slot for a network
func GetCurrentSlotActivity(ctx context.Context, params GetCurrentSlotParams) (int64, error) {
	// Implementation will query ClickHouse for the current slot
	// This is a placeholder
	return 0, nil
}

// ProcessSlotActivity processes a single slot
func ProcessSlotActivity(ctx context.Context, params ProcessSlotParams) (bool, error) {
	// Implementation will process a slot
	// This is a placeholder
	return false, nil
}

// GetProcessorStateActivity gets the processor state
func GetProcessorStateActivity(ctx context.Context, params GetProcessorStateParams) (SlotProcessorState, error) {
	// Implementation will get the processor state from storage
	// This is a placeholder
	return SlotProcessorState{}, nil
}

// SaveProcessorStateActivity saves the processor state
func SaveProcessorStateActivity(ctx context.Context, params SaveProcessorStateParams) error {
	// Implementation will save the processor state to storage
	// This is a placeholder
	return nil
}

// CalculateTargetBacklogSlotActivity calculates the target backlog slot
func CalculateTargetBacklogSlotActivity(ctx context.Context, params CalculateTargetBacklogSlotParams) (int64, error) {
	// Implementation will calculate the target backlog slot
	// This is a placeholder
	return 0, nil
}

// ProcessMissingSlots checks for and processes missing slots
func ProcessMissingSlots(ctx context.Context, params ProcessMissingSlotParams) error {
	// Implementation will check for and process missing slots
	// This is a placeholder
	return nil
}

// RegisterWorkflows registers all beacon workflows
func RegisterWorkflows(logger logrus.FieldLogger) {
	logger.Info("Registering beacon workflows")
	// These will be registered when the Temporal worker starts
}
