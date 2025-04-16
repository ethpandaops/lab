package beacon_slots

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/ethwallclock"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/sirupsen/logrus"
)

// Service name constant
const ServiceName = "beacon_slots"

// Constants for processor names
var (
	ForwardProcessorName  = "forward"
	BackwardProcessorName = "backward"
	MiddleProcessorName   = "middle" // Processor for the initial recent window
)

type BeaconSlots struct {
	log logrus.FieldLogger

	config *Config

	ethereum      *ethereum.Client
	xatuClient    *xatu.Client
	storageClient storage.Client
	leaderClients map[string]leader.Client // Map to store multiple leader clients
	lockerClient  locker.Locker

	serviceCtx       context.Context
	serviceCtxCancel context.CancelFunc

	// Base directory for storage
	baseDir string
}

func New(
	log logrus.FieldLogger,
	config *Config,
	xatuClient *xatu.Client,
	ethereum *ethereum.Client,
	storageClient storage.Client,
	lockerClient locker.Locker,
) (*BeaconSlots, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid beacon_slots config: %w", err)
	}

	return &BeaconSlots{
		log:           log.WithField("component", "service/"+ServiceName),
		config:        config,
		ethereum:      ethereum,
		xatuClient:    xatuClient,
		storageClient: storageClient,
		lockerClient:  lockerClient,
		leaderClients: make(map[string]leader.Client),
		baseDir:       "beacon",
		serviceCtx:    nil,
	}, nil
}

func (b *BeaconSlots) Start(ctx context.Context) error {
	if !b.config.Enabled {
		b.log.Info("BeaconSlots service disabled")

		return nil
	}

	b.log.Info("Starting BeaconSlots service")

	// Watch for slot changes on all our networks
	for _, network := range b.config.Networks {
		net := network

		b.ethereum.GetNetwork(network).GetWallclock().OnSlotChanged(func(slot ethwallclock.Slot) {
			b.log.WithField("network", net).WithField("slot", slot).Info("Slot changed")

			// First check if we are the leader
		})
	}

	// Create a unified context for all processors
	ctx, cancel := context.WithCancel(ctx)
	b.serviceCtx = ctx
	b.serviceCtxCancel = cancel

	// Create a separate leader election for each network and processor combination
	processors := []string{ForwardProcessorName, BackwardProcessorName, MissingProcessorName}

	for _, network := range b.config.Networks {
		for _, processor := range processors {
			leaderID := b.getLeaderElectionKey(network, processor)

			b.startLeaderForProcessor(network, processor, leaderID)
		}
	}

	return nil
}

type LeaderElectionParams struct {
	Network   string
	Processor string
}

func (b *BeaconSlots) getLeaderElectionKey(params LeaderElectionParams) string {
	return fmt.Sprintf("%s/%s/%s", ServiceName, params.Network, params.Processor)
}

// startLeaderForProcessor starts a leader election for a specific network-processor combination
func (b *BeaconSlots) startLeaderForProcessor(params LeaderElectionParams) {
	l := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        b.getLeaderElectionKey(params),
		TTL:             5 * time.Second,
		RefreshInterval: 1 * time.Second,

		OnElected: func() {
			b.log.WithFields(logrus.Fields{
				"network":   params.Network,
				"processor": params.Processor,
			}).Info("Became leader for processor")

			// For the Forward processor only, run the middle window processing
			// if configured to do so
			if processor == ForwardProcessorName && b.config.Backfill.MiddleProcessorEnable {
				go func() {
					b.processMiddleWindow(b.processCtx, network)
				}()
			}

			// Start the appropriate processor for this combination
			go b.runProcessor(b.processCtx, network, processor)
		},
		OnRevoked: func() {
			b.log.WithFields(logrus.Fields{
				"network":   network,
				"processor": processor,
			}).Info("Lost leadership for processor")
		},
	})

	l.Start()
	// Store the leader client with a unique key
	b.leaderClients[leaderID] = l
}

func (b *BeaconSlots) Stop() {
	b.log.Info("Stopping BeaconSlots service")

	// Stop all leader clients
	for id, client := range b.leaderClients {
		b.log.WithField("leaderID", id).Debug("Stopping leader client")
		client.Stop()
	}

	if b.processCtxCancel != nil {
		b.processCtxCancel()
	}
}

func (b *BeaconSlots) Name() string {
	return ServiceName
}

// isLeaderForProcessor checks if this instance is the leader for a specific network-processor
func (b *BeaconSlots) isLeaderForProcessor(network, processor string) bool {
	leaderID := fmt.Sprintf("%s/%s/%s", ServiceName, network, processor)
	client, ok := b.leaderClients[leaderID]
	if !ok {
		return false
	}
	return client.IsLeader()
}

// runProcessor runs the appropriate processor based on the processor name
func (b *BeaconSlots) runProcessor(ctx context.Context, network, processor string) {
	b.log.WithFields(logrus.Fields{
		"network":   network,
		"processor": processor,
	}).Info("Starting processor")

	var ticker *time.Ticker

	// Set up ticker based on processor type
	switch processor {
	case ForwardProcessorName:
		ticker = time.NewTicker(time.Second * 12) // Slot time
	case BackwardProcessorName:
		ticker = time.NewTicker(time.Second * 12 * 5) // Less frequent
	case MissingProcessorName:
		ticker = time.NewTicker(time.Hour) // Check once per hour
	default:
		b.log.WithField("processor", processor).Error("Unknown processor type")
		return
	}

	defer ticker.Stop()

	// Run the processor immediately once
	b.processForNetworkAndType(ctx, network, processor)

	// Then run on ticker
	for {
		select {
		case <-ctx.Done():
			b.log.WithFields(logrus.Fields{
				"network":   network,
				"processor": processor,
			}).Info("Context cancelled, stopping processor")
			return
		case <-ticker.C:
			if b.isLeaderForProcessor(network, processor) {
				b.processForNetworkAndType(ctx, network, processor)
			}
		}
	}
}

// processForNetworkAndType runs the appropriate processor function based on the type
func (b *BeaconSlots) processForNetworkAndType(ctx context.Context, network, processor string) {
	switch processor {
	case ForwardProcessorName:
		b.processHead(ctx, network)
	case BackwardProcessorName:
		b.processBacklog(ctx, network)
	case MissingProcessorName:
		b.processMissing(ctx, network)
	}
}

func (b *BeaconSlots) getSlotStoragePath(network string, slot phase0.Slot) string {
	return b.getStoragePath(fmt.Sprintf("%s/%d", network, slot))
}

// getStoragePath constructs the full storage path.
func (b *BeaconSlots) getStoragePath(key string) string {
	return fmt.Sprintf("%s/%s", b.baseDir, key)
}

// loadState loads the state for a given network.
func (b *BeaconSlots) loadState(ctx context.Context, network string) (*State, error) {
	state := &State{
		Processors: make(map[string]ProcessorState),
	}
	key := GetStateKey(network)

	err := b.storageClient.GetEncoded(ctx, b.getStoragePath(key), state, storage.CodecNameJSON)
	if err != nil {
		if err == storage.ErrNotFound {
			b.log.WithField("network", network).Info("No previous state found, starting fresh.")
			return state, nil // Return empty state if not found
		}
		return nil, fmt.Errorf("failed to get state for network %s: %w", network, err)
	}

	return state, nil
}

// saveState saves the state for a given network.
func (b *BeaconSlots) saveState(ctx context.Context, network string, state *State) error {
	key := GetStateKey(network)

	err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:    b.getStoragePath(key),
		Format: storage.CodecNameJSON,
		Data:   state,
	})
	if err != nil {
		return fmt.Errorf("failed to store state for network %s: %w", network, err)
	}

	return nil
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

func (b *BeaconSlots) targetHeadSlot(networkName string, currentSlot phase0.Slot) phase0.Slot {
	return currentSlot + b.config.HeadDelaySlots
}

// processHead processes the latest slot for a network
func (b *BeaconSlots) processHead(ctx context.Context, networkName string) {
	logCtx := b.log.WithField("network", networkName).WithField("processor", ForwardProcessorName)

	logCtx.Info("We are now the leader for this processor")

	// Get the current wallclock slot
	currentSlot, err := b.getCurrentSlot(ctx, networkName)
	if err != nil {
		logCtx.WithError(err).Error("Failed to get current slot")
	} else {
		logCtx.WithField("current_slot", currentSlot).Info("Current slot")

		// Add on our lag offset
		targetSlot := b.targetHeadSlot(networkName, currentSlot)

		logCtx.WithField("target_slot", targetSlot).Info("Calculated target slot")

		// Immediately check if the slot has already been processed before we start our "normality" loop
		processed, err := b.slotHasBeenProcessed(ctx, networkName, targetSlot)
		if err != nil {
			logCtx.WithError(err).Error("Failed to check if slot has been processed")
		}

		if !processed {
			logCtx.WithField("target_slot", targetSlot).Info("Slot has not been processed, processing")

			// Process the slot
			_, err := b.processSlot(ctx, networkName, targetSlot)
			if err != nil {
				logCtx.WithError(err).Error("Failed to process slot")\
			}
		}
	}

	lastProcessedSlot := slot
	// Start our "normality" loop

	for {
		// Get the target slot
		targetSlot := b.targetHeadSlot(networkName, currentSlot)

		// Check if the slot has already been processed
		processed, err := b.slotHasBeenProcessed(ctx, networkName, targetSlot)
		if err != nil {
			b.log.WithField("network", networkName).WithError(err).Error("Failed to get current slot")

			continue
		}

		if processed {
			b.log.WithField("network", networkName).WithField("slot", currentSlot).Debug("Slot has already been processed, skipping")
			return
		}


		
	}
}

// processBacklog processes historical slots
func (b *BeaconSlots) processBacklog(ctx context.Context, networkName string) {
	b.log.WithField("network", networkName).Debug("Processing backlog slots")

	// Get state
	state, err := b.loadState(ctx, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to load state")
		return
	}

	// Get processor state for backward
	processorState := state.GetProcessorState(BackwardProcessorName)

	// Check if we should process backlog based on time
	if !b.shouldProcess(BackwardProcessorName, processorState.LastProcessed) {
		b.log.WithField("network", networkName).Debug("Skipping backlog processing, not time yet")
		return
	}

	// If we don't have a target or current slot, calculate the target backlog slot
	if processorState.TargetSlot == nil || processorState.CurrentSlot == nil {
		// Get the current slot first
		currentSlot, err := b.getCurrentSlot(ctx, networkName)
		if err != nil {
			b.log.WithField("network", networkName).WithError(err).Error("Failed to get current slot")
			return
		}

		// Set current slot
		processorState.CurrentSlot = &currentSlot

		// Calculate target slot based on backfill settings
		targetSlot, err := b.calculateTargetBacklogSlot(networkName, currentSlot)
		if err != nil {
			b.log.WithField("network", networkName).WithError(err).Error("Failed to calculate target slot")
			return
		}

		processorState.TargetSlot = &targetSlot

		// If this is the first run, initialize LastProcessedSlot to current
		if processorState.LastProcessedSlot == nil {
			processorState.LastProcessedSlot = &currentSlot
		}
	}

	// Make sure we have all the required slot info
	if processorState.LastProcessedSlot == nil || processorState.TargetSlot == nil {
		b.log.WithField("network", networkName).Error("Missing slot information for backlog processing")
		return
	}

	// If we've reached or gone beyond the target slot, we're done
	if *processorState.LastProcessedSlot <= *processorState.TargetSlot {
		b.log.WithField("network", networkName).
			WithField("lastProcessedSlot", *processorState.LastProcessedSlot).
			WithField("targetSlot", *processorState.TargetSlot).
			Debug("Reached target slot, backlog complete")
		return
	}

	// Process the next slot (moving backward)
	slotToProcess := *processorState.LastProcessedSlot - 1
	processed, err := b.processSlot(ctx, networkName, slotToProcess)
	if err != nil {
		b.log.WithField("network", networkName).
			WithField("slot", slotToProcess).
			WithError(err).Error("Failed to process backlog slot")
		return
	}

	if processed {
		// Update last processed slot and time
		processorState.LastProcessedSlot = &slotToProcess
		processorState.LastProcessed = time.Now()

		// Update state
		state.UpdateProcessorState(BackwardProcessorName, processorState)
		if err := b.saveState(ctx, networkName, state); err != nil {
			b.log.WithField("network", networkName).WithError(err).Error("Failed to save state")
		}
	}
}

// processMissing checks for and processes any slots that might have been missed
func (b *BeaconSlots) processMissing(ctx context.Context, networkName string) {
	b.log.WithField("network", networkName).Debug("Processing missing slots")

	// Get state
	state, err := b.loadState(ctx, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to load state")
		return
	}

	// Get processor state for missing
	processorState := state.GetProcessorState(MissingProcessorName)

	// Check if we should process based on time
	if !b.shouldProcess(MissingProcessorName, processorState.LastProcessed) {
		b.log.WithField("network", networkName).Debug("Skipping missing slot processing, not time yet")
		return
	}

	// Get the forward and backward processor states
	forwardState := state.GetProcessorState(ForwardProcessorName)
	backwardState := state.GetProcessorState(BackwardProcessorName)

	// Get the current slot
	currentSlot, err := b.getCurrentSlot(ctx, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to get current slot")
		return
	}

	// Calculate the range of slots to check
	startSlot := int64(0)
	if backwardState.LastProcessedSlot != nil {
		startSlot = *backwardState.LastProcessedSlot
	}

	endSlot := currentSlot
	if forwardState.LastProcessedSlot != nil {
		endSlot = *forwardState.LastProcessedSlot
	}

	b.log.WithField("network", networkName).
		WithField("startSlot", startSlot).
		WithField("endSlot", endSlot).
		Debug("Checking for missing slots")

	// Get the ClickHouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to get ClickHouse client for network")
		return
	}

	query := `
		WITH range(toInt64(?), toInt64(?)) AS all_slots
		SELECT slot_candidate
		FROM (
			SELECT arrayJoin(all_slots) AS slot_candidate
		) AS slots
		LEFT JOIN xatu.beacon_api_eth_v1_events_block AS blocks
			ON blocks.slot = slot_candidate AND blocks.network = ?
		WHERE blocks.slot IS NULL
	`

	rows, err := ch.Query(ctx, query, startSlot, endSlot+1, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to query missing slots from ClickHouse")
		return
	}

	missingSlots := make([]int64, 0)
	for _, row := range rows {
		val, ok := row["slot_candidate"]
		if !ok || val == nil {
			continue
		}
		slotInt, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64)
		if err != nil {
			b.log.WithError(err).Warn("Failed to parse missing slot value")
			continue
		}
		missingSlots = append(missingSlots, slotInt)
	}

	b.log.WithField("network", networkName).
		WithField("missingSlotsCount", len(missingSlots)).
		Debug("Missing slots identified")
	// Update last processed time
	processorState.LastProcessed = time.Now()

	// Update state
	state.UpdateProcessorState(MissingProcessorName, processorState)
	if err := b.saveState(ctx, networkName, state); err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to save state")
	}
}

// getCurrentSlot returns the current slot for a network
func (b *BeaconSlots) getCurrentSlot(ctx context.Context, networkName string) (phase0.Slot, error) {
	network := b.ethereum.GetNetwork(networkName)
	if network == nil {
		return 0, fmt.Errorf("network %s not found", networkName)
	}

	if network.GetWallclock() != nil {
		slot, err := network.GetWallclock().CurrentSlot()
		if err != nil {
			return 0, fmt.Errorf("failed to get current slot: %w", err)
		}

		return slot, nil
	}

	return 0, fmt.Errorf("no wallclock found for network %s", networkName)
}

// calculateTargetBacklogSlot calculates the target backlog slot
func (b *BeaconSlots) calculateTargetBacklogSlot(networkName string, currentSlot int64) (int64, error) {
	b.log.WithField("network", networkName).Debug("Calculating target backlog slot")

	// If slots ago is set, calculate target slot based on that
	if b.config.Backfill.SlotsAgo > 0 {
		targetSlot := currentSlot - b.config.Backfill.SlotsAgo
		if targetSlot < 0 {
			targetSlot = 0
		}
		return targetSlot, nil
	}

	// Default to a week ago (approximately 50400 slots with 12s slot time)
	targetSlot := currentSlot - 50400
	if targetSlot < 0 {
		targetSlot = 0
	}

	return targetSlot, nil
}

func getStringOrNil(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Helper function to extract username from client name
func extractUsername(name string) string {
	parts := strings.Split(name, "/")
	if len(parts) < 2 {
		return ""
	}

	if strings.Contains(name, "ethpandaops") {
		return "ethpandaops"
	}

	return parts[1]
}

// Helper function to get string or empty string if nil
func getStringOrEmpty(value interface{}) string {
	if value == nil {
		return ""
	}
	return fmt.Sprintf("%v", value)
}
