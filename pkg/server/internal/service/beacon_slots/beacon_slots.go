package beacon_slots

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/geolocation"
	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/state"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
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

	processCtx       context.Context
	processCtxCancel context.CancelFunc
	processWaitGroup sync.WaitGroup

	// Base directory for storage
	baseDir string
}

func New(
	log logrus.FieldLogger,
	config *Config,
	xatuClient *xatu.Client,
	ethereum *ethereum.Client,
	storageClient storage.Client,
	cacheClient cache.Client,
	lockerClient locker.Locker,
	geolocationClient *geolocation.Client,
) (*BeaconSlots, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid beacon_slots config: %w", err)
	}

	return &BeaconSlots{
		log:               log.WithField("component", "service/"+ServiceName),
		config:            config,
		ethereum:          ethereum,
		xatuClient:        xatuClient,
		storageClient:     storageClient,
		cacheClient:       cacheClient,
		lockerClient:      lockerClient,
		baseDir:           ServiceName,
		processCtx:        nil,
		geolocationClient: geolocationClient,
	}, nil
}

func (b *BeaconSlots) Start(ctx context.Context) error {
	if !b.config.Enabled {
		b.log.Info("BeaconSlots service disabled")
		return nil
	}

	b.log.Info("Starting BeaconSlots service")

	// Create a single leader election for the entire service
	leaderClient := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        ServiceName + "/processing",
		TTL:             5 * time.Second,
		RefreshInterval: 1 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader for BeaconSlots service")

			if b.processCtx != nil {
				// We are already processing, so we don't need to start a new one
				b.log.Info("Already processing, skipping")
				return
			}

			// Create a new context for the process
			ctx, cancel := context.WithCancel(context.Background())

			b.processCtx = ctx
			b.processCtxCancel = cancel

			// Start all processors in a single goroutine
			go b.startProcessors(ctx)
		},
		OnRevoked: func() {
			b.log.Info("Lost leadership for BeaconSlots service")
			b.stopProcessors()
		},
	})

	leaderClient.Start()
	b.leaderClient = leaderClient

	return nil
}

func (b *BeaconSlots) Stop() {
	b.log.Info("Stopping BeaconSlots service")

	if b.leaderClient != nil {
		b.leaderClient.Stop()
	}

	b.stopProcessors()
}

// stopProcessors safely stops all running processors
func (b *BeaconSlots) stopProcessors() {
	if b.processCtxCancel != nil {
		b.log.Info("Stopping all processors")
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
	logCtx := b.log.WithField("network", networkName).WithField("processor", HeadProcessorName)
	logCtx.Info("Starting up")

	// Create a state client for the network
	stateClient := state.New[*ProcessorState](b.log, b.cacheClient, &state.Config{
		Namespace: ServiceName,
		TTL:       31 * 24 * time.Hour,
	}, networkName+"/head")

	for {
		select {
		case <-ctx.Done():
			logCtx.Info("Context cancelled, stopping processor")
			return
		default:
			// Continue processing
		}

		var slotState *ProcessorState

		slotState, err := stateClient.Get(ctx)
		if err != nil {
			if err == state.ErrNotFound {
				slotState = &ProcessorState{
					LastProcessedSlot: 0,
				}
			} else {
				logCtx.WithError(err).Warn("Failed to get state")
				select {
				case <-time.After(1 * time.Second):
					continue
				case <-ctx.Done():
					return
				}
			}
		}

		// Get the current target slot
		currentSlot, err := b.getCurrentSlot(ctx, networkName)
		if err != nil {
			logCtx.WithError(err).Warn("Failed to get current slot")
			select {
			case <-time.After(1 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

		targetSlot := currentSlot - phase0.Slot(b.config.HeadDelaySlots)

		if slotState.LastProcessedSlot == targetSlot {
			b.sleepUntilNextSlot(ctx, networkName)
			continue
		}

		startTime := time.Now()

		// Process the slot
		processed, err := b.processSlot(ctx, networkName, targetSlot)
		if err != nil {
			logCtx.WithError(err).WithField("slot", targetSlot).Error("Failed to process slot")
			select {
			case <-time.After(1 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

		if processed {
			// Update state with the processed slot
			slotState.LastProcessedSlot = targetSlot

			if err := stateClient.Set(ctx, slotState); err != nil {
				logCtx.WithError(err).Error("Failed to update state after processing")
			}

			logCtx.WithField("slot", targetSlot).WithField("processing_time", time.Since(startTime)).Info("Successfully processed head slot")
		}

		// Sleep until the next slot
		b.sleepUntilNextSlot(ctx, networkName)
	}
}

// processTrailing processes trailing slots for a network
func (b *BeaconSlots) processTrailing(ctx context.Context, networkName string) {
	logCtx := b.log.WithField("network", networkName).WithField("processor", TrailingProcessorName)
	logCtx.Info("Starting up")

	// Create a state client for the network
	stateClient := state.New[*ProcessorState](b.log, b.cacheClient, &state.Config{
		Namespace: ServiceName,
		TTL:       31 * 24 * time.Hour,
	}, networkName+"/trailing")

	for {
		select {
		case <-ctx.Done():
			logCtx.Info("Context cancelled, stopping processor")
			return
		default:
			// Continue processing
		}

		var slotState *ProcessorState

		slotState, err := stateClient.Get(ctx)
		if err != nil {
			if err == state.ErrNotFound {
				slotState = &ProcessorState{
					LastProcessedSlot: 0,
				}
			} else {
				logCtx.WithError(err).Warn("Failed to get state")
				select {
				case <-time.After(1 * time.Second):
					continue
				case <-ctx.Done():
					return
				}
			}
		}

		// Get the current target slot
		currentSlot, err := b.getCurrentSlot(ctx, networkName)
		if err != nil {
			logCtx.WithError(err).Error("Failed to get current slot")
			select {
			case <-time.After(1 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

		targetSlot := currentSlot - phase0.Slot(500)

		if slotState.LastProcessedSlot == targetSlot || targetSlot < 1 || slotState.LastProcessedSlot == 0 {
			// Nothing to do, we are already at the target slot!
			b.sleepUntilNextSlot(ctx, networkName)
			continue
		}

		nextSlot := slotState.LastProcessedSlot + 1
		// Process the slot
		processed, err := b.processSlot(ctx, networkName, nextSlot)
		if err != nil {
			logCtx.WithError(err).WithField("slot", nextSlot).Error("Failed to process slot")
			select {
			case <-time.After(5 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

		if processed {
			// Update state with the processed slot
			slotState.LastProcessedSlot = nextSlot

			if err := stateClient.Set(ctx, slotState); err != nil {
				logCtx.WithError(err).Error("Failed to update state after processing")
			}

			logCtx.WithField("slot", nextSlot).Info("Successfully processed trailing slot")
		}

		// Sleep until the next slot
		b.sleepUntilNextSlot(ctx, networkName)
	}
}

// processBackfill processes historical slots for a network
func (b *BeaconSlots) processBackfill(ctx context.Context, networkName string) {
	logCtx := b.log.WithField("network", networkName).WithField("processor", BackfillProcessorName)
	logCtx.Info("Starting up")

	// Create a state client for the network
	stateClient := state.New[*ProcessorState](b.log, b.cacheClient, &state.Config{
		Namespace: ServiceName,
		TTL:       31 * 24 * time.Hour,
	}, networkName+"/backfill")

	for {
		select {
		case <-ctx.Done():
			logCtx.Info("Context cancelled, stopping processor")
			return
		default:
			// Continue processing
		}

		var slotState *ProcessorState

		slotState, err := stateClient.Get(ctx)
		if err != nil {
			if err == state.ErrNotFound {
				slotState = &ProcessorState{
					LastProcessedSlot: 0,
				}
			} else {
				logCtx.WithError(err).Warn("Failed to get state")
				select {
				case <-time.After(1 * time.Second):
					continue
				case <-ctx.Done():
					return
				}
			}
		}

		// Get the current target slot
		currentSlot, err := b.getCurrentSlot(ctx, networkName)
		if err != nil {
			logCtx.WithError(err).Warn("Failed to get current slot")
			select {
			case <-time.After(1 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

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
			select {
			case <-time.After(1 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

		didProcess := false

		if !processed {
			// Process the slot
			processed, err := b.processSlot(ctx, networkName, nextSlot)
			if err != nil {
				logCtx.WithError(err).WithField("slot", nextSlot).Error("Failed to process slot")
				select {
				case <-time.After(5 * time.Second):
					continue
				case <-ctx.Done():
					return
				}
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
			}

			logCtx.WithField("slot", nextSlot).Info("Successfully processed backfill slot")
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
