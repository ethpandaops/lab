package beacon_slots

import (
	"time"

	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ProcessorState holds the last processed time and slots for a processor.
type ProcessorState struct {
	LastProcessed     time.Time `json:"last_processed"`
	LastProcessedSlot *int64    `json:"last_processed_slot"`
	CurrentSlot       *int64    `json:"current_slot"`
	TargetSlot        *int64    `json:"target_slot"`
	Direction         string    `json:"direction"` // "forward" or "backward"
}

// State holds the processing state for all processors within a network.
type State struct {
	// Map processor name to its state
	Processors map[string]ProcessorState `json:"processors"`
}

// GetStateKey returns the storage key for a network's state.
func GetStateKey(network string) string {
	return "beacon/state/" + network + ".json"
}

// GetProcessorState retrieves or initializes the state for a specific processor.
func (s *State) GetProcessorState(processorName string) ProcessorState {
	if s.Processors == nil {
		s.Processors = make(map[string]ProcessorState)
	}
	state, ok := s.Processors[processorName]
	if !ok {
		// Initialize with default direction
		state = ProcessorState{
			Direction: "forward",
		}
		s.Processors[processorName] = state
	}
	return state
}

// UpdateProcessorState updates the state for a specific processor.
func (s *State) UpdateProcessorState(processorName string, state ProcessorState) {
	if s.Processors == nil {
		s.Processors = make(map[string]ProcessorState)
	}
	s.Processors[processorName] = state
}

// ToProtoState converts the internal state to the proto representation
func (s *State) ToProtoState(network string) *pb.BeaconSlotsState {
	pbState := &pb.BeaconSlotsState{
		Network:    network,
		Processors: make(map[string]*pb.ProcessorState),
	}

	for name, state := range s.Processors {
		pbProcessor := &pb.ProcessorState{
			LastProcessed:     timestamppb.New(state.LastProcessed),
			LastProcessedSlot: state.LastProcessedSlot,
			CurrentSlot:       state.CurrentSlot,
			TargetSlot:        state.TargetSlot,
			Direction:         state.Direction,
		}

		pbState.Processors[name] = pbProcessor
	}

	return pbState
}

// FromProtoState converts a proto state to the internal representation
func FromProtoState(pbState *pb.BeaconSlotsState) *State {
	state := &State{
		Processors: make(map[string]ProcessorState),
	}

	for name, pbProcessor := range pbState.Processors {
		processor := ProcessorState{
			Direction: pbProcessor.Direction,
		}

		if pbProcessor.LastProcessed != nil {
			processor.LastProcessed = pbProcessor.LastProcessed.AsTime()
		}

		processor.LastProcessedSlot = pbProcessor.LastProcessedSlot
		processor.CurrentSlot = pbProcessor.CurrentSlot
		processor.TargetSlot = pbProcessor.TargetSlot

		state.Processors[name] = processor
	}

	return state
}
