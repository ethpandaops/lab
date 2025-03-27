# State Manager

The state manager provides a way to persist module state to a storage backend. It interfaces with the storage client to save state data to disk (or S3) and provides an easy way for functions to atomically update and get state regardless of the struct.

## Features

- Simple key-value storage for state data
- Periodic flushing to persistent storage
- Thread-safe state access with mutex protection
- Atomic writes to storage to prevent data corruption

## Usage

### Creating a State Manager

```go
import (
    "context"
    "github.com/ethpandaops/lab/pkg/internal/lab/state"
    "github.com/ethpandaops/lab/pkg/internal/lab/storage"
    "github.com/ethpandaops/lab/pkg/internal/lab/cache"
    "github.com/sirupsen/logrus"
)

func main() {
    log := logrus.New()
    
    // Create storage and cache clients
    storageClient, _ := storage.New(storageConfig, log)
    cacheClient, _ := cache.New(cacheConfig)
    
    // Create a state manager configuration
    stateConfig := &state.Config{
        Name: "my-module",                  // Name of your module
        FlushInterval: 60 * time.Second,    // How often to flush state to storage
    }
    
    // Create the state manager
    stateManager, err := state.New(stateConfig, storageClient, cacheClient, log)
    if err != nil {
        log.Fatal(err)
    }
    
    // Start the state manager
    ctx := context.Background()
    if err := stateManager.Start(ctx); err != nil {
        log.Fatal(err)
    }
    
    // Use the state manager
    stateManager.Set("some-key", "some-value")
    value, err := stateManager.Get("some-key")
    
    // Later, gracefully shut down
    stateManager.Stop()
}
```

### State Manager Interface

```go
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
```

## Implementation Details

- State is stored as a map[string]interface{} in memory
- State is serialized to JSON for storage
- State is flushed to storage periodically based on the configured interval
- State is also flushed during Stop() to ensure the latest state is persisted
- State is loaded from storage during Start() if it exists 