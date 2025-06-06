package beacon_chain_timings

import (
	"context"
	"fmt"
	"math"
	"path/filepath"
	"sort"
	"strconv"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_chain_timings"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (b *BeaconChainTimings) processSizeCDF(ctx context.Context, network *ethereum.NetworkConfig, window *pb.TimeWindowConfig) error {
	b.log.WithFields(logrus.Fields{
		"network":  network.Name,
		"window":   window.Name,
		"file":     window.File,
		"range_ms": window.RangeMs,
		"step_ms":  window.StepMs,
	}).Info("Processing size CDF data")

	startTime := time.Now()

	// Increment processing counter if metrics are available
	counter, err := b.metricsCollector.NewCounterVec(
		"processing_operations_total",
		"Total number of processing operations",
		[]string{"operation", "network", "window"},
	)
	if err == nil {
		counter.WithLabelValues("size_cdf", network.Name, window.File).Inc()
	}

	// Get time range for the window
	timeRange, err := b.getTimeRange(window)
	if err != nil {
		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("size_cdf", network.Name, window.File).Inc()
		}

		return fmt.Errorf("failed to get time range: %w", err)
	}

	b.log.WithFields(logrus.Fields{
		"time_range_start": timeRange.Start.Format(time.RFC3339),
		"time_range_end":   timeRange.End.Format(time.RFC3339),
	}).Info("Time range for window")

	// Process size CDF data
	sizeCDFData, err := b.GetSizeCDFData(ctx, network.Name, timeRange)
	if err != nil {
		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("size_cdf", network.Name, window.File).Inc()
		}

		return fmt.Errorf("failed to process size CDF data: %w", err)
	}

	// Store the results
	if err := b.storeSizeCDFData(ctx, network.Name, window.File, sizeCDFData); err != nil {
		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("size_cdf", network.Name, window.File).Inc()
		}

		return fmt.Errorf("failed to store size CDF data: %w", err)
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
		histogram.WithLabelValues("size_cdf", network.Name, window.File).Observe(duration)
	}

	b.log.WithFields(logrus.Fields{
		"network": network.Name,
		"window":  window.Name,
		"file":    window.File,
	}).Info("Successfully processed and stored size CDF data")

	return nil
}

// processSizeCDFData processes size CDF data for a network and time range
//
//nolint:gocyclo // this is a complex function
func (b *BeaconChainTimings) GetSizeCDFData(ctx context.Context, network string, timeRange struct{ Start, End time.Time }) (*pb.SizeCDFData, error) {
	b.log.WithFields(logrus.Fields{
		"network":    network,
		"time_range": fmt.Sprintf("%s - %s", timeRange.Start.Format(time.RFC3339), timeRange.End.Format(time.RFC3339)),
	}).Info("Processing size CDF data")

	// Format time range for the query
	startStr := timeRange.Start.Format("2006-01-02 15:04:05")
	endStr := timeRange.End.Format("2006-01-02 15:04:05")

	// 1. Get blob data
	b.log.Debug("Querying blob data")

	blobQuery := `
		SELECT
			slot,
			COUNT(*) * 131072 as total_blob_bytes -- 128KB per blob
		FROM canonical_beacon_blob_sidecar FINAL
		WHERE
			slot_start_date_time BETWEEN ? AND ?
			AND meta_network_name = ?
		GROUP BY slot
	`

	ch, err := b.xatuClient.GetClickhouseClientForNetwork(network)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network: %w", err)
	}

	blobRows, err := ch.Query(ctx, blobQuery, startStr, endStr, network)
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
		case uint32:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse slot: %w", err)
			}

			slot = parsed
		default:
			return nil, fmt.Errorf("invalid slot type: %T", row["slot"])
		}

		blobBytes := int64(0)
		switch v := row["total_blob_bytes"].(type) {
		case int64:
			blobBytes = v
		case int32:
			blobBytes = int64(v)
		case int:
			blobBytes = int64(v)
		case uint64:
			blobBytes = int64(v) //nolint:gosec // no risk of overflow
		case float64:
			blobBytes = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse blob bytes: %w", err)
			}

			blobBytes = parsed
		default:
			return nil, fmt.Errorf("invalid blob bytes type: %T", row["total_blob_bytes"])
		}

		blobData[slot] = blobBytes
	}

	// 2. Get MEV relay data
	b.log.Debug("Querying MEV relay data")

	mevQuery := `
		SELECT DISTINCT
			slot
		FROM mev_relay_proposer_payload_delivered FINAL
		WHERE
			slot_start_date_time BETWEEN ? AND ?
			AND meta_network_name = ?
	`

	mevRows, err := ch.Query(ctx, mevQuery, startStr, endStr, network)
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
		case uint32:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, errr := strconv.ParseInt(v, 10, 64)
			if errr != nil {
				return nil, fmt.Errorf("failed to parse slot: %w", err)
			}

			slot = parsed
		default:
			return nil, fmt.Errorf("invalid slot type: %T", row["slot"])
		}

		mevSlots[slot] = true
	}

	b.log.WithField("slots", len(mevSlots)).Debug("Found MEV relay data")

	// 3. Get block arrival data
	b.log.Debug("Querying block arrival data")

	arrivalQuery := `
		SELECT 
			slot,
			meta_network_name,
			min(propagation_slot_start_diff) as arrival_time
		FROM beacon_api_eth_v1_events_block FINAL
		WHERE
			slot_start_date_time BETWEEN ? AND ?
			AND meta_network_name = ?
		GROUP BY slot, meta_network_name
	`

	arrivalRows, err := ch.Query(ctx, arrivalQuery, startStr, endStr, network)
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
		case uint32:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse slot: %w", err)
			}

			slot = parsed
		default:
			return nil, fmt.Errorf("invalid slot type: %T", row["slot"])
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
		case uint32: // Added for comprehensive fix
			arrivalTime = float64(v)
		case int:
			arrivalTime = float64(v)
		case string:
			parsed, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse arrival time: %w", err)
			}

			arrivalTime = parsed
		default:
			return nil, fmt.Errorf("invalid arrival time type: %T", row["arrival_time"])
		}

		arrivalData[slot] = arrivalTime
	}

	// 4. Get block size data
	b.log.Debug("Querying block size data")

	sizeQuery := `
		SELECT 
			slot,
			meta_network_name,
			proposer_index,
			block_total_bytes_compressed
		FROM canonical_beacon_block FINAL
		WHERE
			slot_start_date_time BETWEEN ? AND ?
			AND meta_network_name = ?
	`

	sizeRows, err := ch.Query(ctx, sizeQuery, startStr, endStr, network)
	if err != nil {
		return nil, fmt.Errorf("failed to query block size data: %w", err)
	}

	count := 0
	for range sizeRows {
		count++
	}

	b.log.WithField("sizeRows_count", count).Info("Number of rows returned from block size query")

	// 5. Get proposer entities
	b.log.Debug("Getting proposer entities")

	proposerQuery := `
		SELECT 
			"index" as proposer_index,
			entity
		FROM ethseer_validator_entity FINAL
		WHERE meta_network_name = ?
	`

	proposerRows, err := ch.Query(ctx, proposerQuery, network)
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
		case uint32:
			proposerIndex = int64(v)
		case uint64:
			proposerIndex = int64(v) //nolint:gosec // no risk of overflow
		case float64:
			proposerIndex = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse proposer index: %w", err)
			}

			proposerIndex = parsed
		default:
			return nil, fmt.Errorf("invalid proposer index type: %T", row["proposer_index"])
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

	blocks := make([]blockInfo, 0, len(sizeRows))

	for _, row := range sizeRows {
		slot := int64(0)
		switch v := row["slot"].(type) {
		case int64:
			slot = v
		case int32:
			slot = int64(v)
		case int:
			slot = int64(v)
		case uint32:
			slot = int64(v)
		case float64:
			slot = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse slot: %w", err)
			}

			slot = parsed
		default:
			return nil, fmt.Errorf("invalid slot type: %T", row["slot"])
		}

		proposerIndex := int64(0)
		switch v := row["proposer_index"].(type) {
		case int64:
			proposerIndex = v
		case int32:
			proposerIndex = int64(v)
		case int:
			proposerIndex = int64(v)
		case uint32:
			proposerIndex = int64(v)
		case uint64:
			proposerIndex = int64(v) //nolint:gosec // no risk of overflow
		case float64:
			proposerIndex = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse proposer index: %w", err)
			}

			proposerIndex = parsed
		default:
			return nil, fmt.Errorf("invalid proposer index type: %T", row["proposer_index"])
		}

		blockSize := int64(0)
		switch v := row["block_total_bytes_compressed"].(type) {
		case int64:
			blockSize = v
		case int32:
			blockSize = int64(v)
		case int:
			blockSize = int64(v)
		case uint32:
			blockSize = int64(v)
		case uint64:
			blockSize = int64(v) //nolint:gosec // no risk of overflow
		case float64:
			blockSize = int64(v)
		case string:
			parsed, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse block size: %w", err)
			}

			blockSize = parsed
		default:
			return nil, fmt.Errorf("invalid block size type: %T", row["block_total_bytes_compressed"])
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
	sizesKB := make([]int64, 0, len(allStats))

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

// storeSizeCDFData stores size CDF data
func (b *BeaconChainTimings) storeSizeCDFData(ctx context.Context, network, window string, data *pb.SizeCDFData) error {
	// Create path for the data file
	dataPath := filepath.Join("size_cdf", network, window)

	// Store the data file
	if err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:         GetStoragePath(dataPath),
		Data:        data,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	}); err != nil {
		return fmt.Errorf("failed to store data file: %w", err)
	}

	return nil
}
