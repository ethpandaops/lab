# Locker Package

The locker package provides distributed locking functionality. It uses a cache implementation as the backend storage to coordinate locks across processes or machines.

## Features

- Distributed locking with TTL for automatic expiration
- Token-based authentication for lock release
- Thread-safe operation
- Uses cache as a backend for storage

## Usage

### Basic Lock and Unlock

```go
// Create a cache client
cacheClient := cache.NewMemory(cache.MemoryConfig{DefaultTTL: time.Minute})

// Create a locker
lock := locker.NewLocker(cacheClient)

// Try to acquire a lock
lockName := "my-critical-resource"
token, success, err := lock.Lock(lockName, 30*time.Second)
if err != nil {
    log.Fatalf("Error acquiring lock: %v", err)
}

if !success {
    log.Println("Lock is already held by another process")
    return
}

// Do work with the locked resource
log.Println("Lock acquired, performing work...")

// Release the lock when done
released, err := lock.Unlock(lockName, token)
if err != nil {
    log.Fatalf("Error releasing lock: %v", err)
}

if released {
    log.Println("Lock released successfully")
} else {
    log.Println("Lock was not released (token invalid or lock expired)")
}
```

### With Redis Cache for Cross-Process Locking

```go
// Create a Redis cache
redisConfig := cache.RedisConfig{
    URL:        "redis://localhost:6379",
    DefaultTTL: time.Minute,
}

cacheClient, err := cache.NewRedis(redisConfig)
if err != nil {
    log.Fatalf("Failed to create Redis cache: %v", err)
}

// Create a locker with Redis backend
lock := locker.NewLocker(cacheClient)

// Use the lock as in the previous example
// This will now work across multiple processes
```

## How It Works

The locker uses a simple key-value mechanism to implement distributed locks:

1. When acquiring a lock, it tries to set a key in the cache with a unique token value.
2. If the key already exists (lock is held), it returns failure.
3. If the key can be set, the lock is successfully acquired.
4. When releasing the lock, it verifies the token matches before deleting the key.
5. TTL ensures that locks are automatically released if the holder crashes.

## Implementation Details

- Lock keys are prefixed with `lock:` to avoid conflicts with other cache keys.
- Each lock generates a unique random token to ensure secure release.
- Locks automatically expire after the TTL period if not explicitly released.
- The implementation handles transient errors and edge cases like token mismatch. 