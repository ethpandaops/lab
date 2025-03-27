package state

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/sirupsen/logrus"
)

// Manager is the interface for state management
type Manager interface {
	// Start initializes the state manager and loads existing state
	Start(ctx context.Context) error

	// Stop gracefully stops the state manager and flushes state
	Stop() error

	// Get retrieves a value from state
	Get(key string) (interface{}, error)

	// Set stores a value in state
	Set(key string, value interface{}) error

	// Delete removes a value from state
	Delete(key string) error

	// GetAll returns all values from state
	GetAll() (map[string]interface{}, error)

	// DeleteAll removes all values from state
	DeleteAll() error

	// Flush forces a flush of the state to storage
	Flush() error
}

// manager implements the Manager interface
type manager struct {
	name          string
	storage       storage.Client
	cache         cache.Client
	flushInterval time.Duration
	log           logrus.FieldLogger

	// state data
	state map[string]interface{}
	mu    sync.RWMutex

	// context and cancellation
	ctx        context.Context
	cancelFunc context.CancelFunc

	// flush task management
	flushDone  chan struct{}
	flushTimer *time.Timer
}

// getStateFileName returns the state file path for a module
func getStateFileName(name string) string {
	return fmt.Sprintf("state/modules/%s.json", name)
}

// New creates a new state manager
func New(
	config *Config,
	storageClient storage.Client,
	cacheClient cache.Client,
	log logrus.FieldLogger,
) (Manager, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	if storageClient == nil {
		return nil, fmt.Errorf("storage client cannot be nil")
	}

	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	logger := log.WithField("module", "state").WithField("name", config.Name)
	logger.Info("Initializing state manager")

	return &manager{
		name:          config.Name,
		storage:       storageClient,
		cache:         cacheClient,
		flushInterval: config.FlushInterval,
		log:           logger,
		state:         make(map[string]interface{}),
		flushDone:     make(chan struct{}),
	}, nil
}

// Start initializes the state manager and loads existing state
func (m *manager) Start(ctx context.Context) error {
	m.log.Info("Starting state manager")

	// Create context with cancellation
	m.ctx, m.cancelFunc = context.WithCancel(ctx)

	// Try to load existing state
	err := m.loadState()
	if err != nil {
		if err.Error() == "key not found" {
			m.log.Info("No existing state found, creating empty state file")
			// Initialize with empty state
			if err := m.writeStateToStorage(); err != nil {
				m.log.Error("Failed to initialize state - cannot continue", "error", err)
				return err
			}
		} else {
			m.log.Error("Failed to initialize state - cannot continue", "error", err)
			return err
		}
	}

	// Start the flush loop
	go m.flushLoop()

	m.log.Info("Started state manager")

	return nil
}

// Stop gracefully stops the state manager
func (m *manager) Stop() error {
	m.log.Info("Stopping state manager")

	// Cancel context to stop all operations
	if m.cancelFunc != nil {
		m.cancelFunc()
	}

	// Signal the flush loop to stop and wait for it to complete
	if m.flushTimer != nil {
		m.flushTimer.Stop()
	}

	// Wait for flush loop to complete
	<-m.flushDone

	// Final flush
	err := m.Flush()
	if err != nil {
		m.log.Error("Failed to flush state on shutdown", "error", err)
	} else {
		m.log.Info("Final state flush complete")
	}

	return err
}

// Get retrieves a value from state
func (m *manager) Get(key string) (interface{}, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	value, ok := m.state[key]
	if !ok {
		m.log.Debug("Key not found", "key", key)
		return nil, fmt.Errorf("key not found: %s", key)
	}

	return value, nil
}

// Set stores a value in state
func (m *manager) Set(key string, value interface{}) error {
	m.log.Debug("Setting state value", "key", key)

	m.mu.Lock()
	defer m.mu.Unlock()

	m.state[key] = value

	return nil
}

// Delete removes a value from state
func (m *manager) Delete(key string) error {
	m.log.Debug("Deleting state value", "key", key)

	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.state, key)

	return nil
}

// GetAll returns all values from state
func (m *manager) GetAll() (map[string]interface{}, error) {
	m.log.Debug("Getting all state values")

	m.mu.RLock()
	defer m.mu.RUnlock()

	// Create a copy of the state map to avoid concurrent access issues
	stateCopy := make(map[string]interface{}, len(m.state))
	for k, v := range m.state {
		stateCopy[k] = v
	}

	return stateCopy, nil
}

// DeleteAll removes all values from state
func (m *manager) DeleteAll() error {
	m.log.Debug("Deleting all state values")

	m.mu.Lock()
	defer m.mu.Unlock()

	m.state = make(map[string]interface{})

	return nil
}

// Flush forces a flush of the state to storage
func (m *manager) Flush() error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.writeStateToStorage()
}

// writeStateToStorage writes the current state to storage
func (m *manager) writeStateToStorage() error {
	// Convert state to JSON
	stateJSON, err := json.Marshal(m.state)
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	// Write state to storage atomically
	err = m.storage.StoreAtomic(getStateFileName(m.name), stateJSON)
	if err != nil {
		return fmt.Errorf("failed to store state: %w", err)
	}

	return nil
}

// loadState loads the state from storage
func (m *manager) loadState() error {
	// Load state from storage
	data, err := m.storage.Get(getStateFileName(m.name))
	if err != nil {
		return err
	}

	// Unmarshal JSON into state map
	err = json.Unmarshal(data, &m.state)
	if err != nil {
		return fmt.Errorf("failed to unmarshal state: %w", err)
	}

	m.log.Info("Loaded existing state")

	return nil
}

// flushLoop periodically flushes state to storage
func (m *manager) flushLoop() {
	defer close(m.flushDone)

	m.log.Debug("Starting flush loop", "interval", m.flushInterval)

	m.flushTimer = time.NewTimer(m.flushInterval)
	defer m.flushTimer.Stop()

	for {
		select {
		case <-m.ctx.Done():
			m.log.Debug("Flush loop stopped")
			return
		case <-m.flushTimer.C:
			err := m.Flush()
			if err != nil {
				m.log.Error("Failed to flush state", "error", err)
			} else {
				m.log.Debug("Flushed state to storage")
			}

			// Reset the timer
			m.flushTimer.Reset(m.flushInterval)
		}
	}
}
