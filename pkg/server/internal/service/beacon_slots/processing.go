package beacon_slots

import (
	"context"
	"fmt"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
)

// processSlot processes a single slot
func (b *BeaconSlots) processSlot(ctx context.Context, networkName string, slot phase0.Slot) (bool, error) {
	startTime := time.Now()

	b.log.WithField("network", networkName).
		WithField("slot", slot).
		Debug("Processing slot")

	// 1. Get block data (should return *pb.BlockData)
	blockData, err := b.getBlockData(ctx, networkName, slot)
	if err != nil {
		return false, fmt.Errorf("failed to get block data: %w", err)
	}
	if blockData == nil {
		b.log.WithField("slot", slot).Debug("No block data found for slot")
		return false, nil
	}

	// 2. Get proposer data (should return *pb.Proposer)
	proposerData, err := b.getProposerData(ctx, networkName, slot)
	if err != nil {
		return false, fmt.Errorf("failed to get proposer data: %w", err)
	}

	// 3. Get entity
	entity, err := b.getProposerEntity(ctx, networkName, blockData.ProposerIndex)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get proposer entity, continuing without it")
	}

	// 4. Get timing data (should return []*pb.Timing, map[string]*pb.BlobTimingMap, etc.)
	blockSeenAtSlotTime, err := b.getBlockSeenAtSlotTime(ctx, networkName, slot)
	if err != nil {
		blockSeenAtSlotTime = map[string]*pb.BlockArrivalTime{}
	}
	blobSeenAtSlotTime, err := b.getBlobSeenAtSlotTime(ctx, networkName, slot)
	if err != nil {
		blobSeenAtSlotTime = map[string]*pb.BlobArrivalTimes{}
	}
	blockFirstSeenInP2PSlotTime, err := b.getBlockFirstSeenInP2PSlotTime(ctx, networkName, slot)
	if err != nil {
		blockFirstSeenInP2PSlotTime = map[string]*pb.BlockArrivalTime{}
	}
	blobFirstSeenInP2PSlotTime, err := b.getBlobFirstSeenInP2PSlotTime(ctx, networkName, slot)
	if err != nil {
		blobFirstSeenInP2PSlotTime = map[string]*pb.BlobArrivalTimes{}
	}

	fullTimings := &pb.FullTimings{
		BlockSeen:         blockSeenAtSlotTime,
		BlobSeen:          blobSeenAtSlotTime,
		BlockFirstSeenP2P: blockFirstSeenInP2PSlotTime,
		BlobFirstSeenP2P:  blobFirstSeenInP2PSlotTime,
	}

	// 5. Get attestation data
	maxAttestationVotes, err := b.getMaximumAttestationVotes(ctx, networkName, slot)
	if err != nil {
		maxAttestationVotes = 0
	}
	attestationVotes, err := b.getAttestationVotes(ctx, networkName, slot, blockData.BlockRoot)
	if err != nil {
		attestationVotes = make(map[int64]int64)
	}

	// 6. Transform the data for storage
	processingTime := time.Since(startTime).Milliseconds()

	slotData, err := b.transformSlotDataForStorage(
		slot,
		networkName,
		time.Now().UTC().Format(time.RFC3339),
		processingTime,
		blockData,
		proposerData,
		maxAttestationVotes,
		entity,
		fullTimings,
		attestationVotes,
	)
	if err != nil {
		return false, fmt.Errorf("failed to transform slot data: %w", err)
	}

	// 7. Store the data to storage
	storageKey := fmt.Sprintf("slots/%s/%d", networkName, slot)

	err = b.storageClient.Store(ctx, storage.StoreParams{
		Key:         b.getStoragePath(storageKey),
		Data:        slotData,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	})
	if err != nil {
		return false, fmt.Errorf("failed to store slot data: %w", err)
	}

	return true, nil
}

// processMiddleWindow processes a recent window of slots on startup.
func (b *BeaconSlots) processMiddleWindow(ctx context.Context, networkName string) {
	b.log.WithField("network", networkName).Info("Processing middle window")

	// Get state
	state, err := b.loadState(ctx, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to load state for middle window")
		return
	}

	// Get processor state for middle
	processorState := state.GetProcessorState(MiddleProcessorName)

	// Check if middle processing is enabled and hasn't run yet for this leadership term
	if !b.config.Backfill.MiddleProcessorEnable {
		b.log.WithField("network", networkName).Debug("Middle window processing disabled in config")
		return
	}
	// Check if already processed in this leadership term (using LastProcessed time)
	// We only want this to run once per election.
	if !processorState.LastProcessed.IsZero() {
		b.log.WithField("network", networkName).Debug("Middle window already processed in this term")
		return
	}

	// Get the current slot
	currentSlot, err := b.getCurrentSlot(ctx, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to get current slot for middle window")
		return
	}

	// Calculate the start slot for the middle window
	duration := b.config.Backfill.MiddleProcessorDuration
	slotsInDuration := int64(duration.Seconds() / 12) // Assuming 12s slot time
	startSlot := currentSlot - phase0.Slot(slotsInDuration)
	if startSlot < 0 {
		startSlot = 0
	}
	endSlot := currentSlot // Process up to the current slot

	b.log.WithField("network", networkName).
		WithField("startSlot", startSlot).
		WithField("endSlot", endSlot).
		WithField("duration", duration).
		Info("Calculated middle window range")

	// Process slots in the window
	processedCount := 0
	failedCount := 0
	for slot := startSlot; slot <= endSlot; slot++ {
		processed, err := b.processSlot(ctx, networkName, slot)
		if err != nil {
			b.log.WithField("network", networkName).
				WithField("slot", slot).
				WithError(err).Warn("Failed to process slot in middle window")
			failedCount++
			continue // Continue to next slot even if one fails
		}
		if processed {
			processedCount++
		}
		// Add a small delay or check context cancellation if needed for long windows
		select {
		case <-ctx.Done():
			b.log.WithField("network", networkName).Info("Context cancelled during middle window processing")
			return
		default:
			// Continue processing
		}
	}

	b.log.WithField("network", networkName).
		WithField("processedCount", processedCount).
		WithField("failedCount", failedCount).
		Info("Finished processing middle window")

	// Update last processed time to prevent re-running in this term
	processorState.LastProcessed = time.Now()
	processorState.CurrentSlot = int64(currentSlot) // Store the slot context when it ran
	processorState.TargetSlot = int64(startSlot)    // Store the start slot for reference

	// Update state
	state.UpdateProcessorState(MiddleProcessorName, processorState)
	if err := b.saveState(ctx, networkName, state); err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to save state after middle window processing")
	}
}
