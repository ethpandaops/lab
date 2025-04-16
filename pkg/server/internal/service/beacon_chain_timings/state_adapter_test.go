package beacon_chain_timings

import (
	"context"
	"testing"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/locker/mock"
	"github.com/ethpandaops/lab/pkg/internal/lab/state"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_chain_timings"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStateManager(t *testing.T) {
	// Create a logger
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create a mock cache for the state client
	mockCache := mock.NewStandardCache()

	// Create a state client with the beacon_chain_timings namespace
	stateConfig := &state.Config{
		Namespace: BeaconChainTimingsServiceName,
		TTL:       1 * time.Hour,
	}

	// Create a typed client for better type safety, with the state key
	stateClient := state.New[*pb.State](logger, mockCache, stateConfig, GetStateKey())

	// Create the state manager
	stateManager := NewStateManager(logger, stateClient)

	// Create a test context
	ctx := context.Background()

	// Test GetState with no existing state
	stateObj, err := stateManager.GetState(ctx)
	require.NoError(t, err)
	require.NotNil(t, stateObj)

	// Verify default state structure
	assert.NotNil(t, stateObj.BlockTimings)
	assert.NotNil(t, stateObj.Cdf)

	// Modify the state
	timestamp := time.Now()
	stateObj.BlockTimings.LastProcessed["test/1h"] = TimestampFromTime(timestamp)

	// Test SaveState
	err = stateManager.SaveState(ctx, stateObj)
	require.NoError(t, err)

	// Test GetState with existing state
	retrievedState, err := stateManager.GetState(ctx)
	require.NoError(t, err)
	require.NotNil(t, retrievedState)

	// Verify the state was correctly retrieved
	require.NotNil(t, retrievedState.BlockTimings)
	require.NotNil(t, retrievedState.BlockTimings.LastProcessed)

	// Check timestamp preservation
	lastProcessedTime := retrievedState.BlockTimings.LastProcessed["test/1h"]
	require.NotNil(t, lastProcessedTime)

	// Convert and compare timestamps
	retrievedTime := TimeFromTimestamp(lastProcessedTime)
	assert.Equal(t, timestamp.Truncate(time.Microsecond), retrievedTime.Truncate(time.Microsecond))
}
