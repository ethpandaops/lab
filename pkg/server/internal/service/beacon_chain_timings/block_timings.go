package beacon_chain_timings

import (
	"fmt"
	"path/filepath"
	"strconv"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (b *BeaconChainTimings) processBlockTimings(network *ethereum.Network, windowName string) error {
	b.log.WithFields(logrus.Fields{
		"network": network.Name,
		"window":  windowName,
	}).Info("Processing block timings")

	// Get time range for the window
	timeRange, err := b.getTimeRange(windowName)
	if err != nil {
		return fmt.Errorf("failed to get time range: %w", err)
	}

	// Process block timings
	timingData, err := b.processBlockTimingsData(network.Name, timeRange)
	if err != nil {
		return fmt.Errorf("failed to process block timings: %w", err)
	}

	// Store the results
	if err := b.storeTimingData(network.Name, windowName, timingData); err != nil {
		return fmt.Errorf("failed to store timing data: %w", err)
	}

	return nil
}

// getTimeRange returns the start and end time for a window
func (b *BeaconChainTimings) getTimeRange(window string) (struct{ Start, End time.Time }, error) {
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
	result.Start = result.End.Add(-time.Duration(timeWindow.RangeMs) * time.Millisecond)

	return result, nil
}

// processBlockTimingsData processes block timings data for a network and time range
func (b *BeaconChainTimings) processBlockTimingsData(network string, timeRange struct{ Start, End time.Time }) (*TimingData, error) {
	b.log.WithFields(logrus.Fields{
		"network":    network,
		"time_range": fmt.Sprintf("%s - %s", timeRange.Start.Format(time.RFC3339), timeRange.End.Format(time.RFC3339)),
	}).Info("Processing block timings data")

	// Format time range for the query
	startStr := timeRange.Start.Format("2006-01-02 15:04:05")
	endStr := timeRange.End.Format("2006-01-02 15:04:05")

	// Query the database for block timing information
	query := `
		WITH block_events AS (
			SELECT
				proposer_index,
				COUNT(*) as block_count,
				AVG(propagation_slot_start_diff) as avg_slot_diff,
				MIN(propagation_slot_start_diff) as min_slot_diff,
				MAX(propagation_slot_start_diff) as max_slot_diff,
				quantile(0.5)(propagation_slot_start_diff) as median_slot_diff,
				quantile(0.9)(propagation_slot_start_diff) as p90_slot_diff,
				quantile(0.99)(propagation_slot_start_diff) as p99_slot_diff
			FROM beacon_api_eth_v1_events_block
			WHERE 
				meta_network_name = $1
				AND event_date_time BETWEEN $2 AND $3
			GROUP BY proposer_index
		)
		SELECT 
			proposer_index,
			toInt32(block_count) as block_count,
			toInt32(avg_slot_diff) as avg_slot_diff,
			toInt32(min_slot_diff) as min_slot_diff,
			toInt32(max_slot_diff) as max_slot_diff,
			toInt32(median_slot_diff) as median_slot_diff,
			toInt32(p90_slot_diff) as p90_slot_diff,
			toInt32(p99_slot_diff) as p99_slot_diff
		FROM block_events
		ORDER BY block_count DESC
	`

	rows, err := b.xatuClient.GetClickhouseClientForNetwork(network).Query(query, network, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to query block timing data: %w", err)
	}

	// Process the results
	result := &TimingData{
		Network:    network,
		Timestamp:  timestamppb.New(time.Now().UTC()),
		Validators: make(map[string]*TimingData_ValidatorCategory),
	}

	for _, row := range rows {
		proposerIndex := fmt.Sprintf("%v", row["proposer_index"])

		// Create a validator entry if it doesn't exist
		if _, exists := result.Validators[proposerIndex]; !exists {
			result.Validators[proposerIndex] = &TimingData_ValidatorCategory{
				Categories: make(map[string]int32),
			}
		}

		// Add metrics for this validator
		for metric, value := range row {
			if metric != "proposer_index" {
				// Convert to int
				intValue, ok := value.(int32)
				if !ok {
					// Try to parse it from string
					if strValue, ok := value.(string); ok {
						parsedValue, err := strconv.Atoi(strValue)
						if err != nil {
							b.log.WithError(err).Warn("Failed to parse metric value to int")
							continue
						}
						intValue = int32(parsedValue)
					} else {
						b.log.Warn("Failed to convert metric value to int")
						continue
					}
				}
				result.Validators[proposerIndex].Categories[metric] = int32(intValue)
			}
		}
	}

	return result, nil
}

// storeTimingData stores timing data
func (b *BeaconChainTimings) storeTimingData(network, window string, data *TimingData) error {
	// Create path for the data file
	dataPath := filepath.Join(b.baseDir, "block_timings", network, fmt.Sprintf("%s.json", window))

	// Store the data file
	if _, err := b.storageClient.StoreEncoded(GetStoragePath(dataPath), data, storage.CodecNameJSON); err != nil {
		return fmt.Errorf("failed to store data file: %w", err)
	}

	return nil
}
