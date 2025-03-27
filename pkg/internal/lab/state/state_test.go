package state

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestStateManager(t *testing.T) {
	// Setup
	ctx := context.Background()
	log := logrus.New()
	mockStorage := new(storage.MockStorage)
	mockCache := new(cache.MockCache)

	config := &Config{
		Name:          "test-module",
		FlushInterval: 100 * time.Millisecond,
	}

	// Test initial state load
	emptyState := make(map[string]interface{})
	emptyStateJSON, _ := json.Marshal(emptyState)

	mockStorage.On("Get", "state/modules/test-module.json").Return(emptyStateJSON, nil)
	mockStorage.On("StoreAtomic", mock.Anything, mock.Anything).Return(nil)

	// Create state manager
	stateManager, err := New(config, mockStorage, mockCache, log)
	assert.NoError(t, err)
	assert.NotNil(t, stateManager)

	// Start state manager
	err = stateManager.Start(ctx)
	assert.NoError(t, err)

	// Test Get/Set operations
	err = stateManager.Set("test-key", "test-value")
	assert.NoError(t, err)

	value, err := stateManager.Get("test-key")
	assert.NoError(t, err)
	assert.Equal(t, "test-value", value)

	// Test GetAll
	allState, err := stateManager.GetAll()
	assert.NoError(t, err)
	assert.Equal(t, "test-value", allState["test-key"])

	// Test Delete
	err = stateManager.Delete("test-key")
	assert.NoError(t, err)

	_, err = stateManager.Get("test-key")
	assert.Error(t, err)

	// Set another value before DeleteAll
	err = stateManager.Set("another-key", "another-value")
	assert.NoError(t, err)

	// Test DeleteAll
	err = stateManager.DeleteAll()
	assert.NoError(t, err)

	allState, err = stateManager.GetAll()
	assert.NoError(t, err)
	assert.Empty(t, allState)

	// Test Flush
	err = stateManager.Flush()
	assert.NoError(t, err)

	// Manually verify StoreAtomic was called with empty state
	mockStorage.AssertCalled(t, "StoreAtomic", "state/modules/test-module.json", mock.Anything)

	// Clean up
	err = stateManager.Stop()
	assert.NoError(t, err)
}
