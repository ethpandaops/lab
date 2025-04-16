package beacon_slots

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/codingsince1985/geo-golang/openstreetmap"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/sirupsen/logrus"

	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
	"google.golang.org/protobuf/types/known/timestamppb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

// Service name constant
const ServiceName = "beacon_slots"

// Constants for processor names
var (
	ForwardProcessorName  = "forward"
	BackwardProcessorName = "backward"
	MissingProcessorName  = "missing"
	MiddleProcessorName   = "middle" // Processor for the initial recent window
)

type BeaconSlots struct {
	log logrus.FieldLogger

	config *Config

	ethereum      *ethereum.Config
	xatuClient    *xatu.Client
	storageClient storage.Client
	leaderClient  leader.Client
	lockerClient  locker.Locker

	processCtx       context.Context
	processCtxCancel context.CancelFunc

	// Base directory for storage
	baseDir string
}

func New(
	log logrus.FieldLogger,
	config *Config,
	xatuClient *xatu.Client,
	ethereum *ethereum.Config,
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
		baseDir:       "beacon",
		processCtx:    nil,
	}, nil
}

func (b *BeaconSlots) Start(ctx context.Context) error {
	if !b.config.Enabled {
		b.log.Info("BeaconSlots service disabled")
		return nil
	}
	b.log.Info("Starting BeaconSlots service")

	leader := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        ServiceName + "/slots_processing",
		TTL:             5 * time.Second,
		RefreshInterval: 1 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader")
			if b.processCtx != nil {
				b.log.Info("Already processing, skipping start")
				return
			}
			ctx, cancel := context.WithCancel(context.Background())
			b.processCtx = ctx
			b.processCtxCancel = cancel

			// Run initial processing (head and middle window) before starting the loop
			go func() {
				b.runInitialProcessing()
				b.processLoop()
			}()
		},
		OnRevoked: func() {
			b.log.Info("Lost leadership")
			if b.processCtxCancel != nil {
				b.processCtxCancel()
				b.processCtx = nil
				b.processCtxCancel = nil
			}
		},
	})

	leader.Start()
	b.leaderClient = leader

	return nil
}

func (b *BeaconSlots) Stop() {
	b.log.Info("Stopping BeaconSlots service")
	if b.leaderClient != nil {
		b.leaderClient.Stop()
	}
	if b.processCtxCancel != nil {
		b.processCtxCancel()
	}
}

func (b *BeaconSlots) Name() string {
	return ServiceName
}

func (b *BeaconSlots) processLoop() {
	processingInterval := time.Second * 12 // Slot time

	// Set up tickers for different processor types
	headTicker := time.NewTicker(processingInterval)
	backlogTicker := time.NewTicker(processingInterval * 5) // Run backlog less frequently
	missingTicker := time.NewTicker(time.Hour)              // Check for missing slots once per hour

	defer headTicker.Stop()
	defer backlogTicker.Stop()
	defer missingTicker.Stop()

	// Initial processing is now handled in runInitialProcessing called from OnElected

	for {
		select {
		case <-b.processCtx.Done():
			b.log.Info("Context cancelled, stopping processing loop")
			return
		case <-headTicker.C:
			if b.leaderClient.IsLeader() {
				for _, network := range b.config.Networks {
					b.processHead(b.processCtx, network)
				}
			}
		case <-backlogTicker.C:
			if b.leaderClient.IsLeader() {
				for _, network := range b.config.Networks {
					b.processBacklog(b.processCtx, network)
				}
			}
		case <-missingTicker.C:
			if b.leaderClient.IsLeader() {
				for _, network := range b.config.Networks {
					b.processMissing(b.processCtx, network)
				}
			}
		}
	}
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

// shouldProcess checks if a processor should run based on the last run time and interval.
func (b *BeaconSlots) shouldProcess(processorName string, lastProcessed time.Time) bool {
	if lastProcessed.IsZero() {
		return true // Never processed before
	}
	// Use a shorter interval check for head processing to be more responsive
	if processorName == ForwardProcessorName {
		return time.Since(lastProcessed) > (12 * time.Second) // Check more frequently for head
	}
	// Use configured interval for others, or a default if not set
	interval := b.config.GetInterval()
	if interval == 0 {
		interval = 15 * time.Minute // Default interval if not configured
	}
	return time.Since(lastProcessed) > interval
}

// processHead processes the latest slot for a network
func (b *BeaconSlots) processHead(ctx context.Context, networkName string) {
	b.log.WithField("network", networkName).Debug("Processing head slot")

	// Get state
	state, err := b.loadState(ctx, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to load state")
		return
	}

	// Get processor state for forward
	processorState := state.GetProcessorState(ForwardProcessorName)

	// Check if we should process this slot based on time
	if !b.shouldProcess(ForwardProcessorName, processorState.LastProcessed) {
		b.log.WithField("network", networkName).Debug("Skipping head slot processing, not time yet")
		return
	}

	// Get the current slot
	currentSlot, err := b.getCurrentSlot(ctx, networkName)
	if err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to get current slot")
		return
	}

	// Update current slot in state
	processorState.CurrentSlot = &currentSlot

	// If this is the first run, initialize LastProcessedSlot
	if processorState.LastProcessedSlot == nil {
		// Start at current slot - 1 so we process the current slot
		prev := currentSlot - 1
		processorState.LastProcessedSlot = &prev
	}

	// If the slot hasn't changed, skip processing
	if processorState.LastProcessedSlot != nil && *processorState.LastProcessedSlot >= currentSlot {
		b.log.WithField("network", networkName).
			WithField("lastProcessedSlot", *processorState.LastProcessedSlot).
			WithField("currentSlot", currentSlot).
			Debug("Already processed this slot or newer, skipping")
		return
	}

	// Process the slot
	processed, err := b.processSlot(ctx, networkName, currentSlot)
	if err != nil {
		b.log.WithField("network", networkName).
			WithField("slot", currentSlot).
			WithError(err).Error("Failed to process slot")
		return
	}

	if processed {
		// Update last processed slot and time
		processorState.LastProcessedSlot = &currentSlot
		processorState.LastProcessed = time.Now()

		// Update state
		state.UpdateProcessorState(ForwardProcessorName, processorState)
		if err := b.saveState(ctx, networkName, state); err != nil {
			b.log.WithField("network", networkName).WithError(err).Error("Failed to save state")
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
func (b *BeaconSlots) getCurrentSlot(ctx context.Context, networkName string) (int64, error) {
	b.log.WithField("network", networkName).Debug("Getting current slot")

	// Query ClickHouse for the current slot
	query := `
		SELECT MAX(slot) AS slot
		FROM xatu.beacon_api_eth_v1_events_block
		WHERE network = $1
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return 0, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.QueryRow(ctx, query, networkName)
	if err != nil {
		return 0, fmt.Errorf("failed to get current slot: %w", err)
	}

	if result["slot"] == nil {
		return 0, fmt.Errorf("no slots found for network %s", networkName)
	}

	// Convert the result to int64
	slot, err := strconv.ParseInt(fmt.Sprintf("%v", result["slot"]), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse slot: %w", err)
	}

	return slot, nil
}

// processSlot processes a single slot
func (b *BeaconSlots) processSlot(ctx context.Context, networkName string, slot int64) (bool, error) {
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

// getBlockData gets block data from ClickHouse
func (b *BeaconSlots) getBlockData(ctx context.Context, networkName string, slot int64) (*pb.BlockData, error) {
	// Query ClickHouse for detailed block data
	query := `
		SELECT
			slot,
			block_root,
			parent_root,
			state_root,
			proposer_index,
			block_version,
			signature,
			eth1_data_block_hash,
			eth1_data_deposit_root,
			execution_payload_block_hash,
			execution_payload_block_number,
			execution_payload_fee_recipient,
			execution_payload_base_fee_per_gas,
			execution_payload_blob_gas_used,
			execution_payload_excess_blob_gas,
			execution_payload_gas_limit,
			execution_payload_gas_used,
			execution_payload_state_root,
			execution_payload_parent_hash,
			execution_payload_transactions_count,
			execution_payload_transactions_total_bytes,
			execution_payload_transactions_total_bytes_compressed,
			block_total_bytes,
			block_total_bytes_compressed
		FROM xatu.beacon_api_eth_v1_events_block
		WHERE network = $1 AND slot = $2
		LIMIT 1
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	result, err := ch.QueryRow(ctx, query, networkName, slot)
	if err != nil {
		return nil, fmt.Errorf("failed to get block data: %w", err)
	}

	if result == nil || len(result) == 0 {
		return nil, nil
	}

	// Calculate slot and epoch times
	// In a real implementation, these would be calculated from genesis time
	slotTime := time.Now()  // Placeholder
	epochTime := time.Now() // Placeholder
	epoch := slot / 32      // 32 slots per epoch in Ethereum

	// Create a new BlockData object with all fields
	blockData := &pb.BlockData{
		Slot:                         slot,
		SlotStartDateTime:            timestamppb.New(slotTime),
		Epoch:                        epoch,
		EpochStartDateTime:           timestamppb.New(epochTime),
		BlockRoot:                    getStringOrEmpty(result["block_root"]),
		BlockVersion:                 getStringOrEmpty(result["block_version"]),
		ParentRoot:                   getStringOrEmpty(result["parent_root"]),
		StateRoot:                    getStringOrEmpty(result["state_root"]),
		Eth1DataBlockHash:            getStringOrEmpty(result["eth1_data_block_hash"]),
		Eth1DataDepositRoot:          getStringOrEmpty(result["eth1_data_deposit_root"]),
		ExecutionPayloadBlockHash:    getStringOrEmpty(result["execution_payload_block_hash"]),
		ExecutionPayloadFeeRecipient: getStringOrEmpty(result["execution_payload_fee_recipient"]),
		ExecutionPayloadStateRoot:    getStringOrEmpty(result["execution_payload_state_root"]),
		ExecutionPayloadParentHash:   getStringOrEmpty(result["execution_payload_parent_hash"]),
	}

	// Parse numeric fields
	if proposerIndex, err := strconv.ParseInt(fmt.Sprintf("%v", result["proposer_index"]), 10, 64); err == nil {
		blockData.ProposerIndex = proposerIndex
	}

	if execBlockNumber, err := strconv.ParseInt(fmt.Sprintf("%v", result["execution_payload_block_number"]), 10, 64); err == nil {
		blockData.ExecutionPayloadBlockNumber = execBlockNumber
	}

	// Parse nullable numeric fields using wrapper types
	if val := result["block_total_bytes"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.BlockTotalBytes = wrapperspb.Int64(num)
		}
	}

	if val := result["block_total_bytes_compressed"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.BlockTotalBytesCompressed = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_base_fee_per_gas"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadBaseFeePerGas = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_blob_gas_used"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadBlobGasUsed = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_excess_blob_gas"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadExcessBlobGas = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_gas_limit"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadGasLimit = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_gas_used"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadGasUsed = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_transactions_count"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadTransactionsCount = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_transactions_total_bytes"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadTransactionsTotalBytes = wrapperspb.Int64(num)
		}
	}

	if val := result["execution_payload_transactions_total_bytes_compressed"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadTransactionsTotalBytesCompressed = wrapperspb.Int64(num)
		}
	}

	return blockData, nil
}

// getProposerData gets proposer data from ClickHouse
func (b *BeaconSlots) getProposerData(ctx context.Context, networkName string, slot int64) (*pb.Proposer, error) {
	query := `
		SELECT
			slot,
			proposer_index
		FROM xatu.beacon_api_eth_v1_events_block
		WHERE network = $1 AND slot = $2
		LIMIT 1
	`

	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	result, err := ch.QueryRow(ctx, query, networkName, slot)
	if err != nil {
		return nil, fmt.Errorf("failed to get proposer data: %w", err)
	}

	if result == nil || len(result) == 0 {
		return nil, fmt.Errorf("no proposer data found for slot %d", slot)
	}

	proposerIndex, err := strconv.ParseInt(fmt.Sprintf("%v", result["proposer_index"]), 10, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse proposer index: %w", err)
	}

	return &pb.Proposer{
		Slot:                   slot,
		ProposerValidatorIndex: proposerIndex,
	}, nil
}

// getSlotWindow returns the start and end times for a slot with a 15 minute grace period
func (b *BeaconSlots) getSlotWindow(ctx context.Context, networkName string, slot int64) (time.Time, time.Time) {
	// This is a simplified implementation - in practice would calculate from genesis
	// Following the Python implementation with 15 minutes added on either side

	// For simplicity, for now we'll just return a window around the current time
	// In a full implementation, this would calculate properly from slot and genesis time
	now := time.Now().UTC()
	startTime := now.Add(-15 * time.Minute)
	endTime := now.Add(15 * time.Minute)

	return startTime, endTime
}

func getStringOrNil(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Helper function to extract username from client name
func extractUsername(name string) string {
	// This implementation follows the Python Node.extract_username method
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

// lookupGeoCoordinates performs a geo lookup for given city/country.
// Placeholder implementation.
func (b *BeaconSlots) lookupGeoCoordinates(city, country string) (*float64, *float64) {
	geocoder := openstreetmap.Geocoder()
	location, err := geocoder.Geocode(city + ", " + country)
	if err != nil {
		b.log.WithError(err).WithFields(logrus.Fields{
			"city":    city,
			"country": country,
		}).Warn("Geocoding lookup failed")
		return nil, nil
	}
	if location == nil {
		return nil, nil
	}
	return &location.Lat, &location.Lng
}
