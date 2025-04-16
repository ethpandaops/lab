package beacon_slots

import (
	"context"
	"time"
)

// runInitialProcessing performs the initial head and middle window processing.
func (b *BeaconSlots) runInitialProcessing() {
	if !b.leaderClient.IsLeader() {
		return // Should not happen if called from OnElected, but safety check
	}
	b.log.Info("Running initial processing...")
	for _, network := range b.config.Networks {
		b.processHead(b.processCtx, network) // Process the absolute latest slot first
		if b.config.Backfill.MiddleProcessorEnable {
			b.processMiddleWindow(b.processCtx, network) // Then process the recent window if enabled
		}
	}
	b.log.Info("Initial processing finished.")
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
	startSlot := currentSlot - slotsInDuration
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
		processed, err := b.processSlot(b.processCtx, networkName, slot)
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
		case <-b.processCtx.Done():
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
	processorState.CurrentSlot = &currentSlot // Store the slot context when it ran
	processorState.TargetSlot = &startSlot    // Store the start slot for reference

	// Update state
	state.UpdateProcessorState(MiddleProcessorName, processorState)
	if err := b.saveState(ctx, networkName, state); err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to save state after middle window processing")
	}
}
