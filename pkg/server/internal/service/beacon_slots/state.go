package beacon_slots

import (
	"github.com/attestantio/go-eth2-client/spec/phase0"
)

type SlotState struct {
	Networks map[string]NetworkState `json:"networks"`
}

// NetworkState holds the processing state for a network.
type NetworkState struct {
	Processors map[string]ProcessorState `json:"processors"`
}

type ForwardProcessorState struct {
	LastProcessedSlot *phase0.Slot `json:"last_slot"`
}

type BackfillProcessorState struct {
	LastProcessedSlot *phase0.Slot `json:"last_slot"`
}

type TrailingProcessorState struct {
	LastProcessedSlot *phase0.Slot `json:"last_slot"`
}

// ProcessorState holds the last processed time and slots for a processor.
type ProcessorState struct {
	HeadProcessorState     ForwardProcessorState  `json:"head"`
	TrailingProcessorState TrailingProcessorState `json:"trailing"`
	BackfillProcessorState BackfillProcessorState `json:"backfill"`
}
