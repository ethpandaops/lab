package beacon_slots

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/geolocation"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/state"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/xatu"
	bs_pb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/lab"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// Service name constant
const ServiceName = "beacon_slots"

// Constants for processor names
const (
	HeadProcessorName     = "head"
	TrailingProcessorName = "trailing"
	BackfillProcessorName = "backfill"
)

type BeaconSlots struct {
	log logrus.FieldLogger

	config *Config

	ethereum          *ethereum.Client
	xatuClient        *xatu.Client
	storageClient     storage.Client
	cacheClient       cache.Client
	lockerClient      locker.Locker
	leaderClient      leader.Client
	geolocationClient *geolocation.Client
	metrics           *metrics.Metrics
	metricsCollector  *metrics.Collector

	// Metric collectors
	stateLastProcessedSlotMetric *prometheus.GaugeVec
	stateSlotAgeMetric           *prometheus.GaugeVec
	lastProcessedSlotMetric      *prometheus.GaugeVec
	slotsProcessedTotalMetric    *prometheus.CounterVec
	processingErrorsTotalMetric  *prometheus.CounterVec
	processingDurationMetric     *prometheus.HistogramVec

	parentCtx        context.Context //nolint:containedctx // context passed from Start
	processCtx       context.Context //nolint:containedctx // context for processing
	processCtxCancel context.CancelFunc
	processWaitGroup sync.WaitGroup

	locallyBuiltBlocksProcessor *LocallyBuiltBlocksProcessor

	// Base directory for storage
	baseDir string
}

const (
	slotCacheKey = "beacon_slot_data_%s_%d"
)

func New(
	log logrus.FieldLogger,
	config *Config,
	xatuClient *xatu.Client,
	eth *ethereum.Client,
	storageClient storage.Client,
	cacheClient cache.Client,
	lockerClient locker.Locker,
	geolocationClient *geolocation.Client,
	metricsSvc *metrics.Metrics,
) (*BeaconSlots, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid beacon_slots config: %w", err)
	}

	var metricsCollector *metrics.Collector
	if metricsSvc != nil {
		metricsCollector = metricsSvc.NewCollector(ServiceName)
		log.WithField("component", "service/"+ServiceName).Debug("Created metrics collector for beacon_slots service")
	}

	return &BeaconSlots{
		log:               log.WithField("component", "service/"+ServiceName),
		config:            config,
		ethereum:          eth,
		xatuClient:        xatuClient,
		storageClient:     storageClient,
		cacheClient:       cacheClient,
		lockerClient:      lockerClient,
		baseDir:           ServiceName,
		processCtx:        nil,
		geolocationClient: geolocationClient,
		metrics:           metricsSvc,
		metricsCollector:  metricsCollector,
	}, nil
}

func (b *BeaconSlots) Start(ctx context.Context) error {
	b.parentCtx = ctx // Store the parent context

	if !b.config.Enabled {
		b.log.Info("BeaconSlots service disabled")

		return nil
	}

	b.log.Info("Starting BeaconSlots service")

	// Initialize metrics
	b.initializeMetrics()

	// Create a single leader election for the entire service
	leaderClient := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        ServiceName + "/processing",
		TTL:             5 * time.Second,
		RefreshInterval: 500 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader for BeaconSlots service")

			if b.processCtx != nil {
				// We are already processing, so we don't need to start a new one
				b.log.Info("Already processing, skipping")

				return
			}

			// Create a new context for the process, derived from the parent context
			processCtx, processCancel := context.WithCancel(b.parentCtx)

			b.processCtx = processCtx
			b.processCtxCancel = processCancel

			// Start all processors in a single goroutine
			go b.startProcessors(ctx)
		},
		OnRevoked: func() {
			b.log.Info("Lost leadership for BeaconSlots service")
			b.stopProcessors()
		},
	}, b.metrics)

	leaderClient.Start()
	b.leaderClient = leaderClient

	// Initialize and start the locally built blocks processor
	if b.config.LocallyBuiltBlocksConfig.Enabled != nil && *b.config.LocallyBuiltBlocksConfig.Enabled {
		b.locallyBuiltBlocksProcessor = NewLocallyBuiltBlocksProcessor(
			b.log,
			&b.config.LocallyBuiltBlocksConfig,
			b.config.HeadDelaySlots,
			b.ethereum,
			b.xatuClient,
			b.cacheClient,
			b.lockerClient,
			b.metrics,
		)

		if err := b.locallyBuiltBlocksProcessor.Start(ctx); err != nil {
			b.log.WithError(err).Error("Failed to start locally built blocks processor")
		}
	}

	return nil
}

func (b *BeaconSlots) FetchSlotData(ctx context.Context, network string, slot phase0.Slot) (*bs_pb.BeaconSlotData, error) {
	// Check if this is a network that we support
	if b.ethereum.GetNetwork(network) == nil {
		return nil, fmt.Errorf("network %s not supported", network)
	}

	// Check if we've got the slot data in cache
	cacheData, err := b.cacheClient.Get(fmt.Sprintf(slotCacheKey, network, slot))
	if err == nil {
		var data *bs_pb.BeaconSlotData
		if err := json.Unmarshal(cacheData, &data); err == nil {
			return data, nil
		}
	}

	// Load the slot data from storage
	var slotData *bs_pb.BeaconSlotData
	if err := b.storageClient.GetEncoded(ctx, b.getSlotStoragePath(network, slot), &slotData, storage.CodecNameJSON); err != nil {
		return nil, fmt.Errorf("failed to get slot data for network %s and slot %d: %w", network, slot, err)
	}

	// If the slot is "recent", cache the data
	slotTime, _, err := b.ethereum.GetNetwork(network).GetWallclock().Now()
	if err != nil {
		return nil, fmt.Errorf("failed to get current slot for network %s: %w", network, err)
	}

	if slotTime.TimeWindow().Start().Before(time.Now().Add(2 * time.Minute)) {
		b.cacheClient.Set(fmt.Sprintf(slotCacheKey, network, slot), cacheData, 2*time.Minute)
	}

	return slotData, nil
}

func (b *BeaconSlots) Stop() {
	b.log.Info("Stopping BeaconSlots service")

	b.log.Info("Stopping leader client")

	if b.leaderClient != nil {
		b.leaderClient.Stop()
	}

	b.log.Info("Stopping processors")
	b.stopProcessors()

	// Stop the locally built blocks processor
	if b.locallyBuiltBlocksProcessor != nil {
		b.locallyBuiltBlocksProcessor.Stop()
	}

	b.log.Info("BeaconSlots service stopped")
}

// stopProcessors safely stops all running processors
func (b *BeaconSlots) stopProcessors() {
	b.log.Info("Stopping all processors")

	if b.processCtxCancel != nil {
		b.processCtxCancel()

		// Wait for all processors to stop with a timeout
		done := make(chan struct{})
		go func() {
			b.processWaitGroup.Wait()
			close(done)
		}()

		select {
		case <-done:
			b.log.Info("All processors have stopped cleanly")
		case <-time.After(5 * time.Second):
			b.log.Warn("Timeout waiting for processors to stop, some may still be running")
		}

		b.processCtx = nil
		b.processCtxCancel = nil
	}
}

func (b *BeaconSlots) Name() string {
	return ServiceName
}

// startProcessors launches all processor goroutines
func (b *BeaconSlots) startProcessors(ctx context.Context) {
	b.log.Info("Starting all processors")

	// Process each network
	for _, network := range b.ethereum.Networks() {
		// Process head (latest slots)
		b.processWaitGroup.Add(1)

		go func(network string) {
			defer b.processWaitGroup.Done()
			b.processHead(ctx, network)
		}(network.Name)

		// Process trailing slots
		b.processWaitGroup.Add(1)

		go func(network string) {
			defer b.processWaitGroup.Done()
			b.processTrailing(ctx, network)
		}(network.Name)

		// Process backfill (historical slots)
		b.processWaitGroup.Add(1)

		go func(network string) {
			defer b.processWaitGroup.Done()
			b.processBackfill(ctx, network)
		}(network.Name)
	}

	// Wait for context cancellation
	<-ctx.Done()
	b.log.Info("Context cancelled, all processors will stop")
}

// getSlotStoragePath constructs the storage path for a slot
func (b *BeaconSlots) getSlotStoragePath(network string, slot phase0.Slot) string {
	return b.getStoragePath(fmt.Sprintf("%s/%d", network, slot))
}

func (b *BeaconSlots) BaseDirectory() string {
	return b.baseDir
}

// getStoragePath constructs the full storage path.
func (b *BeaconSlots) getStoragePath(key string) string {
	return fmt.Sprintf("%s/%s", b.baseDir, key)
}

// slotHasBeenProcessed checks if a slot has been processed for a given network.
func (b *BeaconSlots) slotHasBeenProcessed(ctx context.Context, network string, slot phase0.Slot) (bool, error) {
	// Just check if the file exists in storage
	exists, err := b.storageClient.Exists(ctx, b.getSlotStoragePath(network, slot))
	if err != nil {
		return false, fmt.Errorf("failed to check if slot %d has been processed for network %s: %w", slot, network, err)
	}

	return exists, nil
}

func (b *BeaconSlots) FrontendModuleConfig() *pb.FrontendConfig_BeaconModule {
	networks := make(map[string]*pb.FrontendConfig_BeaconNetworkConfig)
	for _, network := range b.ethereum.Networks() {
		networks[network.Name] = &pb.FrontendConfig_BeaconNetworkConfig{
			HeadLagSlots: int32(b.config.HeadDelaySlots), //nolint:gosec // no risk of overflow
			BacklogDays:  int32(b.config.Backfill.Slots), //nolint:gosec // no risk of overflow
		}
	}

	return &pb.FrontendConfig_BeaconModule{
		Enabled:     b.config.Enabled,
		Description: "Beacon Slots",
		PathPrefix:  b.baseDir,
		Networks:    networks,
	}
}

// sleepUntilNextSlot sleeps until the next slot for a network
func (b *BeaconSlots) sleepUntilNextSlot(ctx context.Context, network string) {
	slot, _, err := b.ethereum.GetNetwork(network).GetWallclock().Now()
	if err != nil {
		b.log.WithError(err).Warn("Failed to get current slot")

		return
	}

	// Use a timer with context to allow cancellation
	timer := time.NewTimer(time.Until(slot.TimeWindow().End()))
	defer timer.Stop()

	select {
	case <-timer.C:
		return
	case <-ctx.Done():
		return
	}
}

// processHead processes the latest slot for a network
func (b *BeaconSlots) processHead(ctx context.Context, networkName string) {
	logCtx := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": HeadProcessorName,
	})
	logCtx.Info("Starting up")

	// Initialize state client for this processor
	stateClient := state.New[*ProcessorState](b.log, b.cacheClient, &state.Config{
		Namespace: ServiceName,
		TTL:       31 * 24 * time.Hour,
	}, networkName+"/head", b.metrics)

	for {
		select {
		case <-ctx.Done():
			logCtx.Info("Context cancelled, stopping processor")

			return
		default:
			// Continue processing
			time.Sleep(1 * time.Second)
		}

		var slotState *ProcessorState

		slotState, err := stateClient.Get(ctx)
		if err != nil {
			if err == state.ErrNotFound {
				// No state found, initialize with default values
				logCtx.Info("No state found, initializing")

				slotState = &ProcessorState{
					LastProcessedSlot: 0,
				}
			} else {
				logCtx.WithError(err).Warn("Failed to get state")

				continue
			}
		}

		// Update state metrics
		b.updateStateMetrics(networkName, HeadProcessorName, slotState)

		// Get the current target slot
		currentSlot, err := b.getCurrentSlot(ctx, networkName)
		if err != nil {
			logCtx.WithError(err).Warn("Failed to get current slot")

			// Record error in metrics
			b.processingErrorsTotalMetric.WithLabelValues(networkName, HeadProcessorName, "get_current_slot").Inc()

			continue
		}

		targetSlot := currentSlot - b.config.HeadDelaySlots

		if slotState.LastProcessedSlot == targetSlot {
			b.sleepUntilNextSlot(ctx, networkName)

			continue
		}

		startTime := time.Now()

		// Process the slot
		processed, slotData, err := b.processSlot(ctx, networkName, targetSlot)
		if err != nil {
			logCtx.WithError(err).WithField("slot", targetSlot).Error("Failed to process slot")

			// Record error in metrics
			b.processingErrorsTotalMetric.WithLabelValues(networkName, HeadProcessorName, "process_slot").Inc()

			continue
		}

		if processed {
			// Update state with the processed slot
			slotState.LastProcessedSlot = currentSlot

			if err := stateClient.Set(ctx, slotState); err != nil {
				logCtx.WithError(err).Error("Failed to update state after processing")
			} else {
				// Update state metrics after successful state update
				b.updateStateMetrics(networkName, HeadProcessorName, slotState)
			}

			// Update last processed slot metric
			b.lastProcessedSlotMetric.WithLabelValues(networkName, HeadProcessorName).Set(float64(currentSlot))

			// Cache the slot data since it's recent
			cacheData, err := json.Marshal(slotData)
			if err != nil {
				logCtx.WithError(err).Error("Failed to marshal slot data")
			} else {
				b.cacheClient.Set(fmt.Sprintf(slotCacheKey, networkName, currentSlot), cacheData, 2*time.Minute)
			}

			logCtx.WithField("slot", currentSlot).WithField("processing_time", time.Since(startTime)).Info("Successfully processed head slot")
		}

		// Sleep until the next slot
		b.sleepUntilNextSlot(ctx, networkName)
	}
}

// processTrailing processes trailing slots for a network
func (b *BeaconSlots) processTrailing(ctx context.Context, networkName string) {
	logCtx := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": TrailingProcessorName,
	})
	logCtx.Info("Starting up")

	// Initialize state client for this processor
	stateKey := GetStateKey(networkName, TrailingProcessorName)
	stateClient := state.New[*ProcessorState](b.log, b.cacheClient, &state.Config{
		Namespace: ServiceName,
		TTL:       31 * 24 * time.Hour,
	}, stateKey, b.metrics)

	for {
		select {
		case <-ctx.Done():
			logCtx.Info("Context cancelled, stopping processor")

			return
		default:
			// Continue processing
			time.Sleep(5 * time.Second)
		}

		var slotState *ProcessorState

		slotState, err := stateClient.Get(ctx)
		if err != nil {
			if err == state.ErrNotFound {
				// No state found, initialize with default values
				wallclockSlot, err := b.getCurrentSlot(ctx, networkName)
				if err != nil {
					logCtx.WithError(err).Warn("Failed to get current slot")

					continue
				}

				logCtx.Info("No state found, initializing")

				// Add on our lag
				slotState = &ProcessorState{
					LastProcessedSlot: wallclockSlot + b.config.HeadDelaySlots,
				}
			} else {
				logCtx.WithError(err).Warn("Failed to get state")

				continue
			}
		}

		// Update state metrics
		b.updateStateMetrics(networkName, TrailingProcessorName, slotState)

		// Get the current target slot
		currentSlot, err := b.getCurrentSlot(ctx, networkName)
		if err != nil {
			logCtx.WithError(err).Error("Failed to get current slot")

			// Record error in metrics
			b.processingErrorsTotalMetric.WithLabelValues(networkName, TrailingProcessorName, "get_current_slot").Inc()

			continue
		}

		targetSlot := currentSlot - phase0.Slot(500)

		if slotState.LastProcessedSlot == targetSlot || targetSlot < 1 || slotState.LastProcessedSlot == 0 {
			// Nothing to do, we are already at the target slot!
			b.sleepUntilNextSlot(ctx, networkName)

			continue
		}

		nextSlot := slotState.LastProcessedSlot - 1

		// Check if somehow we've processed this slot already
		hasProcessed, err := b.slotHasBeenProcessed(ctx, networkName, nextSlot)
		if err != nil {
			logCtx.WithError(err).WithField("slot", nextSlot).Error("Failed to check if slot has been processed")

			continue
		}

		if hasProcessed {
			b.sleepUntilNextSlot(ctx, networkName)

			continue
		}

		// Process the slot
		processed, _, err := b.processSlot(ctx, networkName, nextSlot)
		if err != nil {
			logCtx.WithError(err).WithField("slot", nextSlot).Error("Failed to process slot")

			// Record error in metrics
			b.processingErrorsTotalMetric.WithLabelValues(networkName, TrailingProcessorName, "process_slot").Inc()

			continue
		}

		if processed {
			// Update state with the processed slot
			slotState.LastProcessedSlot = nextSlot

			if err := stateClient.Set(ctx, slotState); err != nil {
				logCtx.WithError(err).Error("Failed to update state after processing")
			} else {
				// Update state metrics after successful state update
				b.updateStateMetrics(networkName, TrailingProcessorName, slotState)
			}

			// Update last processed slot metric
			b.lastProcessedSlotMetric.WithLabelValues(networkName, TrailingProcessorName).Set(float64(nextSlot))

			logCtx.WithField("slot", nextSlot).WithField("target_slot", targetSlot).Info("Successfully processed trailing slot")
		}

		// Sleep until the next slot
		b.sleepUntilNextSlot(ctx, networkName)
	}
}

// processBackfill processes historical slots for a network
func (b *BeaconSlots) processBackfill(ctx context.Context, networkName string) {
	logCtx := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": BackfillProcessorName,
	})
	logCtx.Info("Starting up")

	// Initialize state client for this processor
	stateKey := GetStateKey(networkName, BackfillProcessorName)
	stateClient := state.New[*ProcessorState](b.log, b.cacheClient, &state.Config{
		Namespace: ServiceName,
		TTL:       31 * 24 * time.Hour,
	}, stateKey, b.metrics)

	for {
		select {
		case <-ctx.Done():
			logCtx.Info("Context cancelled, stopping processor")

			return
		default:
			// Continue processing
			time.Sleep(30 * time.Second)
		}

		var slotState *ProcessorState

		slotState, err := stateClient.Get(ctx)
		if err != nil {
			if err == state.ErrNotFound {
				// No state found, initialize with default values
				logCtx.Info("No state found, initializing")

				wallclockSlot, errr := b.getCurrentSlot(ctx, networkName)
				if errr != nil {
					logCtx.WithError(errr).Warn("Failed to get current slot")

					continue
				}

				// Add on our lag
				slotState = &ProcessorState{
					LastProcessedSlot: wallclockSlot + phase0.Slot(b.config.Backfill.Slots), //nolint:gosec // no risk of overflow
				}
			} else {
				logCtx.WithError(err).Warn("Failed to get state")

				continue
			}
		}

		// Update state metrics
		b.updateStateMetrics(networkName, BackfillProcessorName, slotState)

		// Get the current target slot
		currentSlot, err := b.getCurrentSlot(ctx, networkName)
		if err != nil {
			logCtx.WithError(err).Warn("Failed to get current slot")

			// Record error in metrics
			b.processingErrorsTotalMetric.WithLabelValues(networkName, BackfillProcessorName, "get_current_slot").Inc()

			continue
		}

		//nolint:gosec // no risk of overflow
		targetSlot := currentSlot - phase0.Slot(b.config.Backfill.Slots)

		if slotState.LastProcessedSlot == targetSlot || targetSlot < 1 || slotState.LastProcessedSlot == 0 {
			// Nothing to do, we are already at the target slot!
			b.sleepUntilNextSlot(ctx, networkName)

			continue
		}

		nextSlot := slotState.LastProcessedSlot - 1

		// Check if somehow we've processed this slot already
		processed, err := b.slotHasBeenProcessed(ctx, networkName, nextSlot)
		if err != nil {
			logCtx.WithError(err).WithField("slot", nextSlot).Error("Failed to check if slot has been processed")

			continue
		}

		didProcess := false

		if !processed {
			// Process the slot
			processed, _, err := b.processSlot(ctx, networkName, nextSlot)
			if err != nil {
				logCtx.WithError(err).WithField("slot", nextSlot).Error("Failed to process slot")

				// Record error in metrics
				b.processingErrorsTotalMetric.WithLabelValues(networkName, BackfillProcessorName, "process_slot").Inc()

				continue
			}

			if processed {
				didProcess = true
			}
		}

		if didProcess {
			// Update state with the processed slot
			slotState.LastProcessedSlot = nextSlot

			if err := stateClient.Set(ctx, slotState); err != nil {
				logCtx.WithError(err).Error("Failed to update state after processing")
			} else {
				// Update state metrics after successful state update
				b.updateStateMetrics(networkName, BackfillProcessorName, slotState)
			}

			// Update last processed slot metric
			b.lastProcessedSlotMetric.WithLabelValues(networkName, BackfillProcessorName).Set(float64(nextSlot))

			logCtx.WithField("slot", nextSlot).WithField("target_slot", targetSlot).Info("Successfully processed backfill slot")
		}

		// Small sleep so we don't hammer clickhouse
		select {
		case <-time.After(5 * time.Second):
			// Continue
		case <-ctx.Done():
			return
		}
	}
}

// getCurrentSlot returns the current slot for a network
func (b *BeaconSlots) getCurrentSlot(ctx context.Context, networkName string) (phase0.Slot, error) {
	slot, _, err := b.ethereum.GetNetwork(networkName).GetWallclock().Now()
	if err != nil {
		return 0, fmt.Errorf("failed to get current slot: %w", err)
	}

	return phase0.Slot(slot.Number()), nil
}

func getStringOrNil(s *string) string {
	if s == nil {
		return ""
	}

	return *s
}

// Helper function to get string or empty string if nil
func getStringOrEmpty(value interface{}) string {
	if value == nil {
		return ""
	}

	str := fmt.Sprintf("%v", value)
	if str == "<nil>" || str == "nil" {
		return ""
	}

	return str
}

// initializeMetrics creates and registers all metrics for the beacon_slots service
func (b *BeaconSlots) initializeMetrics() {
	if b.metricsCollector == nil {
		return
	}

	var err error

	// Slots processed counter
	b.slotsProcessedTotalMetric, err = b.metricsCollector.NewCounterVec(
		"slots_processed_total",
		"Total number of slots processed",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create slots_processed_total metric")
	}

	// Processing errors counter
	b.processingErrorsTotalMetric, err = b.metricsCollector.NewCounterVec(
		"processing_errors_total",
		"Total number of slot processing errors",
		[]string{"network", "processor", "error_type"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_errors_total metric")
	}

	// Processing duration histogram
	b.processingDurationMetric, err = b.metricsCollector.NewHistogramVec(
		"processing_duration_seconds",
		"Duration of slot processing operations in seconds",
		[]string{"network", "processor"},
		[]float64{0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_duration_seconds metric")
	}

	// Last processed slot gauge
	b.lastProcessedSlotMetric, err = b.metricsCollector.NewGaugeVec(
		"last_processed_slot",
		"The last slot that was successfully processed",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create last_processed_slot metric")
	}

	// State last processed slot metric
	b.stateLastProcessedSlotMetric, err = b.metricsCollector.NewGaugeVec(
		"state_last_processed_slot",
		"The last slot recorded in the processor state",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_last_processed_slot metric")
	}

	// State slot age metric
	b.stateSlotAgeMetric, err = b.metricsCollector.NewGaugeVec(
		"state_slot_age",
		"Age of the last processed slot in terms of slots behind current slot",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_slot_age metric")
	}
}

// updateStateMetrics updates the metrics related to processor state
func (b *BeaconSlots) updateStateMetrics(networkName, processorName string, slotState *ProcessorState) {
	// Skip if slot state is nil
	if slotState == nil {
		return
	}

	// Record the last processed slot from the state
	b.stateLastProcessedSlotMetric.WithLabelValues(networkName, processorName).Set(float64(slotState.LastProcessedSlot))

	// Calculate and record slot age (difference from current slot)
	currentSlot, err := b.getCurrentSlot(context.Background(), networkName)
	if err != nil {
		b.log.WithError(err).WithFields(logrus.Fields{
			"network":   networkName,
			"processor": processorName,
		}).Debug("Failed to get current slot for state metrics")

		return
	}

	// Only calculate age if last processed slot is valid
	if slotState.LastProcessedSlot > 0 {
		// Slot age is how many slots behind current we are
		var slotAge int64
		if currentSlot > slotState.LastProcessedSlot {
			slotAge = int64(currentSlot - slotState.LastProcessedSlot) //nolint:gosec // no risk of overflow
		} else {
			slotAge = 0 // In case of issues with current slot calculation
		}

		b.stateSlotAgeMetric.WithLabelValues(networkName, processorName).Set(float64(slotAge))
	}
}
