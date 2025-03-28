package xatu_public_contributors

import (
	"context"
	"fmt"
	"time"

	pb "github.com/ethpandaops/lab/pkg/proto/xatu_public_contributors"
	"github.com/sirupsen/logrus"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// Workflow names and task queues
const (
	ContributorsModuleWorkflowName     = "ContributorsModuleWorkflow"
	SummaryProcessorWorkflowName       = "SummaryProcessorWorkflow"
	CountriesProcessorWorkflowName     = "CountriesProcessorWorkflow"
	UsersProcessorWorkflowName         = "UsersProcessorWorkflow"
	UserSummariesProcessorWorkflowName = "UserSummariesProcessorWorkflow"
	ContributorsTaskQueue              = "contributors-task-queue"
)

// ContributorsModuleWorkflowParams are the parameters for the contributors module workflow
type ContributorsModuleWorkflowParams struct {
	Networks    []string
	TimeWindows []pb.TimeWindow
}

// ContributorsModuleWorkflow coordinates the Xatu Public Contributors processors
func ContributorsModuleWorkflow(ctx workflow.Context, params ContributorsModuleWorkflowParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting ContributorsModuleWorkflow")

	// Set up child workflow options
	childOptions := workflow.ChildWorkflowOptions{
		TaskQueue:          ContributorsTaskQueue,
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
		summaryWorkflowID := fmt.Sprintf("xatu-summary-%s", network)
		countriesWorkflowID := fmt.Sprintf("xatu-countries-%s", network)
		usersWorkflowID := fmt.Sprintf("xatu-users-%s", network)
		userSummariesWorkflowID := fmt.Sprintf("xatu-user-summaries-%s", network)

		// Start Summary processor workflow
		summaryOptions := workflow.ChildWorkflowOptions{
			WorkflowID: summaryWorkflowID,
		}
		summaryCtx := workflow.WithChildOptions(ctx, summaryOptions)
		workflow.ExecuteChildWorkflow(summaryCtx, SummaryProcessorWorkflowName, pb.SummaryProcessorParams{
			NetworkName: network,
		})

		// Start Countries processor workflow
		countriesOptions := workflow.ChildWorkflowOptions{
			WorkflowID: countriesWorkflowID,
		}
		countriesCtx := workflow.WithChildOptions(ctx, countriesOptions)
		workflow.ExecuteChildWorkflow(countriesCtx, CountriesProcessorWorkflowName, pb.CountriesProcessorParams{
			NetworkName: network,
		})

		// Start Users processor workflow
		usersOptions := workflow.ChildWorkflowOptions{
			WorkflowID: usersWorkflowID,
		}
		usersCtx := workflow.WithChildOptions(ctx, usersOptions)
		workflow.ExecuteChildWorkflow(usersCtx, UsersProcessorWorkflowName, pb.UsersProcessorParams{
			NetworkName: network,
		})

		// Start UserSummaries processor workflow
		userSummariesOptions := workflow.ChildWorkflowOptions{
			WorkflowID: userSummariesWorkflowID,
		}
		userSummariesCtx := workflow.WithChildOptions(ctx, userSummariesOptions)
		workflow.ExecuteChildWorkflow(userSummariesCtx, UserSummariesProcessorWorkflowName, pb.UserSummariesProcessorParams{
			NetworkName: network,
		})
	}

	// This is a long-running workflow that coordinates other workflows
	workflow.GetSignalChannel(ctx, "stop").Receive(ctx, nil)
	return nil
}

// SummaryProcessorWorkflow processes Xatu summary data
func SummaryProcessorWorkflow(ctx workflow.Context, params *pb.SummaryProcessorParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting SummaryProcessorWorkflow", "network", params.NetworkName)

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
	processingInterval := 5 * time.Minute // Default from Python code

	// Flag to track if workflow should exit
	var done bool

	// Main processing loop
	for !done {
		// Check if we need to process
		shouldProcess := false
		if err := workflow.ExecuteActivity(ctx, ShouldProcessActivity, pb.ProcessorParams{
			NetworkName: params.NetworkName,
			WindowName:  "summary",
		}).Get(ctx, &shouldProcess); err != nil {
			logger.Error("Failed to check if should process", "error", err)
		} else if shouldProcess {
			// Process summary
			if err := workflow.ExecuteActivity(ctx, ProcessSummaryActivity, pb.SummaryProcessorParams{
				NetworkName: params.NetworkName,
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to process summary", "error", err, "network", params.NetworkName)
			} else {
				// Update the processor state
				if err := workflow.ExecuteActivity(ctx, UpdateProcessorStateActivity, pb.ProcessorParams{
					NetworkName: params.NetworkName,
					WindowName:  "summary",
				}).Get(ctx, nil); err != nil {
					logger.Error("Failed to update processor state", "error", err)
				}
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

	logger.Info("SummaryProcessorWorkflow completed", "network", params.NetworkName)
	return nil
}

// CountriesProcessorWorkflow processes countries data across time windows
func CountriesProcessorWorkflow(ctx workflow.Context, params *pb.CountriesProcessorParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting CountriesProcessorWorkflow", "network", params.NetworkName)

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

	// Get time windows configuration
	var timeWindows []pb.TimeWindow
	if err := workflow.ExecuteActivity(ctx, GetTimeWindowsActivity, struct{}{}).Get(ctx, &timeWindows); err != nil {
		logger.Error("Failed to get time windows", "error", err)
		return err
	}

	// Set processing interval
	processingInterval := 5 * time.Minute // Default from Python code

	// Flag to track if workflow should exit
	var done bool

	// Main processing loop
	for !done {
		// Check if we need to process
		shouldProcess := false
		if err := workflow.ExecuteActivity(ctx, ShouldProcessActivity, pb.ProcessorParams{
			NetworkName: params.NetworkName,
			WindowName:  "countries",
		}).Get(ctx, &shouldProcess); err != nil {
			logger.Error("Failed to check if should process", "error", err)
		} else if shouldProcess {
			// Process each time window
			for _, window := range timeWindows {
				windowShouldProcess := false
				if err := workflow.ExecuteActivity(ctx, ShouldProcessWindowActivity, struct {
					NetworkName   string
					ProcessorName string
					WindowName    string
				}{
					NetworkName:   params.NetworkName,
					ProcessorName: "countries",
					WindowName:    window.File,
				}).Get(ctx, &windowShouldProcess); err != nil {
					logger.Error("Failed to check if should process window", "error", err)
					continue
				}

				if !windowShouldProcess {
					logger.Debug("Skipping window processing", "window", window.File)
					continue
				}

				// Process the window
				if err := workflow.ExecuteActivity(ctx, ProcessCountriesWindowActivity, struct {
					NetworkName string
					Window      pb.TimeWindow
				}{
					NetworkName: params.NetworkName,
					Window:      window,
				}).Get(ctx, nil); err != nil {
					logger.Error("Failed to process countries for window", "error", err, "window", window.File)
					continue
				}

				// Update window last processed time
				if err := workflow.ExecuteActivity(ctx, UpdateWindowProcessorStateActivity, struct {
					NetworkName   string
					ProcessorName string
					WindowName    string
				}{
					NetworkName:   params.NetworkName,
					ProcessorName: "countries",
					WindowName:    window.File,
				}).Get(ctx, nil); err != nil {
					logger.Error("Failed to update window processor state", "error", err)
				}
			}

			// Update the processor state
			if err := workflow.ExecuteActivity(ctx, UpdateProcessorStateActivity, pb.ProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  "countries",
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to update processor state", "error", err)
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

	logger.Info("CountriesProcessorWorkflow completed", "network", params.NetworkName)
	return nil
}

// UsersProcessorWorkflow processes users data across time windows
func UsersProcessorWorkflow(ctx workflow.Context, params *pb.UsersProcessorParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting UsersProcessorWorkflow", "network", params.NetworkName)

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

	// Get time windows configuration
	var timeWindows []pb.TimeWindow
	if err := workflow.ExecuteActivity(ctx, GetTimeWindowsActivity, struct{}{}).Get(ctx, &timeWindows); err != nil {
		logger.Error("Failed to get time windows", "error", err)
		return err
	}

	// Set processing interval
	processingInterval := 5 * time.Minute // Default from Python code

	// Flag to track if workflow should exit
	var done bool

	// Main processing loop
	for !done {
		// Similar structure to CountriesProcessorWorkflow
		shouldProcess := false
		if err := workflow.ExecuteActivity(ctx, ShouldProcessActivity, pb.ProcessorParams{
			NetworkName: params.NetworkName,
			WindowName:  "users",
		}).Get(ctx, &shouldProcess); err != nil {
			logger.Error("Failed to check if should process", "error", err)
		} else if shouldProcess {
			// Process each time window
			for _, window := range timeWindows {
				windowShouldProcess := false
				if err := workflow.ExecuteActivity(ctx, ShouldProcessWindowActivity, struct {
					NetworkName   string
					ProcessorName string
					WindowName    string
				}{
					NetworkName:   params.NetworkName,
					ProcessorName: "users",
					WindowName:    window.File,
				}).Get(ctx, &windowShouldProcess); err != nil {
					logger.Error("Failed to check if should process window", "error", err)
					continue
				}

				if !windowShouldProcess {
					logger.Debug("Skipping window processing", "window", window.File)
					continue
				}

				// Process the window
				if err := workflow.ExecuteActivity(ctx, ProcessUsersWindowActivity, struct {
					NetworkName string
					Window      pb.TimeWindow
				}{
					NetworkName: params.NetworkName,
					Window:      window,
				}).Get(ctx, nil); err != nil {
					logger.Error("Failed to process users for window", "error", err, "window", window.File)
					continue
				}

				// Update window last processed time
				if err := workflow.ExecuteActivity(ctx, UpdateWindowProcessorStateActivity, struct {
					NetworkName   string
					ProcessorName string
					WindowName    string
				}{
					NetworkName:   params.NetworkName,
					ProcessorName: "users",
					WindowName:    window.File,
				}).Get(ctx, nil); err != nil {
					logger.Error("Failed to update window processor state", "error", err)
				}
			}

			// Update the processor state
			if err := workflow.ExecuteActivity(ctx, UpdateProcessorStateActivity, pb.ProcessorParams{
				NetworkName: params.NetworkName,
				WindowName:  "users",
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to update processor state", "error", err)
			}
		}

		// Wait for the next processing interval using the same pattern as above
		selector := workflow.NewSelector(ctx)
		timerFuture := workflow.NewTimer(ctx, processingInterval)
		selector.AddFuture(timerFuture, func(f workflow.Future) {
			// Timer fired, continue processing
		})
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
		selector.Select(ctx)
		if ctx.Err() != nil {
			break
		}
	}

	logger.Info("UsersProcessorWorkflow completed", "network", params.NetworkName)
	return nil
}

// UserSummariesProcessorWorkflow processes user summaries
func UserSummariesProcessorWorkflow(ctx workflow.Context, params *pb.UserSummariesProcessorParams) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting UserSummariesProcessorWorkflow", "network", params.NetworkName)

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
	processingInterval := 5 * time.Minute // Default from Python code

	// Flag to track if workflow should exit
	var done bool

	// Main processing loop
	for !done {
		// Simpler structure as this doesn't use time windows
		shouldProcess := false
		if err := workflow.ExecuteActivity(ctx, ShouldProcessActivity, pb.ProcessorParams{
			NetworkName: params.NetworkName,
			WindowName:  "user_summaries",
		}).Get(ctx, &shouldProcess); err != nil {
			logger.Error("Failed to check if should process", "error", err)
		} else if shouldProcess {
			// Process user summaries
			if err := workflow.ExecuteActivity(ctx, ProcessUserSummariesActivity, pb.UserSummariesProcessorParams{
				NetworkName: params.NetworkName,
			}).Get(ctx, nil); err != nil {
				logger.Error("Failed to process user summaries", "error", err, "network", params.NetworkName)
			} else {
				// Update the processor state
				if err := workflow.ExecuteActivity(ctx, UpdateProcessorStateActivity, pb.ProcessorParams{
					NetworkName: params.NetworkName,
					WindowName:  "user_summaries",
				}).Get(ctx, nil); err != nil {
					logger.Error("Failed to update processor state", "error", err)
				}
			}
		}

		// Wait for the next processing interval using the same pattern as above
		selector := workflow.NewSelector(ctx)
		timerFuture := workflow.NewTimer(ctx, processingInterval)
		selector.AddFuture(timerFuture, func(f workflow.Future) {
			// Timer fired, continue processing
		})
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
		selector.Select(ctx)
		if ctx.Err() != nil {
			break
		}
	}

	logger.Info("UserSummariesProcessorWorkflow completed", "network", params.NetworkName)
	return nil
}

// Activity interfaces - these will be implemented in contributors_activities.go

// ShouldProcessActivity checks if a processor should run
func ShouldProcessActivity(ctx context.Context, params *pb.ProcessorParams) (bool, error) {
	return false, fmt.Errorf("not implemented")
}

// ShouldProcessWindowActivity checks if a specific window should be processed
func ShouldProcessWindowActivity(ctx context.Context, params interface{}) (bool, error) {
	return false, fmt.Errorf("not implemented")
}

// GetTimeWindowsActivity retrieves the configured time windows
func GetTimeWindowsActivity(ctx context.Context, _ struct{}) ([]pb.TimeWindow, error) {
	return nil, fmt.Errorf("not implemented")
}

// ProcessSummaryActivity processes summary data
func ProcessSummaryActivity(ctx context.Context, params *pb.SummaryProcessorParams) error {
	return fmt.Errorf("not implemented")
}

// ProcessCountriesWindowActivity processes countries data for a specific time window
func ProcessCountriesWindowActivity(ctx context.Context, params interface{}) error {
	return fmt.Errorf("not implemented")
}

// ProcessUsersWindowActivity processes users data for a specific time window
func ProcessUsersWindowActivity(ctx context.Context, params interface{}) error {
	return fmt.Errorf("not implemented")
}

// ProcessUserSummariesActivity processes user summaries
func ProcessUserSummariesActivity(ctx context.Context, params *pb.UserSummariesProcessorParams) error {
	return fmt.Errorf("not implemented")
}

// UpdateProcessorStateActivity updates the last processed time for a processor
func UpdateProcessorStateActivity(ctx context.Context, params *pb.ProcessorParams) error {
	return fmt.Errorf("not implemented")
}

// UpdateWindowProcessorStateActivity updates the last processed time for a specific window
func UpdateWindowProcessorStateActivity(ctx context.Context, params interface{}) error {
	return fmt.Errorf("not implemented")
}

// RegisterWorkflows registers all workflows with Temporal
func RegisterWorkflows(logger logrus.FieldLogger) {
	logger.Info("Registering Xatu Public Contributors workflows")
	workflows := []interface{}{
		ContributorsModuleWorkflow,
		SummaryProcessorWorkflow,
		CountriesProcessorWorkflow,
		UsersProcessorWorkflow,
		UserSummariesProcessorWorkflow,
	}

	activities := []interface{}{
		ShouldProcessActivity,
		ShouldProcessWindowActivity,
		GetTimeWindowsActivity,
		ProcessSummaryActivity,
		ProcessCountriesWindowActivity,
		ProcessUsersWindowActivity,
		ProcessUserSummariesActivity,
		UpdateProcessorStateActivity,
		UpdateWindowProcessorStateActivity,
	}

	// These will be registered when we create the implementation
}
