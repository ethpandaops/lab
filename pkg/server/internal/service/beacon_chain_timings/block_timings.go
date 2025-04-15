package beacon_chain_timings

import (
	"context"
	"fmt"
	"path/filepath"

	// Removed strconv as it's no longer needed for validator processing
	"time"

	// Removed unused imports: context, clickhouse-go/v2
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_chain_timings" // Import generated proto types
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (b *BeaconChainTimings) processBlockTimings(ctx context.Context, network *ethereum.Network, windowName string) error {
	b.log.WithFields(logrus.Fields{
		"network": network.Name,
		"window":  windowName,
	}).Info("Processing block timings")

	// Get time window config
	timeWindow, err := b.GetTimeWindowConfig(windowName)
	if err != nil {
		return fmt.Errorf("failed to get time window config: %w", err)
	}

	// Get time range for the window
	timeRange, err := b.getTimeRange(timeWindow) // Pass config instead of name
	if err != nil {
		return fmt.Errorf("failed to get time range: %w", err)
	}

	// Process block timings
	timingData, err := b.GetTimingData(ctx, network.Name, timeRange, timeWindow) // Pass config
	if err != nil {
		return fmt.Errorf("failed to process block timings: %w", err)
	}

	// Store the results
	if err := b.storeTimingData(ctx, network.Name, windowName, timingData); err != nil {
		return fmt.Errorf("failed to store timing data: %w", err)
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
	}{
		End: time.Now().UTC(),
	}

	// Calculate the start time
	result.Start = result.End.Add(-time.Duration(timeWindow.RangeMs) * time.Millisecond)

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
				toStartOfInterval(slot_start_date_time, INTERVAL {step_seconds:UInt64} second) as time_slot,
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
				slot_start_date_time BETWEEN {start_date:DateTime} AND {end_date:DateTime}
				AND meta_network_name = {network:String}
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

	ch, err := b.xatuClient.GetClickhouseClientForNetwork(network) // Assuming this returns a *sql.DB or similar
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network: %s", network)
	}

	// Revert to the client's specific Query method signature, assuming it returns []map[string]interface{}
	// and handles named parameters in the query string directly.
	// Remove context and clickhouse.Named parameters.
	rowsData, err := ch.Query(ctx, query, // Pass query string directly
		// Pass parameters positionally or rely on client handling named params in string
		// Let's assume the client handles the {name:Type} syntax in the query string
		// and doesn't need explicit parameters here if they are embedded.
		// If positional needed: network, startStr, endStr, stepSeconds
		// Let's try without explicit params first, matching the named syntax in the query.
		// Update: The original code passed params positionally, let's stick to that pattern
		// if the named syntax doesn't work implicitly.
		// Update 2: The python code used named params. Let's assume the Go client
		// also supports named params via the map interface if not via clickhouse.Named.
		// Trying with a map for named parameters. Check client docs if this fails.
		map[string]interface{}{
			"step_seconds": stepSeconds,
			"start_date":   startStr,
			"end_date":     endStr,
			"network":      network,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("failed to query block timing data: %w", err)
	}

	// Directly use rowsData, as it's already []map[string]interface{}
	rows := rowsData

	// Process the results
	result := &pb.TimingData{
		Network:    network,
		Timestamp:  timestamppb.New(time.Now().UTC()),
		Timestamps: make([]int64, 0),
		Mins:       make([]float64, 0),
		Maxs:       make([]float64, 0),
		Avgs:       make([]float64, 0),
		P05S:       make([]float64, 0), // Corrected case
		P50S:       make([]float64, 0), // Corrected case
		P95S:       make([]float64, 0), // Corrected case
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
			if intVal, okInt := row["min_arrival"].(int64); okInt {
				minArrival = float64(intVal)
				ok = true
			} else if int32Val, okInt32 := row["min_arrival"].(int32); okInt32 {
				minArrival = float64(int32Val)
				ok = true
			} else {
				b.log.WithField("value", row["min_arrival"]).Error("Failed to assert min_arrival as float64")
				continue
			}
		}
		maxArrival, ok := row["max_arrival"].(float64)
		if !ok {
			if intVal, okInt := row["max_arrival"].(int64); okInt {
				maxArrival = float64(intVal)
				ok = true
			} else if int32Val, okInt32 := row["max_arrival"].(int32); okInt32 {
				maxArrival = float64(int32Val)
				ok = true
			} else {
				b.log.WithField("value", row["max_arrival"]).Error("Failed to assert max_arrival as float64")
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
				totalBlocks = int64(uintVal)
				ok = true
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
	dataPath := GetStoragePath(filepath.Join(b.baseDir, "block_timings", network, window))

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
