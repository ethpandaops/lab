# Cache Package

This package provides a caching interface with multiple backend implementations and distributed locking capabilities.

## Features

- Pluggable backend implementations (Redis, in-memory)
- Key-value cache operations with TTL support
- Thread-safe and concurrent access

## Cache Interface

The primary interface for cache operations:

```go
// Client is a cache client
type Client interface {
	// Get gets a value from the cache
	Get(key string) ([]byte, error)

	// Set sets a value in the cache
	Set(key string, value []byte, ttl time.Duration) error

	// Delete deletes a value from the cache
	Delete(key string) error

	// Stop gracefully stops the cache
	Stop() error
}
```

## Implementations

### Memory Cache

The in-memory implementation provides a simple, single-process cache with lock support.

### Redis Cache

The Redis implementation uses Redis for both caching and distributed locks, providing cross-process and cross-server coordination.

For distributed locking, the Redis implementation uses:
- `SET NX` with expiration for acquiring locks
- Lua script for atomic unlocking, ensuring only the owner can release the lock

## Usage Examples

### Basic Cache Operations

```go
// Create a cache (memory or Redis)
config := cache.Config{
    Type: cache.CacheTypeMemory,
    Config: map[string]interface{}{
        "defaultTTL": "5m",
    },
}
cacheClient, err := cache.New(config)
if err != nil {
    log.Fatalf("Error creating cache: %v", err)
}
defer cacheClient.Stop()

// Set a value with a TTL
err = cacheClient.Set("my-key", []byte("hello world"), 30*time.Second)
if err != nil {
    log.Fatalf("Error setting value: %v", err)
}

// Get a value
value, err := cacheClient.Get("my-key")
if err != nil {
    log.Fatalf("Error getting value: %v", err)
}
fmt.Printf("Value: %s\n", value)

// Delete a value
err = cacheClient.Delete("my-key")
if err != nil {
    log.Fatalf("Error deleting value: %v", err)
}
```

## Testing

This package includes comprehensive tests for both the memory and Redis implementations, including tests for distributed locking and leader election. 

The Redis tests use [testcontainers-go](https://github.com/testcontainers/testcontainers-go) to spin up Redis containers for integration testing.

Run tests with: `go test -v` 