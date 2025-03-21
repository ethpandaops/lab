package timings

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/sirupsen/logrus"
)

// Activities contains dependencies for activities
type Activities struct {
	logger  logrus.FieldLogger
	db      clickhouse.Client
	s3      storage.Client
	baseDir string
}

// NewActivities creates a new Activities
func NewActivities(logger logrus.FieldLogger, db clickhouse.Client, s3 storage.Client, baseDir string) *Activities {
	return &Activities{
		logger:  logger,
		db:      db,
		s3:      s3,
		baseDir: baseDir,
	}
}

// ShouldProcessActivity checks if a network/window should be processed
func (a *Activities) ShouldProcessActivity(ctx context.Context, params DataProcessorParams) (bool, error) {
	a.logger.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.WindowName,
	}).Debug("Checking if should process")

	// Get the processor state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.WindowName)
	if err != nil {
		return false, fmt.Errorf("failed to get processor state: %w", err)
	}

	// If we don't have state yet or it's been long enough since the last update, process
	if state.LastProcessed.IsZero() {
		return true, nil
	}

	// Check if it's been long enough since the last update
	timeSinceLastUpdate := time.Since(state.LastProcessed)
	if timeSinceLastUpdate > 15*time.Minute {
		return true, nil
	}

	return false, nil
}

// ProcessBlockTimingsActivity processes block timings data for a network and time window
func (a *Activities) ProcessBlockTimingsActivity(ctx context.Context, params DataProcessorParams) error {
	a.logger.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.WindowName,
	}).Info("Processing block timings")

	// Get time range for the window
	timeRange, err := a.getTimeRange(params.WindowName)
	if err != nil {
		return fmt.Errorf("failed to get time range: %w", err)
	}

	// Process block timings
	timingData, err := a.processBlockTimings(ctx, params.NetworkName, timeRange)
	if err != nil {
		return fmt.Errorf("failed to process block timings: %w", err)
	}

	// Store the results
	if err := a.storeTimingData(ctx, params.NetworkName, params.WindowName, timingData); err != nil {
		return fmt.Errorf("failed to store timing data: %w", err)
	}

	return nil
}

// ProcessSizeCDFActivity processes size CDF data for a network and time window
func (a *Activities) ProcessSizeCDFActivity(ctx context.Context, params DataProcessorParams) error {
	a.logger.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.WindowName,
	}).Info("Processing size CDF data")

	// Get time range for the window
	timeRange, err := a.getTimeRange(params.WindowName)
	if err != nil {
		return fmt.Errorf("failed to get time range: %w", err)
	}

	// Process size CDF data
	sizeCDFData, err := a.processSizeCDF(ctx, params.NetworkName, timeRange)
	if err != nil {
		return fmt.Errorf("failed to process size CDF data: %w", err)
	}

	// Store the results
	if err := a.storeSizeCDFData(ctx, params.NetworkName, params.WindowName, sizeCDFData); err != nil {
		return fmt.Errorf("failed to store size CDF data: %w", err)
	}

	return nil
}

// UpdateProcessorStateActivity updates the processor state
func (a *Activities) UpdateProcessorStateActivity(ctx context.Context, params DataProcessorParams) error {
	a.logger.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.WindowName,
	}).Debug("Updating processor state")

	// Get the current state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.WindowName)
	if err != nil {
		state = &ProcessorState{
			Network:       params.NetworkName,
			LastProcessed: time.Time{},
		}
	}

	// Update the state
	state.LastProcessed = time.Now().UTC()

	// Store the state
	if err := a.storeProcessorState(ctx, state, params.NetworkName, params.WindowName); err != nil {
		return fmt.Errorf("failed to store processor state: %w", err)
	}

	return nil
}

// Helper methods

// getProcessorState retrieves the processor state for a network and window
func (a *Activities) getProcessorState(ctx context.Context, network, window string) (*ProcessorState, error) {
	// Create path for the state file
	statePath := filepath.Join(a.baseDir, "state", network, fmt.Sprintf("%s.json", window))

	// List files to check if the state file exists
	files, err := a.s3.List(statePath)
	if err != nil {
		return nil, fmt.Errorf("failed to list state files: %w", err)
	}

	fileExists := len(files) > 0
	if !fileExists {
		// Return default state
		return &ProcessorState{
			Network:       network,
			LastProcessed: time.Time{},
		}, nil
	}

	// Get the state file from S3
	data, err := a.s3.Get(statePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get state file: %w", err)
	}

	// Unmarshal the state file
	var state ProcessorState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("failed to unmarshal state file: %w", err)
	}

	return &state, nil
}

// storeProcessorState stores the processor state for a network and window
func (a *Activities) storeProcessorState(ctx context.Context, state *ProcessorState, network, window string) error {
	// Create path for the state file
	statePath := filepath.Join(a.baseDir, "state", network, fmt.Sprintf("%s.json", window))

	// Marshal the state file
	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal state file: %w", err)
	}

	// Store the state file in S3 atomically
	if err := a.s3.StoreAtomic(statePath, data); err != nil {
		return fmt.Errorf("failed to store state file: %w", err)
	}

	return nil
}

// getTimeRange returns the start and end time for a window
func (a *Activities) getTimeRange(window string) (struct{ Start, End time.Time }, error) {
	result := struct {
		Start time.Time
		End   time.Time
	}{
		End: time.Now().UTC(),
	}

	// Find the time window config
	var timeWindow *TimeWindowConfig
	for _, tw := range DefaultTimeWindows {
		if tw.File == window {
			timeWindow = &tw
			break
		}
	}

	if timeWindow == nil {
		return result, fmt.Errorf("unknown window: %s", window)
	}

	// Calculate the start time
	result.Start = result.End.Add(-timeWindow.Range)

	return result, nil
}

// processBlockTimings processes block timings data for a network and time range
func (a *Activities) processBlockTimings(ctx context.Context, network string, timeRange struct{ Start, End time.Time }) (*TimingData, error) {
	// This is where we would query the database and process the results
	// For now, this is a placeholder
	// TODO: Implement the actual logic

	// Create a dummy result
	result := &TimingData{
		Network:    network,
		TimeStamp:  time.Now().UTC(),
		Validators: make(map[string]map[string]int),
	}

	return result, nil
}

// processSizeCDF processes size CDF data for a network and time range
func (a *Activities) processSizeCDF(ctx context.Context, network string, timeRange struct{ Start, End time.Time }) (*SizeCDFData, error) {
	// This is where we would query the database and process the results
	// For now, this is a placeholder
	// TODO: Implement the actual logic

	// Create a dummy result
	result := &SizeCDFData{
		Network:    network,
		TimeStamp:  time.Now().UTC(),
		MEV:        make(map[string]float64),
		NonMEV:     make(map[string]float64),
		SoloMEV:    make(map[string]float64),
		SoloNonMEV: make(map[string]float64),
		All:        make(map[string]float64),
	}

	return result, nil
}

// storeTimingData stores timing data in S3
func (a *Activities) storeTimingData(ctx context.Context, network, window string, data *TimingData) error {
	// Create path for the data file
	dataPath := filepath.Join(a.baseDir, "timings", network, fmt.Sprintf("%s.json", window))

	// Marshal the data file
	jsonData, err := data.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal data file: %w", err)
	}

	// Store the data file in S3
	if err := a.s3.StoreAtomic(dataPath, []byte(jsonData)); err != nil {
		return fmt.Errorf("failed to store data file: %w", err)
	}

	return nil
}

// storeSizeCDFData stores size CDF data in S3
func (a *Activities) storeSizeCDFData(ctx context.Context, network, window string, data *SizeCDFData) error {
	// Create path for the data file
	dataPath := filepath.Join(a.baseDir, "size_cdf", network, fmt.Sprintf("%s.json", window))

	// Marshal the data file
	jsonData, err := data.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal data file: %w", err)
	}

	// Store the data file in S3
	if err := a.s3.StoreAtomic(dataPath, []byte(jsonData)); err != nil {
		return fmt.Errorf("failed to store data file: %w", err)
	}

	return nil
}
