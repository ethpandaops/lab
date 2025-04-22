# Leader Package

The leader package provides leader election functionality for distributed systems. It uses the distributed lock mechanism provided by the locker package to ensure only one instance is the active leader at any time.

## Features

- Automatic leader election with failover
- Auto-refreshing locks to maintain leadership
- Callback hooks for leader election and revocation
- Clean leadership handover when stopping
- Thread-safe operation

## Usage

### Basic Leader Election

```go
// Create a cache client
cacheClient := cache.NewMemory(cache.MemoryConfig{DefaultTTL: time.Minute})

// Create a locker
lock := locker.New(cacheClient)

// Configure leader election
config := leader.Config{
    Resource:        "job-scheduler",
    TTL:             5 * time.Second,
    RefreshInterval: 1 * time.Second,
    OnElected: func() {
        log.Println("This instance is now the leader!")
        // Initialize leader-only resources
    },
    OnRevoked: func() {
        log.Println("Leadership lost!")
        // Clean up leader-only resources
    },
}

// Create and start leader election
leaderElection := leader.New(lock, config)
leaderElection.Start()

// In your main application loop
for {
    if leaderElection.IsLeader() {
        // Do leader-specific work
        scheduleJobs()
    } else {
        // Do follower work
        processJobs()
    }
    time.Sleep(time.Second)
}

// When shutting down
leaderElection.Stop()
```

### With Redis for Cross-Process Leadership

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
lock := locker.New(cacheClient)

// Configure and use leader election as in the previous example
// This will now work across multiple processes
```

## How It Works

The leader election process works as follows:

1. When started, it attempts to acquire a distributed lock for the specified resource.
2. If successful, the instance becomes the leader and the OnElected callback is triggered.
3. A background goroutine periodically refreshes the lock to maintain leadership.
4. If it fails to refresh the lock, leadership is lost and the OnRevoked callback is triggered.
5. Non-leader instances periodically attempt to acquire the lock in case the current leader fails.
6. When the leader instance calls Stop(), it releases the lock, allowing another instance to become leader.

## Implementation Details

- The leader election uses a TTL on locks to ensure automatic failover if a leader crashes.
- The refresh interval should be set to less than half the TTL to ensure the lock doesn't expire during normal operation.
- All state changes are protected by mutex to ensure thread safety.
- The leader periodically tries to re-acquire its own lock using two approaches to ensure robustness.

## Use Cases

Leader election is ideal for:
- Ensuring only one instance processes a task
- Master-worker coordination
- Job schedulers
- Singleton services in a distributed system
- Maintenance tasks that should run on only one node 