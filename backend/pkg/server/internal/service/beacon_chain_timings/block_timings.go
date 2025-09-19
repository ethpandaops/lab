package beacon_chain_timings

import (
	"context"
	"fmt"
	"path/filepath"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_chain_timings"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (b *BeaconChainTimings) processBlockTimings(ctx context.Context, networkName string, windowName string) error {
	b.log.WithFields(logrus.Fields{
		"network": networkName,
		"window":  windowName,
	}).Info("Processing block timings")

	startTime := time.Now()

	// Increment processing counter if metrics are available
	counter, err := b.metricsCollector.NewCounterVec(
		"processing_operations_total",
		"Total number of processing operations",
		[]string{"operation", "network", "window"},
	)
	if err == nil {
		counter.WithLabelValues("block_timings", networkName, windowName).Inc()
	}

	// Get time window config
	timeWindow, err := b.GetTimeWindowConfig(windowName)
	if err != nil {
		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("block_timings", networkName, windowName).Inc()
		}

		return fmt.Errorf("failed to get time window config: %w", err)
	}

	// Get time range for the window
	timeRange, err := b.getTimeRange(timeWindow) // Pass config instead of name
	if err != nil {
		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("block_timings", networkName, windowName).Inc()
		}

		return fmt.Errorf("failed to get time range: %w", err)
	}

	// Process block timings
	timingData, err := b.GetTimingData(ctx, networkName, timeRange, timeWindow) // Pass config
	if err != nil {
		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("block_timings", networkName, windowName).Inc()
		}

		return fmt.Errorf("failed to process block timings: %w", err)
	}

	// Store the results
	if err := b.storeTimingData(ctx, networkName, timeWindow.File, timingData); err != nil {
		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("block_timings", networkName, windowName).Inc()
		}

		return fmt.Errorf("failed to store timing data: %w", err)
	}

	// Record duration metric if available
	duration := time.Since(startTime).Seconds()

	histogram, err := b.metricsCollector.NewHistogramVec(
		"processing_duration_seconds",
		"Duration of processing operations in seconds",
		[]string{"operation", "network", "window"},
		nil,
	)
	if err == nil {
		histogram.WithLabelValues("block_timings", networkName, windowName).Observe(duration)
	}

	return nil
}

// getTimeWindowConfig finds the TimeWindowConfig by name
func (b *BeaconChainTimings) GetTimeWindowConfig(windowName string) (*pb.TimeWindowConfig, error) {
	for i := range b.config.TimeWindows { // Assuming config holds the windows
		localTW := b.config.TimeWindows[i]
		if localTW.File == windowName {
			// Explicitly create and return a pointer to a pb.TimeWindowConfig
			// using the correct fields and helper methods from the local config struct
			pbTW := &pb.TimeWindowConfig{
				Name:    localTW.Label, // Map Label to Name
				File:    localTW.File,
				RangeMs: localTW.GetRangeDuration().Milliseconds(), // Use helper and convert to ms
				StepMs:  localTW.GetStepDuration().Milliseconds(),  // Use helper and convert to ms
			}

			return pbTW, nil
		}
	}

	return nil, fmt.Errorf("unknown window: %s", windowName)
}

// getTimeRange returns the start and end time for a window config
func (b *BeaconChainTimings) getTimeRange(timeWindow *pb.TimeWindowConfig) (struct{ Start, End time.Time }, error) {
	result := struct {
		Start time.Time
		End   time.Time
	}{}

	now := time.Now().UTC()
	if timeWindow.RangeMs >= 0 {
		result.Start = now
		result.End = now.Add(time.Duration(timeWindow.RangeMs) * time.Millisecond)
	} else {
		result.Start = now.Add(time.Duration(timeWindow.RangeMs) * time.Millisecond)
		result.End = now
	}

	return result, nil
}

// processBlockTimingsData processes block timings data for a network, time range, and window config
func (b *BeaconChainTimings) GetTimingData(ctx context.Context, network string, timeRange struct{ Start, End time.Time }, timeWindow *pb.TimeWindowConfig) (*pb.TimingData, error) {
	stepSeconds := timeWindow.StepMs / 1000
	if stepSeconds <= 0 {
		return nil, fmt.Errorf("invalid step duration in window config: %d ms", timeWindow.StepMs)
	}

	b.log.WithFields(logrus.Fields{
		"network":      network,
		"time_range":   fmt.Sprintf("%s - %s", timeRange.Start.Format(time.RFC3339), timeRange.End.Format(time.RFC3339)),
		"step_seconds": stepSeconds,
	}).Info("Processing block timings data")

	// Format time range for the query
	startStr := timeRange.Start.Format("2006-01-02 15:04:05")
	endStr := timeRange.End.Format("2006-01-02 15:04:05")

	// Query the database for block timing information (matches Python logic)
	query := `
		WITH time_slots AS (
			SELECT
				toStartOfInterval(slot_start_date_time, INTERVAL ? second) as time_slot,
				meta_network_name,
				min(propagation_slot_start_diff) as min_arrival,
				max(propagation_slot_start_diff) as max_arrival,
				avg(propagation_slot_start_diff) as avg_arrival,
				quantile(0.05)(propagation_slot_start_diff) as p05_arrival,
				quantile(0.50)(propagation_slot_start_diff) as p50_arrival,
				quantile(0.95)(propagation_slot_start_diff) as p95_arrival,
				count(*) as total_blocks
			FROM beacon_api_eth_v1_events_block FINAL
			WHERE
				slot_start_date_time BETWEEN ? AND ?
				AND meta_network_name = ?
				AND propagation_slot_start_diff < 6000
			GROUP BY time_slot, meta_network_name
		)
		SELECT
			time_slot,
			min_arrival,
			max_arrival,
			avg_arrival,
			p05_arrival,
			p50_arrival,
			p95_arrival,
			total_blocks
		FROM time_slots
		ORDER BY time_slot ASC
	`

	ch, err := b.xatuCBTService.GetRawClickHouseClient(network)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network: %s", network)
	}

	rowsData, err := ch.Query(ctx, query, stepSeconds, startStr, endStr, network)
	if err != nil {
		return nil, fmt.Errorf("failed to query block timing data: %w", err)
	}

	rows := rowsData

	// Process the results
	result := &pb.TimingData{
		Network:    network,
		Timestamp:  timestamppb.New(time.Now().UTC()),
		Timestamps: make([]int64, 0),
		Mins:       make([]float64, 0),
		Maxs:       make([]float64, 0),
		Avgs:       make([]float64, 0),
		P05S:       make([]float64, 0),
		P50S:       make([]float64, 0),
		P95S:       make([]float64, 0),
		Blocks:     make([]int64, 0),
		// Intentionally not populating the 'validators' map
	}

	// Process results from the slice of maps
	for _, row := range rows {
		// Extract and assert types for each field from the map
		timeSlot, ok := row["time_slot"].(time.Time)
		if !ok {
			b.log.WithField("value", row["time_slot"]).Error("Failed to assert time_slot as time.Time")

			continue // Or return error
		}

		minArrival, ok := row["min_arrival"].(float64)
		if !ok {
			// Handle potential integer types from DB if necessary
			switch v := row["min_arrival"].(type) {
			case int64:
				minArrival = float64(v)
			case int32:
				minArrival = float64(v)
			case int:
				minArrival = float64(v)
			case uint64:
				minArrival = float64(v)
			default:
				b.log.
					WithField("value", row["min_arrival"]).
					WithField("type", fmt.Sprintf("%T", v)).
					Error("Failed to assert min_arrival as float64")

				continue
			}
		}

		maxArrival, ok := row["max_arrival"].(float64)
		if !ok {
			switch v := row["max_arrival"].(type) {
			case int64:
				maxArrival = float64(v)
			case int32:
				maxArrival = float64(v)
			case int:
				maxArrival = float64(v)
			case uint64:
				maxArrival = float64(v)
			default:
				b.log.
					WithField("value", row["max_arrival"]).
					WithField("type", fmt.Sprintf("%T", v)).
					Error("Failed to assert max_arrival as float64")

				continue
			}
		}

		avgArrival, ok := row["avg_arrival"].(float64)
		if !ok {
			b.log.WithField("value", row["avg_arrival"]).Error("Failed to assert avg_arrival as float64")

			continue
		}

		p05Arrival, ok := row["p05_arrival"].(float64)
		if !ok {
			b.log.WithField("value", row["p05_arrival"]).Error("Failed to assert p05_arrival as float64")

			continue
		}

		p50Arrival, ok := row["p50_arrival"].(float64)
		if !ok {
			b.log.WithField("value", row["p50_arrival"]).Error("Failed to assert p50_arrival as float64")

			continue
		}

		p95Arrival, ok := row["p95_arrival"].(float64)
		if !ok {
			b.log.WithField("value", row["p95_arrival"]).Error("Failed to assert p95_arrival as float64")

			continue
		}

		totalBlocks, ok := row["total_blocks"].(int64) // Assuming ClickHouse count returns Int64
		if !ok {
			// Handle potential uint64 if count returns that
			if uintVal, okUint := row["total_blocks"].(uint64); okUint {
				totalBlocks = int64(uintVal) //nolint:gosec // no risk of overflow
			} else {
				b.log.WithField("value", row["total_blocks"]).Error("Failed to assert total_blocks as int64")

				continue
			}
		}

		result.Timestamps = append(result.Timestamps, timeSlot.Unix())
		result.Mins = append(result.Mins, minArrival)
		result.Maxs = append(result.Maxs, maxArrival)
		result.Avgs = append(result.Avgs, avgArrival)
		result.P05S = append(result.P05S, p05Arrival) // Corrected case
		result.P50S = append(result.P50S, p50Arrival) // Corrected case
		result.P95S = append(result.P95S, p95Arrival) // Corrected case
		result.Blocks = append(result.Blocks, totalBlocks)
	}

	// No rows.Err() equivalent needed for slice iteration

	return result, nil
}

// storeTimingData stores timing data
func (b *BeaconChainTimings) storeTimingData(ctx context.Context, network, window string, data *pb.TimingData) error { // Use pb.TimingData
	// Create path for the data file
	// Ensure GetStoragePath is defined elsewhere or implement it here
	dataPath := GetStoragePath(filepath.Join("block_timings", network, window))

	// Store the data file
	if err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:    dataPath,
		Data:   data,
		Format: storage.CodecNameJSON,
	}); err != nil {
		return fmt.Errorf("failed to store data file: %w", err)
	}

	b.log.WithField("path", dataPath).Info("Stored block timings data")

	return nil
}
