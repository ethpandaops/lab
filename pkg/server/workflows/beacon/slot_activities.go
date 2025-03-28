package beacon

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/sirupsen/logrus"
)

// ActivityImplementations holds implementations for all beacon slot activities
type ActivityImplementations struct {
	log logrus.FieldLogger
	lab *lab.Lab
}

// NewActivityImplementations creates a new ActivityImplementations
func NewActivityImplementations(lab *lab.Lab) *ActivityImplementations {
	return &ActivityImplementations{
		log: lab.Log().WithField("component", "beacon_activities"),
		lab: lab,
	}
}

// GetCurrentSlot returns the current slot for a network
func (a *ActivityImplementations) GetCurrentSlot(ctx context.Context, params GetCurrentSlotParams) (int64, error) {
	a.log.WithField("network", params.NetworkName).Info("Getting current slot")

	// Query ClickHouse for the current slot
	query := `
		SELECT MAX(slot) AS slot
		FROM xatu.beacon_api_eth_v1_events_block
		WHERE network = $1
	`

	// Use the network-specific Xatu client if available
	result, err := a.lab.Xatu(params.NetworkName).QueryRow(query, params.NetworkName)
	if err != nil {
		return 0, fmt.Errorf("failed to get current slot: %w", err)
	}

	if result["slot"] == nil {
		return 0, fmt.Errorf("no slots found for network %s", params.NetworkName)
	}

	// Convert the result to int64
	slot, err := strconv.ParseInt(fmt.Sprintf("%v", result["slot"]), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse slot: %w", err)
	}

	return slot, nil
}

// ProcessSlot processes a single slot
func (a *ActivityImplementations) ProcessSlot(ctx context.Context, params ProcessSlotParams) (bool, error) {
	a.log.WithField("network", params.NetworkName).
		WithField("slot", params.Slot).
		Info("Processing slot")

	// 1. Get block data
	blockData, err := a.getBlockData(ctx, params.NetworkName, params.Slot)
	if err != nil {
		return false, fmt.Errorf("failed to get block data: %w", err)
	}

	// If no block data was found, this slot might not have a block
	if blockData == nil {
		a.log.WithField("slot", params.Slot).Info("No block data found for slot")
		return false, nil
	}

	// 2. Get proposer data
	proposerData, err := a.getProposerData(ctx, params.NetworkName, params.Slot)
	if err != nil {
		return false, fmt.Errorf("failed to get proposer data: %w", err)
	}

	// 3. Get various timing data
	// For now, we'll create empty data structures
	blockSeenAtSlotTime := []SeenAtSlotTimeData{}
	blobSeenAtSlotTime := []BlobSeenAtSlotTimeData{}
	blockFirstSeenInP2PSlotTime := []SeenAtSlotTimeData{}
	blobFirstSeenInP2PSlotTime := []BlobSeenAtSlotTimeData{}

	// 4. Get attestation data
	maxAttestationVotes, err := a.getMaximumAttestationVotes(ctx, params.NetworkName, params.Slot)
	if err != nil {
		return false, fmt.Errorf("failed to get maximum attestation votes: %w", err)
	}

	attestationVotes, err := a.getAttestationVotes(ctx, params.NetworkName, params.Slot, blockData.BlockRoot)
	if err != nil {
		return false, fmt.Errorf("failed to get attestation votes: %w", err)
	}

	// 5. Transform the data for storage
	optimizedData, err := a.transformSlotDataForStorage(
		params.Slot,
		params.NetworkName,
		time.Now().UTC().Format(time.RFC3339),
		0, // Processing time will be calculated during actual implementation
		blockData,
		proposerData,
		maxAttestationVotes,
		nil, // Entity is optional
		blockSeenAtSlotTime,
		blobSeenAtSlotTime,
		blockFirstSeenInP2PSlotTime,
		blobFirstSeenInP2PSlotTime,
		attestationVotes,
	)
	if err != nil {
		return false, fmt.Errorf("failed to transform slot data: %w", err)
	}

	// 6. Store the data to S3
	storageKey := fmt.Sprintf("beacon/slots/%s/%d.json", params.NetworkName, params.Slot)
	jsonData, err := ToJSON(optimizedData)
	if err != nil {
		return false, fmt.Errorf("failed to marshal optimized data: %w", err)
	}

	err = a.lab.Storage().Store(storageKey, []byte(jsonData))
	if err != nil {
		return false, fmt.Errorf("failed to store slot data: %w", err)
	}

	return true, nil
}

// Helper methods

// getBlockData gets block data from ClickHouse
func (a *ActivityImplementations) getBlockData(ctx context.Context, networkName string, slot int64) (*BlockData, error) {
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

	result, err := a.lab.Xatu(networkName).QueryRow(query, networkName, slot)
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
func (a *ActivityImplementations) getProposerData(ctx context.Context, networkName string, slot int64) (*ProposerData, error) {
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

	result, err := a.lab.Xatu(networkName).QueryRow(query, networkName, slot)
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

// getMaximumAttestationVotes gets the maximum attestation votes for a slot
func (a *ActivityImplementations) getMaximumAttestationVotes(ctx context.Context, networkName string, slot int64) (int64, error) {
	// This is a simplified implementation
	// The actual implementation would need to query ClickHouse for maximum attestation votes

	// For now, return a placeholder value
	return 1000, nil
}

// getAttestationVotes gets attestation votes for a slot and block root
func (a *ActivityImplementations) getAttestationVotes(ctx context.Context, networkName string, slot int64, blockRoot string) (map[int64]int64, error) {
	// This is a simplified implementation
	// The actual implementation would need to query ClickHouse for attestation votes

	// For now, return a placeholder map
	return map[int64]int64{
		0: 10,
		1: 20,
		2: 30,
	}, nil
}

// transformSlotDataForStorage transforms slot data into optimized format for storage
func (a *ActivityImplementations) transformSlotDataForStorage(
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

	// Add nodes from seen times
	for _, seen := range blockSeenAtSlotTime {
		nodes[seen.MetaClientName] = Node{
			Name:             seen.MetaClientName,
			Username:         extractUsername(seen.MetaClientName),
			GeoCity:          seen.MetaClientGeoCity,
			GeoCountry:       seen.MetaClientGeoCountry,
			GeoContinentCode: seen.MetaClientGeoContinent,
		}
	}

	// Create block seen times map
	blockSeenTimes := make(map[string]int64)
	for _, seen := range blockSeenAtSlotTime {
		blockSeenTimes[seen.MetaClientName] = seen.SlotTimeMs
	}

	// Create blob seen times map
	blobSeenTimes := make(map[string]map[int64]int64)
	for _, seen := range blobSeenAtSlotTime {
		if _, ok := blobSeenTimes[seen.MetaClientName]; !ok {
			blobSeenTimes[seen.MetaClientName] = make(map[int64]int64)
		}
		blobSeenTimes[seen.MetaClientName][seen.BlobIndex] = seen.SlotTimeMs
	}

	// Create block first seen p2p times map
	blockFirstSeenP2PTimes := make(map[string]int64)
	for _, seen := range blockFirstSeenInP2PSlotTime {
		blockFirstSeenP2PTimes[seen.MetaClientName] = seen.SlotTimeMs
	}

	// Create blob first seen p2p times map
	blobFirstSeenP2PTimes := make(map[string]map[int64]int64)
	for _, seen := range blobFirstSeenInP2PSlotTime {
		if _, ok := blobFirstSeenP2PTimes[seen.MetaClientName]; !ok {
			blobFirstSeenP2PTimes[seen.MetaClientName] = make(map[int64]int64)
		}
		blobFirstSeenP2PTimes[seen.MetaClientName][seen.BlobIndex] = seen.SlotTimeMs
	}

	// Create attestation windows (this is a simplified implementation)
	// In the actual implementation, we would group attestations by time windows
	attestationWindows := []AttestationWindow{
		{
			StartMs:          0,
			EndMs:            1000,
			ValidatorIndices: []int64{1, 2, 3},
		},
	}

	// Convert block data to map
	blockDataMap := make(map[string]interface{})
	blockDataBytes, err := ToJSON(blockData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal block data: %w", err)
	}
	if err := FromJSON(blockDataBytes, &blockDataMap); err != nil {
		return nil, fmt.Errorf("failed to unmarshal block data: %w", err)
	}

	// Convert proposer data to map
	proposerDataMap := make(map[string]interface{})
	proposerDataBytes, err := ToJSON(proposerData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal proposer data: %w", err)
	}
	if err := FromJSON(proposerDataBytes, &proposerDataMap); err != nil {
		return nil, fmt.Errorf("failed to unmarshal proposer data: %w", err)
	}

	// Create optimized slot data
	optimizedData := &OptimizedSlotData{
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
	}

	return optimizedData, nil
}

// GetProcessorState gets the processor state from storage
func (a *ActivityImplementations) GetProcessorState(ctx context.Context, params GetProcessorStateParams) (SlotProcessorState, error) {
	a.log.WithField("network", params.NetworkName).
		WithField("direction", params.Direction).
		Info("Getting processor state")

	key := fmt.Sprintf("beacon/state/%s/processor-%s.json", params.NetworkName, params.Direction)

	// Check if the state exists in storage by trying to get it
	data, err := a.lab.Storage().Get(key)
	if err != nil {
		// If we get an error, assume the state doesn't exist yet
		return SlotProcessorState{Direction: params.Direction}, nil
	}

	// Parse the state
	var state SlotProcessorState
	if err := FromJSON(string(data), &state); err != nil {
		return SlotProcessorState{Direction: params.Direction}, fmt.Errorf("failed to parse state: %w", err)
	}

	return state, nil
}

// SaveProcessorState saves the processor state to storage
func (a *ActivityImplementations) SaveProcessorState(ctx context.Context, params SaveProcessorStateParams) error {
	a.log.WithField("network", params.NetworkName).
		WithField("direction", params.State.Direction).
		Info("Saving processor state")

	key := fmt.Sprintf("beacon/state/%s/processor-%s.json", params.NetworkName, params.State.Direction)

	// Convert the state to JSON
	jsonData, err := ToJSON(params.State)
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	// Store the state in storage
	err = a.lab.Storage().Store(key, []byte(jsonData))
	if err != nil {
		return fmt.Errorf("failed to store state: %w", err)
	}

	return nil
}

// CalculateTargetBacklogSlot calculates the target backlog slot
func (a *ActivityImplementations) CalculateTargetBacklogSlot(ctx context.Context, params CalculateTargetBacklogSlotParams) (int64, error) {
	a.log.WithField("network", params.NetworkName).Info("Calculating target backlog slot")

	// This is a simplified implementation
	// The actual implementation would consider fork points or target dates

	// For now, we'll get the current slot and subtract some value to get a target backlog
	currentSlot, err := a.GetCurrentSlot(ctx, GetCurrentSlotParams{NetworkName: params.NetworkName})
	if err != nil {
		return 0, fmt.Errorf("failed to get current slot: %w", err)
	}

	// Target a week ago (assuming 12 seconds per slot)
	// 7 days * 24 hours * 60 minutes * 60 seconds / 12 seconds per slot = 50400 slots
	targetSlot := currentSlot - 50400
	if targetSlot < 0 {
		targetSlot = 0
	}

	return targetSlot, nil
}

// ProcessMissingSlots checks for and processes any slots that might have been missed
func (a *ActivityImplementations) ProcessMissingSlots(ctx context.Context, params ProcessMissingSlotParams) error {
	a.log.WithField("network", params.NetworkName).Info("Processing missing slots")

	// This is a simplified implementation
	// The actual implementation would query for slots that exist in ClickHouse but not in storage

	// Get the forward and backward processor states
	forwardState, err := a.GetProcessorState(ctx, GetProcessorStateParams{
		NetworkName: params.NetworkName,
		Direction:   "forward",
	})
	if err != nil {
		return fmt.Errorf("failed to get forward state: %w", err)
	}

	backwardState, err := a.GetProcessorState(ctx, GetProcessorStateParams{
		NetworkName: params.NetworkName,
		Direction:   "backward",
	})
	if err != nil {
		return fmt.Errorf("failed to get backward state: %w", err)
	}

	// Get the current slot
	currentSlot, err := a.GetCurrentSlot(ctx, GetCurrentSlotParams{NetworkName: params.NetworkName})
	if err != nil {
		return fmt.Errorf("failed to get current slot: %w", err)
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

	a.log.WithField("startSlot", startSlot).
		WithField("endSlot", endSlot).
		Info("Checking for missing slots")

	// For now, we won't actually search for missing slots
	// In the actual implementation, we would query ClickHouse for slots that exist but aren't in storage

	return nil
}

// Helper function to extract username from client name
func extractUsername(name string) string {
	// This is a placeholder implementation
	// In the actual implementation, we would extract the username portion from the client name
	return name
}
