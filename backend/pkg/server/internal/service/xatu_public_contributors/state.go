package xatu_public_contributors

import (
	"time"
)

// ProcessorState holds the last processed time for a processor and its windows.
type ProcessorState struct {
	LastProcessed        time.Time            `json:"last_processed"`
	LastProcessedWindows map[string]time.Time `json:"last_processed_windows"`
}

// State holds the processing state for all processors within a network.
type State struct {
	// Map processor name to its state
	Processors map[string]ProcessorState `json:"processors"`
}

// GetStateKey returns the storage key for a network's state.
func GetStateKey(network string) string {
	return "state/" + network + ".json"
}

// GetProcessorState retrieves or initializes the state for a specific processor.
func (s *State) GetProcessorState(processorName string) ProcessorState {
	if s.Processors == nil {
		s.Processors = make(map[string]ProcessorState)
	}
	state, ok := s.Processors[processorName]
	if !ok {
		state = ProcessorState{
			LastProcessedWindows: make(map[string]time.Time),
		}
		s.Processors[processorName] = state
	} else if state.LastProcessedWindows == nil {
		// Ensure the map is initialized even if the processor exists
		state.LastProcessedWindows = make(map[string]time.Time)
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
