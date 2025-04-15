package beacon_slots

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/codingsince1985/geo-golang/openstreetmap"
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
	MissingProcessorName  = "missing"
	MiddleProcessorName   = "middle" // Processor for the initial recent window
)

// BlockData represents a beacon block
type BlockData struct {
	Slot               int64     `json:"slot"`
	SlotStartDateTime  time.Time `json:"slotStartDateTime"`
	Epoch              int64     `json:"epoch"`
	EpochStartDateTime time.Time `json:"epochStartDateTime"`
	BlockRoot          string    `json:"blockRoot"`
	BlockVersion       string    `json:"blockVersion"`
	BlockTotalBytes    *int64    `json:"blockTotalBytes,omitempty"`
	ParentRoot         string    `json:"parentRoot"`
	StateRoot          string    `json:"stateRoot"`
	ProposerIndex      int64     `json:"proposerIndex"`
	// Add other fields as needed based on the Python implementation
}

// ProposerData represents proposer information
type ProposerData struct {
	Slot                   int64 `json:"slot"`
	ProposerValidatorIndex int64 `json:"proposerValidatorIndex"`
}

// SeenAtSlotTimeData represents timing data for when a block was seen
type SeenAtSlotTimeData struct {
	SlotTimeMs             int64  `json:"slotTimeMs"`
	MetaClientName         string `json:"metaClientName"`
	MetaClientGeoCity      string `json:"metaClientGeoCity"`
	MetaClientGeoCountry   string `json:"metaClientGeoCountry"`
	MetaClientGeoContinent string `json:"metaClientGeoContinent"`
}

// BlobSeenAtSlotTimeData represents timing data for when a blob was seen
type BlobSeenAtSlotTimeData struct {
	SlotTimeMs             int64  `json:"slotTimeMs"`
	BlobIndex              int64  `json:"blobIndex"`
	MetaClientName         string `json:"metaClientName"`
	MetaClientGeoCity      string `json:"metaClientGeoCity"`
	MetaClientGeoCountry   string `json:"metaClientGeoCountry"`
	MetaClientGeoContinent string `json:"metaClientGeoContinent"`
}

// Node represents a client with geo data
type Node struct {
	Name             string   `json:"name"`
	Username         string   `json:"username"`
	GeoCity          string   `json:"geoCity"`
	GeoCountry       string   `json:"geoCountry"`
	GeoContinentCode string   `json:"geoContinentCode"`
	GeoLatitude      *float64 `json:"geoLatitude,omitempty"`
	GeoLongitude     *float64 `json:"geoLongitude,omitempty"`
}

// AttestationWindow represents a window of attestations
type AttestationWindow struct {
	StartMs          int64   `json:"startMs"`
	EndMs            int64   `json:"endMs"`
	ValidatorIndices []int64 `json:"validatorIndices"`
}

// OptimizedSlotData represents optimized slot data for storage
type OptimizedSlotData struct {
	Slot                    int64                      `json:"slot"`
	Network                 string                     `json:"network"`
	ProcessedAt             string                     `json:"processedAt"`
	ProcessingTimeMs        int64                      `json:"processingTimeMs"`
	Block                   map[string]interface{}     `json:"block"`
	Proposer                map[string]interface{}     `json:"proposer"`
	Entity                  *string                    `json:"entity,omitempty"`
	Nodes                   map[string]Node            `json:"nodes"`
	BlockSeenTimes          map[string]int64           `json:"blockSeenTimes"`
	BlobSeenTimes           map[string]map[int64]int64 `json:"blobSeenTimes"`
	BlockFirstSeenP2PTimes  map[string]int64           `json:"blockFirstSeenP2PTimes"`
	BlobFirstSeenP2PTimes   map[string]map[int64]int64 `json:"blobFirstSeenP2PTimes"`
	AttestationWindows      []AttestationWindow        `json:"attestationWindows"`
	MaximumAttestationVotes int64                      `json:"maximumAttestationVotes"`
}

type BeaconSlots struct {
	log logrus.FieldLogger

	config *Config

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
	storageClient storage.Client,
	lockerClient locker.Locker,
) (*BeaconSlots, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid beacon_slots config: %w", err)
	}

	return &BeaconSlots{
		log:           log.WithField("component", "service/"+ServiceName),
		config:        config,
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
		TTL:             15 * time.Minute,
		RefreshInterval: 5 * time.Second,

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
func (b *BeaconSlots) loadState(network string) (*State, error) {
	state := &State{
		Processors: make(map[string]ProcessorState),
	}
	key := GetStateKey(network)
	data, err := b.storageClient.Get(b.getStoragePath(key))
	if err != nil {
		if err == storage.ErrNotFound {
			b.log.WithField("network", network).Info("No previous state found, starting fresh.")
			return state, nil // Return empty state if not found
		}
		return nil, fmt.Errorf("failed to get state for network %s: %w", network, err)
	}

	if err := FromJSON(string(data), state); err != nil {
		return nil, fmt.Errorf("failed to unmarshal state for network %s: %w", network, err)
	}

	return state, nil
}

// saveState saves the state for a given network.
func (b *BeaconSlots) saveState(network string, state *State) error {
	key := GetStateKey(network)

	jsonData, err := ToJSON(state)
	if err != nil {
		return fmt.Errorf("failed to marshal state for network %s: %w", network, err)
	}

	err = b.storageClient.Store(b.getStoragePath(key), []byte(jsonData))
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
	state, err := b.loadState(networkName)
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
		if err := b.saveState(networkName, state); err != nil {
			b.log.WithField("network", networkName).WithError(err).Error("Failed to save state")
		}
	}
}

// processBacklog processes historical slots
func (b *BeaconSlots) processBacklog(ctx context.Context, networkName string) {
	b.log.WithField("network", networkName).Debug("Processing backlog slots")

	// Get state
	state, err := b.loadState(networkName)
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
		if err := b.saveState(networkName, state); err != nil {
			b.log.WithField("network", networkName).WithError(err).Error("Failed to save state")
		}
	}
}

// processMissing checks for and processes any slots that might have been missed
func (b *BeaconSlots) processMissing(ctx context.Context, networkName string) {
	b.log.WithField("network", networkName).Debug("Processing missing slots")

	// Get state
	state, err := b.loadState(networkName)
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
	if err := b.saveState(networkName, state); err != nil {
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

	// 1. Get block data
	blockData, err := b.getBlockData(ctx, networkName, slot)
	if err != nil {
		return false, fmt.Errorf("failed to get block data: %w", err)
	}

	// If no block data was found, this slot might not have a block
	if blockData == nil {
		b.log.WithField("slot", slot).Debug("No block data found for slot")
		return false, nil
	}

	// 2. Get proposer data
	proposerData, err := b.getProposerData(ctx, networkName, slot)
	if err != nil {
		return false, fmt.Errorf("failed to get proposer data: %w", err)
	}

	// Get the entity for the proposer
	entity, err := b.getProposerEntity(ctx, networkName, blockData.ProposerIndex)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get proposer entity, continuing without it")
	}

	// 3. Get various timing data
	b.log.WithField("slot", slot).Debug("Fetching timing data...")
	blockSeenAtSlotTime, err := b.getBlockSeenAtSlotTime(ctx, networkName, slot)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get block seen times, continuing with empty data")
		blockSeenAtSlotTime = []SeenAtSlotTimeData{}
	}

	blobSeenAtSlotTime, err := b.getBlobSeenAtSlotTime(ctx, networkName, slot)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get blob seen times, continuing with empty data")
		blobSeenAtSlotTime = []BlobSeenAtSlotTimeData{}
	}

	blockFirstSeenInP2PSlotTime, err := b.getBlockFirstSeenInP2PSlotTime(ctx, networkName, slot)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get block first seen in P2P times, continuing with empty data")
		blockFirstSeenInP2PSlotTime = []SeenAtSlotTimeData{}
	}

	blobFirstSeenInP2PSlotTime, err := b.getBlobFirstSeenInP2PSlotTime(ctx, networkName, slot)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get blob first seen in P2P times, continuing with empty data")
		blobFirstSeenInP2PSlotTime = []BlobSeenAtSlotTimeData{}
	}

	// 4. Get attestation data
	maxAttestationVotes, err := b.getMaximumAttestationVotes(ctx, networkName, slot)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get maximum attestation votes, continuing with default")
		maxAttestationVotes = 0
	}

	attestationVotes, err := b.getAttestationVotes(ctx, networkName, slot, blockData.BlockRoot)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Warning("Failed to get attestation votes, continuing with empty data")
		attestationVotes = make(map[int64]int64)
	}

	// 5. Transform the data for storage
	processingTime := time.Since(startTime).Milliseconds()

	optimizedData, err := b.transformSlotDataForStorage(
		slot,
		networkName,
		time.Now().UTC().Format(time.RFC3339),
		processingTime,
		blockData,
		proposerData,
		maxAttestationVotes,
		entity,
		blockSeenAtSlotTime,
		blobSeenAtSlotTime,
		blockFirstSeenInP2PSlotTime,
		blobFirstSeenInP2PSlotTime,
		attestationVotes,
	)
	if err != nil {
		return false, fmt.Errorf("failed to transform slot data: %w", err)
	}

	// 6. Store the data to storage
	storageKey := fmt.Sprintf("slots/%s/%d", networkName, slot)
	jsonData, err := ToJSON(optimizedData)
	if err != nil {
		return false, fmt.Errorf("failed to marshal optimized data: %w", err)
	}

	err = b.storageClient.Store(b.getStoragePath(storageKey), []byte(jsonData))
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
func (b *BeaconSlots) getBlockData(ctx context.Context, networkName string, slot int64) (*BlockData, error) {
	// This is a simplified implementation
	// The actual implementation would need to query ClickHouse for detailed block data

	query := `
		SELECT
			slot,
			block_root,
			parent_root,
			state_root,
			proposer_index,
			block_version,
			signature
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

	// Create a BlockData object
	slotTime := time.Now()  // Placeholder, would calculate from slot and genesis time
	epochTime := time.Now() // Placeholder, would calculate from epoch and genesis time

	blockData := &BlockData{
		Slot:               slot,
		SlotStartDateTime:  slotTime,
		Epoch:              slot / 32, // 32 slots per epoch in Ethereum
		EpochStartDateTime: epochTime,
		BlockRoot:          fmt.Sprintf("%v", result["block_root"]),
		BlockVersion:       fmt.Sprintf("%v", result["block_version"]),
		ParentRoot:         fmt.Sprintf("%v", result["parent_root"]),
		StateRoot:          fmt.Sprintf("%v", result["state_root"]),
	}

	// Parse proposer_index
	if proposerIndex, err := strconv.ParseInt(fmt.Sprintf("%v", result["proposer_index"]), 10, 64); err == nil {
		blockData.ProposerIndex = proposerIndex
	}

	return blockData, nil
}

// getProposerData gets proposer data from ClickHouse
func (b *BeaconSlots) getProposerData(ctx context.Context, networkName string, slot int64) (*ProposerData, error) {
	// This is a simplified implementation
	// The actual implementation would need to query ClickHouse for proposer data

	query := `
		SELECT
			slot,
			proposer_index
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
		return nil, fmt.Errorf("failed to get proposer data: %w", err)
	}

	if result == nil || len(result) == 0 {
		return nil, fmt.Errorf("no proposer data found for slot %d", slot)
	}

	// Parse proposer_index
	proposerIndex, err := strconv.ParseInt(fmt.Sprintf("%v", result["proposer_index"]), 10, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse proposer index: %w", err)
	}

	return &ProposerData{
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

// getMaximumAttestationVotes gets the maximum attestation votes for a slot
func (b *BeaconSlots) getMaximumAttestationVotes(ctx context.Context, networkName string, slot int64) (int64, error) {
	// Get start and end dates for the slot with grace period
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT 
			MAX(committee_size * (CAST(committee_index AS UInt32) + 1)) as max_attestations
		FROM (
			SELECT
				length(validators) as committee_size,
				committee_index
			FROM xatu.beacon_api_eth_v1_beacon_committee
			WHERE
				slot = $1
				AND network = $2
				AND slot_start_date_time BETWEEN $3 AND $4
		)
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return 0, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.QueryRow(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return 0, fmt.Errorf("failed to get maximum attestation votes: %w", err)
	}

	if result["max_attestations"] == nil {
		return 0, nil
	}

	// Convert the result to int64
	maxVotes, err := strconv.ParseInt(fmt.Sprintf("%v", result["max_attestations"]), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse max attestations: %w", err)
	}

	return maxVotes, nil
}

// getAttestationVotes gets attestation votes for a slot and block root
func (b *BeaconSlots) getAttestationVotes(ctx context.Context, networkName string, slot int64, blockRoot string) (map[int64]int64, error) {
	// Get start and end dates for the slot without any grace period
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		WITH 
		raw_data AS (
			SELECT 
				attesting_validator_index,
				MIN(propagation_slot_start_diff) as min_propagation_time
			FROM xatu.beacon_api_eth_v1_events_attestation
			WHERE
				slot = $1
				AND meta_network_name = $2
				AND slot_start_date_time BETWEEN $3 AND $4
				AND beacon_block_root = $5
				AND attesting_validator_index IS NOT NULL
				AND propagation_slot_start_diff <= 12000
			GROUP BY attesting_validator_index
		),
		floor_time AS (
			SELECT MIN(min_propagation_time) as floor_time
			FROM raw_data
		)
		SELECT
			attesting_validator_index,
			FLOOR((min_propagation_time - floor_time) / 50) * 50 + floor_time as min_propagation_time
		FROM raw_data, floor_time
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr, blockRoot)
	if err != nil {
		return nil, fmt.Errorf("failed to get attestation votes: %w", err)
	}

	attestationTimes := make(map[int64]int64)
	for _, row := range result {
		validatorIndex, err := strconv.ParseInt(fmt.Sprintf("%v", row["attesting_validator_index"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}
		minTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["min_propagation_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}
		attestationTimes[validatorIndex] = minTime
	}

	return attestationTimes, nil
}

// transformSlotDataForStorage transforms slot data into optimized format for storage
func (b *BeaconSlots) transformSlotDataForStorage(
	slot int64,
	network string,
	processedAt string,
	processingTimeMs int64,
	blockData *BlockData,
	proposerData *ProposerData,
	maximumAttestationVotes int64,
	entity *string,
	blockSeenAtSlotTime []SeenAtSlotTimeData,
	blobSeenAtSlotTime []BlobSeenAtSlotTimeData,
	blockFirstSeenInP2PSlotTime []SeenAtSlotTimeData,
	blobFirstSeenInP2PSlotTime []BlobSeenAtSlotTimeData,
	attestationVotes map[int64]int64,
) (*OptimizedSlotData, error) {
	// Create nodes map
	nodes := make(map[string]Node)

	// Helper to add node
	addNode := func(name, city, country, continent string) {
		if _, exists := nodes[name]; !exists {
			nodes[name] = Node{
				Name:             name,
				Username:         extractUsername(name),
				GeoCity:          city,
				GeoCountry:       country,
				GeoContinentCode: continent,
			}
			// Perform geo lookup
			lat, lon := b.lookupGeoCoordinates(city, country)
			if lat != nil && lon != nil {
				node := nodes[name] // Get the node again to modify
				node.GeoLatitude = lat
				node.GeoLongitude = lon
				nodes[name] = node // Put the modified node back
			}
		}
	}

	// Process all node data to build nodes map
	for _, d := range blockSeenAtSlotTime {
		addNode(d.MetaClientName, d.MetaClientGeoCity, d.MetaClientGeoCountry, d.MetaClientGeoContinent)
	}
	for _, d := range blobSeenAtSlotTime {
		addNode(d.MetaClientName, d.MetaClientGeoCity, d.MetaClientGeoCountry, d.MetaClientGeoContinent)
	}
	for _, d := range blockFirstSeenInP2PSlotTime {
		addNode(d.MetaClientName, d.MetaClientGeoCity, d.MetaClientGeoCountry, d.MetaClientGeoContinent)
	}
	for _, d := range blobFirstSeenInP2PSlotTime {
		addNode(d.MetaClientName, d.MetaClientGeoCity, d.MetaClientGeoCountry, d.MetaClientGeoContinent)
	}

	// Build timing dictionaries
	blockSeenTimes := make(map[string]int64)
	for _, d := range blockSeenAtSlotTime {
		blockSeenTimes[d.MetaClientName] = d.SlotTimeMs
	}

	blockFirstSeenP2PTimes := make(map[string]int64)
	for _, d := range blockFirstSeenInP2PSlotTime {
		blockFirstSeenP2PTimes[d.MetaClientName] = d.SlotTimeMs
	}

	// Build blob timing dictionaries
	blobSeenTimes := make(map[string]map[int64]int64)
	for _, d := range blobSeenAtSlotTime {
		if _, ok := blobSeenTimes[d.MetaClientName]; !ok {
			blobSeenTimes[d.MetaClientName] = make(map[int64]int64)
		}
		blobSeenTimes[d.MetaClientName][d.BlobIndex] = d.SlotTimeMs
	}

	blobFirstSeenP2PTimes := make(map[string]map[int64]int64)
	for _, d := range blobFirstSeenInP2PSlotTime {
		if _, ok := blobFirstSeenP2PTimes[d.MetaClientName]; !ok {
			blobFirstSeenP2PTimes[d.MetaClientName] = make(map[int64]int64)
		}
		blobFirstSeenP2PTimes[d.MetaClientName][d.BlobIndex] = d.SlotTimeMs
	}

	// Transform attestation votes into windows
	// Group attestations by time windows (50ms buckets)
	attestationBuckets := make(map[int64][]int64)
	for validatorIndex, timeMs := range attestationVotes {
		bucket := timeMs - (timeMs % 50) // Round down to nearest 50ms
		if _, ok := attestationBuckets[bucket]; !ok {
			attestationBuckets[bucket] = make([]int64, 0)
		}
		attestationBuckets[bucket] = append(attestationBuckets[bucket], validatorIndex)
	}

	// Create attestation windows from buckets
	attestationWindows := make([]AttestationWindow, 0, len(attestationBuckets))
	for startMs, indices := range attestationBuckets {
		window := AttestationWindow{
			StartMs:          startMs,
			EndMs:            startMs + 50,
			ValidatorIndices: indices,
		}
		attestationWindows = append(attestationWindows, window)
	}

	// Convert block data and proposer data to maps
	blockDataMap := make(map[string]interface{})
	blockJSON, err := ToJSON(blockData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal block data: %w", err)
	}
	if err := FromJSON(blockJSON, &blockDataMap); err != nil {
		return nil, fmt.Errorf("failed to unmarshal block data: %w", err)
	}

	proposerDataMap := make(map[string]interface{})
	proposerJSON, err := ToJSON(proposerData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal proposer data: %w", err)
	}
	if err := FromJSON(proposerJSON, &proposerDataMap); err != nil {
		return nil, fmt.Errorf("failed to unmarshal proposer data: %w", err)
	}

	return &OptimizedSlotData{
		Slot:                    slot,
		Network:                 network,
		ProcessedAt:             processedAt,
		ProcessingTimeMs:        processingTimeMs,
		Block:                   blockDataMap,
		Proposer:                proposerDataMap,
		Entity:                  entity,
		Nodes:                   nodes,
		BlockSeenTimes:          blockSeenTimes,
		BlobSeenTimes:           blobSeenTimes,
		BlockFirstSeenP2PTimes:  blockFirstSeenP2PTimes,
		BlobFirstSeenP2PTimes:   blobFirstSeenP2PTimes,
		AttestationWindows:      attestationWindows,
		MaximumAttestationVotes: maximumAttestationVotes,
	}, nil
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

// getProposerEntity gets entity for a given validator index
func (b *BeaconSlots) getProposerEntity(ctx context.Context, networkName string, index int64) (*string, error) {
	// This implementation is simplified - in the actual application,
	// we would need to check validator_entity lookup first

	// Query ClickHouse for the entity
	query := `
		SELECT
			entity
		FROM xatu.ethseer_validator_entity FINAL
		WHERE
			index = $1
			AND meta_network_name = $2
		GROUP BY entity
		LIMIT 1
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.QueryRow(ctx, query, index, networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get entity: %w", err)
	}

	if result == nil || result["entity"] == nil {
		return nil, nil // No entity found
	}

	entity := fmt.Sprintf("%v", result["entity"])
	return &entity, nil
}

// getBlockSeenAtSlotTime gets seen at slot time data for a given slot
func (b *BeaconSlots) getBlockSeenAtSlotTime(ctx context.Context, networkName string, slot int64) ([]SeenAtSlotTimeData, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		WITH api_events AS (
			SELECT
				propagation_slot_start_diff as slot_time,
				meta_client_name,
				meta_client_geo_city, 
				meta_client_geo_country,
				meta_client_geo_continent_code,
				event_date_time
			FROM xatu.beacon_api_eth_v1_events_block FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		),
		head_events AS (
			SELECT 
				propagation_slot_start_diff as slot_time,
				meta_client_name,
				meta_client_geo_city,
				meta_client_geo_country, 
				meta_client_geo_continent_code,
				event_date_time
			FROM xatu.beacon_api_eth_v1_events_block FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		),
		combined_events AS (
			SELECT * FROM api_events
			UNION ALL
			SELECT * FROM head_events
		)
		SELECT
			slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY event_date_time ASC) as rn
			FROM combined_events
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	args := []interface{}{slot, networkName, startStr, endStr, slot, networkName, startStr, endStr}

	// Execute the query
	result, err := ch.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get block seen at slot time: %w", err)
	}

	seenAtSlotTimeData := make([]SeenAtSlotTimeData, 0, len(result))
	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		d := SeenAtSlotTimeData{
			SlotTimeMs:             slotTime,
			MetaClientName:         fmt.Sprintf("%v", row["meta_client_name"]),
			MetaClientGeoCity:      getStringOrEmpty(row["meta_client_geo_city"]),
			MetaClientGeoCountry:   getStringOrEmpty(row["meta_client_geo_country"]),
			MetaClientGeoContinent: getStringOrEmpty(row["meta_client_geo_continent_code"]),
		}
		seenAtSlotTimeData = append(seenAtSlotTimeData, d)
	}

	return seenAtSlotTimeData, nil
}

// getBlobSeenAtSlotTime gets seen at slot time data for blobs in a given slot
func (b *BeaconSlots) getBlobSeenAtSlotTime(ctx context.Context, networkName string, slot int64) ([]BlobSeenAtSlotTimeData, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT
			propagation_slot_start_diff as slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code,
			blob_index
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name, blob_index ORDER BY event_date_time ASC) as rn
			FROM xatu.beacon_api_eth_v1_events_blob_sidecar FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob seen at slot time: %w", err)
	}

	blobSeenAtSlotTimeData := make([]BlobSeenAtSlotTimeData, 0, len(result))
	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		blobIndex, err := strconv.ParseInt(fmt.Sprintf("%v", row["blob_index"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		d := BlobSeenAtSlotTimeData{
			SlotTimeMs:             slotTime,
			BlobIndex:              blobIndex,
			MetaClientName:         fmt.Sprintf("%v", row["meta_client_name"]),
			MetaClientGeoCity:      getStringOrEmpty(row["meta_client_geo_city"]),
			MetaClientGeoCountry:   getStringOrEmpty(row["meta_client_geo_country"]),
			MetaClientGeoContinent: getStringOrEmpty(row["meta_client_geo_continent_code"]),
		}
		blobSeenAtSlotTimeData = append(blobSeenAtSlotTimeData, d)
	}

	return blobSeenAtSlotTimeData, nil
}

// getBlockFirstSeenInP2PSlotTime gets first seen in P2P slot time data for a given slot
func (b *BeaconSlots) getBlockFirstSeenInP2PSlotTime(ctx context.Context, networkName string, slot int64) ([]SeenAtSlotTimeData, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT
			propagation_slot_start_diff as slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY event_date_time ASC) as rn
			FROM xatu.libp2p_gossipsub_beacon_block FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get block first seen in P2P data: %w", err)
	}

	seenAtSlotTimeData := make([]SeenAtSlotTimeData, 0, len(result))
	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		d := SeenAtSlotTimeData{
			SlotTimeMs:             slotTime,
			MetaClientName:         fmt.Sprintf("%v", row["meta_client_name"]),
			MetaClientGeoCity:      getStringOrEmpty(row["meta_client_geo_city"]),
			MetaClientGeoCountry:   getStringOrEmpty(row["meta_client_geo_country"]),
			MetaClientGeoContinent: getStringOrEmpty(row["meta_client_geo_continent_code"]),
		}
		seenAtSlotTimeData = append(seenAtSlotTimeData, d)
	}

	return seenAtSlotTimeData, nil
}

// getBlobFirstSeenInP2PSlotTime gets first seen in P2P slot time data for blobs in a given slot
func (b *BeaconSlots) getBlobFirstSeenInP2PSlotTime(ctx context.Context, networkName string, slot int64) ([]BlobSeenAtSlotTimeData, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT
			propagation_slot_start_diff as slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code,
			blob_index
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name, blob_index ORDER BY event_date_time ASC) as rn
			FROM xatu.libp2p_gossipsub_blob_sidecar FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob first seen in P2P data: %w", err)
	}

	blobSeenAtSlotTimeData := make([]BlobSeenAtSlotTimeData, 0, len(result))
	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		blobIndex, err := strconv.ParseInt(fmt.Sprintf("%v", row["blob_index"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		d := BlobSeenAtSlotTimeData{
			SlotTimeMs:             slotTime,
			BlobIndex:              blobIndex,
			MetaClientName:         fmt.Sprintf("%v", row["meta_client_name"]),
			MetaClientGeoCity:      getStringOrEmpty(row["meta_client_geo_city"]),
			MetaClientGeoCountry:   getStringOrEmpty(row["meta_client_geo_country"]),
			MetaClientGeoContinent: getStringOrEmpty(row["meta_client_geo_continent_code"]),
		}
		blobSeenAtSlotTimeData = append(blobSeenAtSlotTimeData, d)
	}

	return blobSeenAtSlotTimeData, nil
}

// Helper function to get string or empty string if nil
func getStringOrEmpty(value interface{}) string {
	if value == nil {
		return ""
	}
	return fmt.Sprintf("%v", value)
}

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
	state, err := b.loadState(networkName)
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
	if err := b.saveState(networkName, state); err != nil {
		b.log.WithField("network", networkName).WithError(err).Error("Failed to save state after middle window processing")
	}
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

// --- Configuration Getters ---

// IsEnabled returns true if the service is enabled in the config.
func (b *BeaconSlots) IsEnabled() bool {
	return b.config.Enabled
}

// GetNetworks returns the list of configured networks.
func (b *BeaconSlots) GetNetworks() []string {
	return b.config.Networks
}

// GetBackfillSlotsAgo returns the configured number of slots to backfill.
func (b *BeaconSlots) GetBackfillSlotsAgo() int64 {
	return b.config.Backfill.SlotsAgo
}

// GetMiddleProcessorDuration returns the configured duration for the middle processor.
func (b *BeaconSlots) GetMiddleProcessorDuration() time.Duration {
	return b.config.Backfill.MiddleProcessorDuration
}

// GetMiddleProcessorEnabled returns true if the middle processor is enabled.
func (b *BeaconSlots) GetMiddleProcessorEnabled() bool {
	return b.config.Backfill.MiddleProcessorEnable
}
