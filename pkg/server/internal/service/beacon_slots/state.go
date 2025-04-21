package beacon_slots

import "github.com/attestantio/go-eth2-client/spec/phase0"

// ProcessorState holds the processing state for a specific processor
type ProcessorState struct {
	LastProcessedSlot phase0.Slot `json:"last_processed_slot"`
}

// GetStateKey returns the state storage key for a network
func GetStateKey(network, processor string) string {
	return "state/" + network + "/" + processor
}
