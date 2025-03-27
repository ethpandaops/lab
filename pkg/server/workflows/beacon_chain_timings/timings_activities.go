package timings

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"path/filepath"
	"sort"
	"strconv"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	pb "github.com/ethpandaops/lab/pkg/proto/beacon_chain_timings"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Activities holds implementations for all beacon chain timings activities
type Activities struct {
	log     logrus.FieldLogger
	lab     *lab.Lab // Add lab instance
	baseDir string
}

// NewActivities creates a new Activities
func NewActivities(log logrus.FieldLogger, lab *lab.Lab, baseDir string) *Activities {
	return &Activities{
		log:     log,
		lab:     lab,
		baseDir: baseDir,
	}
}

// ShouldProcessActivity checks if a network/window should be processed
func (a *Activities) ShouldProcessActivity(ctx context.Context, params *pb.DataProcessorParams) (bool, error) {
	a.log.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.WindowName,
	}).Debug("Checking if should process")

	// Get the processor state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.WindowName)
	if err != nil {
		return false, fmt.Errorf("failed to get processor state: %w", err)
	}

	// If we don't have state yet or it's been long enough since the last update, process
	if state.LastProcessed.AsTime().IsZero() {
		return true, nil
	}

	// Check if it's been long enough since the last update
	timeSinceLastUpdate := time.Since(state.LastProcessed.AsTime())
	if timeSinceLastUpdate > 15*time.Minute {
		return true, nil
	}

	return false, nil
}

// ProcessBlockTimingsActivity processes block timings data for a network and time window
func (a *Activities) ProcessBlockTimingsActivity(ctx context.Context, params *pb.DataProcessorParams) error {
	a.log.WithFields(logrus.Fields{
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
func (a *Activities) ProcessSizeCDFActivity(ctx context.Context, params *pb.DataProcessorParams) error {
	a.log.WithFields(logrus.Fields{
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
func (a *Activities) UpdateProcessorStateActivity(ctx context.Context, params *pb.DataProcessorParams) error {
	a.log.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.WindowName,
	}).Debug("Updating processor state")

	// Get the current state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.WindowName)
	if err != nil {
		state = &pb.ProcessorState{
			Network:       params.NetworkName,
			LastProcessed: timestamppb.New(time.Time{}),
		}
	}

	// Update the state
	state.LastProcessed = timestamppb.New(time.Now().UTC())

	// Store the state
	if err := a.storeProcessorState(ctx, state, params.NetworkName, params.WindowName); err != nil {
		return fmt.Errorf("failed to store processor state: %w", err)
	}

	return nil
}

// Helper methods

// getProcessorState retrieves the processor state for a network and window
func (a *Activities) getProcessorState(ctx context.Context, network, window string) (*pb.ProcessorState, error) {
	// Create path for the state file
	statePath := filepath.Join(a.baseDir, "state", network, fmt.Sprintf("%s.json", window))

	// List files to check if the state file exists
	files, err := a.lab.Storage().List(statePath)
	if err != nil {
		return nil, fmt.Errorf("failed to list state files: %w", err)
	}

	fileExists := len(files) > 0
	if !fileExists {
		// Return default state
		return &pb.ProcessorState{
			Network:       network,
			LastProcessed: timestamppb.New(time.Time{}),
		}, nil
	}

	// Get the state file from S3
	data, err := a.lab.Storage().Get(statePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get state file: %w", err)
	}

	// Unmarshal the state file
	var state pb.ProcessorState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("failed to unmarshal state file: %w", err)
	}

	return &state, nil
}

// storeProcessorState stores the processor state for a network and window
func (a *Activities) storeProcessorState(ctx context.Context, state *pb.ProcessorState, network, window string) error {
	// Create path for the state file
	statePath := filepath.Join(a.baseDir, "state", network, fmt.Sprintf("%s.json", window))

	// Marshal the state file
	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal state file: %w", err)
	}

	// Store the state file in S3 atomically
	if err := a.lab.Storage().StoreAtomic(statePath, data); err != nil {
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
	var timeWindow *pb.TimeWindowConfig
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

// processBlockTimings processes block timings data for a network and time range
func (a *Activities) processBlockTimings(ctx context.Context, network string, timeRange struct{ Start, End time.Time }) (*pb.TimingData, error) {
	// Get the network-specific Xatu client
	xatuClient := a.lab.Xatu(network)

	a.log.WithFields(logrus.Fields{
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

	rows, err := xatuClient.Query(query, network, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to query block timing data: %w", err)
	}

	// Process the results
	result := &pb.TimingData{
		Network:    network,
		Timestamp:  timestamppb.New(time.Now().UTC()),
		Validators: make(map[string]*pb.TimingData_ValidatorCategory),
	}

	for _, row := range rows {
		proposerIndex := fmt.Sprintf("%v", row["proposer_index"])

		// Create a validator entry if it doesn't exist
		if _, exists := result.Validators[proposerIndex]; !exists {
			result.Validators[proposerIndex] = &pb.TimingData_ValidatorCategory{
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
							a.log.WithError(err).Warn("Failed to parse metric value to int")
							continue
						}
						intValue = int32(parsedValue)
					} else {
						a.log.Warn("Failed to convert metric value to int")
						continue
					}
				}
				result.Validators[proposerIndex].Categories[metric] = int32(intValue)
			}
		}
	}

	return result, nil
}

// processSizeCDF processes size CDF data for a network and time range
func (a *Activities) processSizeCDF(ctx context.Context, network string, timeRange struct{ Start, End time.Time }) (*pb.SizeCDFData, error) {
	// Get the network-specific Xatu client
	xatuClient := a.lab.Xatu(network)

	a.log.WithFields(logrus.Fields{
		"network":    network,
		"time_range": fmt.Sprintf("%s - %s", timeRange.Start.Format(time.RFC3339), timeRange.End.Format(time.RFC3339)),
	}).Info("Processing size CDF data")

	// Format time range for the query
	startStr := timeRange.Start.Format("2006-01-02 15:04:05")
	endStr := timeRange.End.Format("2006-01-02 15:04:05")

	// 1. Get blob data
	a.log.Debug("Querying blob data")
	blobQuery := `
		SELECT
			slot,
			COUNT(*) * 131072 as total_blob_bytes -- 128KB per blob
		FROM canonical_beacon_blob_sidecar FINAL
		WHERE
			slot_start_date_time BETWEEN $1 AND $2
			AND meta_network_name = $3
		GROUP BY slot
	`

	blobRows, err := xatuClient.Query(blobQuery, startStr, endStr, network)
	if err != nil {
		return nil, fmt.Errorf("failed to query blob data: %w", err)
	}

	// Create a map of slot to blob bytes
	blobData := make(map[int64]int64)
	for _, row := range blobRows {
		slot := int64(0)
		switch v := row["slot"].(type) {
		case int64:
			slot = v
		case int32:
			slot = int64(v)
		case int:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			slot = parsed
		default:
			continue
		}

		blobBytes := int64(0)
		switch v := row["total_blob_bytes"].(type) {
		case int64:
			blobBytes = v
		case int32:
			blobBytes = int64(v)
		case int:
			blobBytes = int64(v)
		case float64:
			blobBytes = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			blobBytes = parsed
		default:
			continue
		}

		blobData[slot] = blobBytes
	}

	// 2. Get MEV relay data
	a.log.Debug("Querying MEV relay data")
	mevQuery := `
		SELECT DISTINCT
			slot
		FROM mev_relay_proposer_payload_delivered FINAL
		WHERE
			slot_start_date_time BETWEEN $1 AND $2
			AND meta_network_name = $3
	`

	mevRows, err := xatuClient.Query(mevQuery, startStr, endStr, network)
	if err != nil {
		return nil, fmt.Errorf("failed to query MEV relay data: %w", err)
	}

	// Create a set of MEV slots
	mevSlots := make(map[int64]bool)
	for _, row := range mevRows {
		slot := int64(0)
		switch v := row["slot"].(type) {
		case int64:
			slot = v
		case int32:
			slot = int64(v)
		case int:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			slot = parsed
		default:
			continue
		}

		mevSlots[slot] = true
	}

	a.log.WithField("slots", len(mevSlots)).Debug("Found MEV relay data")

	// 3. Get block arrival data
	a.log.Debug("Querying block arrival data")
	arrivalQuery := `
		SELECT 
			slot,
			meta_network_name,
			min(propagation_slot_start_diff) as arrival_time
		FROM beacon_api_eth_v1_events_block FINAL
		WHERE
			slot_start_date_time BETWEEN $1 AND $2
			AND meta_network_name = $3
		GROUP BY slot, meta_network_name
	`

	arrivalRows, err := xatuClient.Query(arrivalQuery, startStr, endStr, network)
	if err != nil {
		return nil, fmt.Errorf("failed to query block arrival data: %w", err)
	}

	// Map to store arrival times
	arrivalData := make(map[int64]float64)
	for _, row := range arrivalRows {
		slot := int64(0)
		switch v := row["slot"].(type) {
		case int64:
			slot = v
		case int32:
			slot = int64(v)
		case int:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			slot = parsed
		default:
			continue
		}

		arrivalTime := float64(0)
		switch v := row["arrival_time"].(type) {
		case float64:
			arrivalTime = v
		case float32:
			arrivalTime = float64(v)
		case int64:
			arrivalTime = float64(v)
		case int32:
			arrivalTime = float64(v)
		case int:
			arrivalTime = float64(v)
		case string:
			parsed, err := strconv.ParseFloat(v, 64)
			if err != nil {
				continue
			}
			arrivalTime = parsed
		default:
			continue
		}

		arrivalData[slot] = arrivalTime
	}

	// 4. Get block size data
	a.log.Debug("Querying block size data")
	sizeQuery := `
		SELECT 
			slot,
			meta_network_name,
			proposer_index,
			block_total_bytes_compressed
		FROM canonical_beacon_block FINAL
		WHERE
			slot_start_date_time BETWEEN $1 AND $2
			AND meta_network_name = $3
	`

	sizeRows, err := xatuClient.Query(sizeQuery, startStr, endStr, network)
	if err != nil {
		return nil, fmt.Errorf("failed to query block size data: %w", err)
	}

	// 5. Get proposer entities
	a.log.Debug("Getting proposer entities")
	proposerQuery := `
		SELECT 
			"index" as proposer_index,
			entity
		FROM ethseer_validator_entity FINAL
		WHERE meta_network_name = $1
	`

	proposerRows, err := xatuClient.Query(proposerQuery, network)
	if err != nil {
		return nil, fmt.Errorf("failed to query proposer entities: %w", err)
	}

	// Map to store proposer entities
	proposerEntities := make(map[int64]string)
	for _, row := range proposerRows {
		proposerIndex := int64(0)
		switch v := row["proposer_index"].(type) {
		case int64:
			proposerIndex = v
		case int32:
			proposerIndex = int64(v)
		case int:
			proposerIndex = int64(v)
		case float64:
			proposerIndex = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			proposerIndex = parsed
		default:
			continue
		}

		entity := fmt.Sprintf("%v", row["entity"])
		proposerEntities[proposerIndex] = entity
	}

	// 6. Process the size data, combining it with arrival and blob data
	type blockInfo struct {
		slot          int64
		proposerIndex int64
		blockSize     int64
		totalSize     int64
		arrivalTime   float64
		isMEV         bool
		isSolo        bool
		sizeBucket    int64 // in KB
	}

	var blocks []blockInfo
	for _, row := range sizeRows {
		slot := int64(0)
		switch v := row["slot"].(type) {
		case int64:
			slot = v
		case int32:
			slot = int64(v)
		case int:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			slot = parsed
		default:
			continue
		}

		proposerIndex := int64(0)
		switch v := row["proposer_index"].(type) {
		case int64:
			proposerIndex = v
		case int32:
			proposerIndex = int64(v)
		case int:
			proposerIndex = int64(v)
		case float64:
			proposerIndex = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			proposerIndex = parsed
		default:
			continue
		}

		blockSize := int64(0)
		switch v := row["block_total_bytes_compressed"].(type) {
		case int64:
			blockSize = v
		case int32:
			blockSize = int64(v)
		case int:
			blockSize = int64(v)
		case float64:
			blockSize = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				continue
			}
			blockSize = parsed
		default:
			continue
		}

		// Add blob size and ensure minimum of 1 byte
		totalSize := blockSize + blobData[slot]
		if totalSize < 1 {
			totalSize = 1
		}

		// Get arrival time, defaulting to 0 if not available
		arrivalTime := arrivalData[slot]

		// Check if block is from solo staker
		isSolo := proposerEntities[proposerIndex] == "solo_stakers"

		// Check if block used MEV relay
		isMEV := mevSlots[slot]

		// Calculate size bucket in KB, rounding to nearest 32KB and ensuring minimum of 32KB
		sizeBucketKB := (totalSize / 1024 / 32) * 32
		if sizeBucketKB < 32 {
			sizeBucketKB = 32
		}

		blocks = append(blocks, blockInfo{
			slot:          slot,
			proposerIndex: proposerIndex,
			blockSize:     blockSize,
			totalSize:     totalSize,
			arrivalTime:   arrivalTime,
			isMEV:         isMEV,
			isSolo:        isSolo,
			sizeBucket:    sizeBucketKB,
		})
	}

	// 7. Group blocks by size bucket and calculate average arrival times
	type bucketStats struct {
		sumArrivalTime float64
		count          int
	}

	allStats := make(map[int64]*bucketStats)
	mevStats := make(map[int64]*bucketStats)
	nonMevStats := make(map[int64]*bucketStats)
	soloMevStats := make(map[int64]*bucketStats)
	soloNonMevStats := make(map[int64]*bucketStats)

	// Collect stats for each bucket
	for _, block := range blocks {
		// All blocks
		if stats, ok := allStats[block.sizeBucket]; ok {
			stats.sumArrivalTime += block.arrivalTime
			stats.count++
		} else {
			allStats[block.sizeBucket] = &bucketStats{
				sumArrivalTime: block.arrivalTime,
				count:          1,
			}
		}

		// MEV blocks
		if block.isMEV {
			if stats, ok := mevStats[block.sizeBucket]; ok {
				stats.sumArrivalTime += block.arrivalTime
				stats.count++
			} else {
				mevStats[block.sizeBucket] = &bucketStats{
					sumArrivalTime: block.arrivalTime,
					count:          1,
				}
			}

			// Solo staker MEV blocks
			if block.isSolo {
				if stats, ok := soloMevStats[block.sizeBucket]; ok {
					stats.sumArrivalTime += block.arrivalTime
					stats.count++
				} else {
					soloMevStats[block.sizeBucket] = &bucketStats{
						sumArrivalTime: block.arrivalTime,
						count:          1,
					}
				}
			}
		} else {
			// Non-MEV blocks
			if stats, ok := nonMevStats[block.sizeBucket]; ok {
				stats.sumArrivalTime += block.arrivalTime
				stats.count++
			} else {
				nonMevStats[block.sizeBucket] = &bucketStats{
					sumArrivalTime: block.arrivalTime,
					count:          1,
				}
			}

			// Solo staker non-MEV blocks
			if block.isSolo {
				if stats, ok := soloNonMevStats[block.sizeBucket]; ok {
					stats.sumArrivalTime += block.arrivalTime
					stats.count++
				} else {
					soloNonMevStats[block.sizeBucket] = &bucketStats{
						sumArrivalTime: block.arrivalTime,
						count:          1,
					}
				}
			}
		}
	}

	// 8. Create the result data structure
	var sizesKB []int64
	allArrivalTimes := make([]float64, 0)
	mevArrivalTimes := make([]float64, 0)
	nonMevArrivalTimes := make([]float64, 0)
	soloMevArrivalTimes := make([]float64, 0)
	soloNonMevArrivalTimes := make([]float64, 0)

	// Get sorted list of size buckets
	for bucket := range allStats {
		sizesKB = append(sizesKB, bucket)
	}
	sort.Slice(sizesKB, func(i, j int) bool { return sizesKB[i] < sizesKB[j] })

	// Calculate average arrival times per bucket
	for _, bucket := range sizesKB {
		// All blocks
		if stats, ok := allStats[bucket]; ok && stats.count > 0 {
			avgTime := math.Round(stats.sumArrivalTime / float64(stats.count))
			allArrivalTimes = append(allArrivalTimes, avgTime)
		} else {
			allArrivalTimes = append(allArrivalTimes, 0)
		}

		// MEV blocks
		if stats, ok := mevStats[bucket]; ok && stats.count > 0 {
			avgTime := math.Round(stats.sumArrivalTime / float64(stats.count))
			mevArrivalTimes = append(mevArrivalTimes, avgTime)
		} else {
			mevArrivalTimes = append(mevArrivalTimes, 0)
		}

		// Non-MEV blocks
		if stats, ok := nonMevStats[bucket]; ok && stats.count > 0 {
			avgTime := math.Round(stats.sumArrivalTime / float64(stats.count))
			nonMevArrivalTimes = append(nonMevArrivalTimes, avgTime)
		} else {
			nonMevArrivalTimes = append(nonMevArrivalTimes, 0)
		}

		// Solo MEV blocks
		if stats, ok := soloMevStats[bucket]; ok && stats.count > 0 {
			avgTime := math.Round(stats.sumArrivalTime / float64(stats.count))
			soloMevArrivalTimes = append(soloMevArrivalTimes, avgTime)
		} else {
			soloMevArrivalTimes = append(soloMevArrivalTimes, 0)
		}

		// Solo non-MEV blocks
		if stats, ok := soloNonMevStats[bucket]; ok && stats.count > 0 {
			avgTime := math.Round(stats.sumArrivalTime / float64(stats.count))
			soloNonMevArrivalTimes = append(soloNonMevArrivalTimes, avgTime)
		} else {
			soloNonMevArrivalTimes = append(soloNonMevArrivalTimes, 0)
		}
	}

	// Create the final result
	result := &pb.SizeCDFData{
		Network:   network,
		Timestamp: timestamppb.New(time.Now().UTC()),
		SizesKb:   sizesKB,
		ArrivalTimesMs: map[string]*pb.SizeCDFData_DoubleList{
			"all":          {Values: allArrivalTimes},
			"mev":          {Values: mevArrivalTimes},
			"non_mev":      {Values: nonMevArrivalTimes},
			"solo_mev":     {Values: soloMevArrivalTimes},
			"solo_non_mev": {Values: soloNonMevArrivalTimes},
		},
		Mev:        make(map[string]float64),
		NonMev:     make(map[string]float64),
		SoloMev:    make(map[string]float64),
		SoloNonMev: make(map[string]float64),
		All:        make(map[string]float64),
	}

	return result, nil
}

// storeTimingData stores timing data in S3
func (a *Activities) storeTimingData(ctx context.Context, network, window string, data *pb.TimingData) error {
	// Create path for the data file
	dataPath := filepath.Join(a.baseDir, "timings", network, fmt.Sprintf("%s.json", window))

	// Marshal the data file
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data file: %w", err)
	}

	// Store the data file in S3
	if err := a.lab.Storage().StoreAtomic(dataPath, []byte(jsonData)); err != nil {
		return fmt.Errorf("failed to store data file: %w", err)
	}

	return nil
}

// storeSizeCDFData stores size CDF data in S3
func (a *Activities) storeSizeCDFData(ctx context.Context, network, window string, data *pb.SizeCDFData) error {
	// Create path for the data file
	dataPath := filepath.Join(a.baseDir, "size_cdf", network, fmt.Sprintf("%s.json", window))

	// Marshal the data file
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data file: %w", err)
	}

	// Store the data file in S3
	if err := a.lab.Storage().StoreAtomic(dataPath, []byte(jsonData)); err != nil {
		return fmt.Errorf("failed to store data file: %w", err)
	}

	return nil
}
