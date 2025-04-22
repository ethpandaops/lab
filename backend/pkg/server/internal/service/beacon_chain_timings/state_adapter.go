package beacon_chain_timings

import (
	"context"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/state"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_chain_timings"
	"github.com/sirupsen/logrus"
)

// StateManager handles state operations for beacon chain timings
type StateManager struct {
	log         logrus.FieldLogger
	stateClient state.Client[*pb.State]
}

// NewStateManager creates a new StateManager
func NewStateManager(log logrus.FieldLogger, stateClient state.Client[*pb.State]) *StateManager {
	return &StateManager{
		log:         log.WithField("component", "beacon_chain_timings/state"),
		stateClient: stateClient,
	}
}

// GetState retrieves the current state or returns a new state if not found
func (s *StateManager) GetState(ctx context.Context) (*pb.State, error) {
	stateObj, err := s.stateClient.Get(ctx)
	if err != nil {
		if err == state.ErrNotFound {
			s.log.Debug("No existing state found, using initialized default state")
			return NewState(), nil
		}
		s.log.WithError(err).Error("Failed to get state, using initialized default state")
		return NewState(), err
	}

	return stateObj, nil
}

// SaveState persists the current state
func (s *StateManager) SaveState(ctx context.Context, stateObj *pb.State) error {
	if err := s.stateClient.Set(ctx, stateObj); err != nil {
		s.log.WithError(err).Error("Failed to store state")
		return err
	}

	s.log.Debug("Successfully stored updated state")
	return nil
}

// Example of how to use this in beacon_chain_timings.go:
/*
 func (b *BeaconChainTimings) process(ctx context.Context) {
	// Get the current state
	stateObj, err := b.stateManager.GetState(ctx)
	if err != nil {
		b.log.WithError(err).Error("Failed to get state")
		// Continue with the empty state initialized above
	}

	// ... rest of the process method ...

	if needStorageUpdate {
		// Save the updated state
		if err := b.stateManager.SaveState(ctx, stateObj); err != nil {
			b.log.WithError(err).Error("Failed to store state")
			// Don't return, as we've already done processing work
		}
	}
}
*/

// BeaconChainTimings struct addition:
/*
type BeaconChainTimings struct {
	// ... existing fields ...

	stateManager *StateManager
}

func New(...) {
	// Initialize state client with proper namespace and the single state key
	stateConfig := &state.Config{
		Namespace: BeaconChainTimingsServiceName,
		TTL: 24 * time.Hour,
	}

	// Create typed client for beacon chain state with a specific key
	stateClient := state.New[*pb.State](log, cacheClient, stateConfig, GetStateKey(), nil)

	return &BeaconChainTimings{
		// ... existing fields ...
		stateManager: NewStateManager(log, stateClient),
	}
}
*/
