package leader_test

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/docker/go-connections/nat"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func NewMemoryLocker(metricsSvc *metrics.Metrics) locker.Locker {
	cache := cache.NewMemory(cache.MemoryConfig{
		DefaultTTL: 5 * time.Minute,
	}, metricsSvc)

	locker := locker.New(logrus.New(), cache, metricsSvc)

	return locker
}

func TestLeaderElection(t *testing.T) {
	metrics := metrics.NewMetricsService("lab", logrus.New())
	mockLocker := NewMemoryLocker(metrics)

	var elected, revoked bool
	var mu sync.Mutex

	// Create a leader with 500ms TTL and 100ms refresh interval
	leader := leader.New(logrus.New(), mockLocker, leader.Config{
		Resource:        "test-resource",
		TTL:             500 * time.Millisecond,
		RefreshInterval: 100 * time.Millisecond,
		OnElected: func() {
			mu.Lock()
			elected = true
			mu.Unlock()
		},
		OnRevoked: func() {
			mu.Lock()
			revoked = true
			mu.Unlock()
		},
	}, metrics)

	// Start the leader election
	leader.Start()

	// Wait for election to happen
	time.Sleep(50 * time.Millisecond)

	// Check that we're the leader
	assert.True(t, leader.IsLeader())

	mu.Lock()
	assert.True(t, elected, "OnElected callback should have been called")
	assert.False(t, revoked, "OnRevoked callback should not have been called yet")
	mu.Unlock()

	// Wait for a couple of refresh cycles
	time.Sleep(250 * time.Millisecond)

	// Still should be the leader
	assert.True(t, leader.IsLeader())

	// Stop the leader
	leader.Stop()

	// Wait for callbacks to be triggered
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	assert.True(t, revoked, "OnRevoked callback should have been called")
	mu.Unlock()

	// Should no longer be the leader
	assert.False(t, leader.IsLeader())
}

func TestLeaderElectionCompetition(t *testing.T) {
	metrics := metrics.NewMetricsService("lab", logrus.New())
	mockLocker := NewMemoryLocker(metrics)

	// Track leader changes
	type leaderChange struct {
		id      int
		elected bool
	}

	var changes []leaderChange
	var mu sync.Mutex

	recordChange := func(id int, elected bool) {
		mu.Lock()
		changes = append(changes, leaderChange{id: id, elected: elected})
		mu.Unlock()
	}

	// Create 3 competing leaders
	leaders := make([]leader.Client, 3)
	for i := 0; i < 3; i++ {
		id := i
		leaders[i] = leader.New(logrus.New(), mockLocker, leader.Config{
			Resource:        "contested-resource",
			TTL:             500 * time.Millisecond,
			RefreshInterval: 100 * time.Millisecond,
			OnElected: func() {
				recordChange(id, true)
			},
			OnRevoked: func() {
				recordChange(id, false)
			},
		}, metrics)
	}

	// Start the first leader only
	leaders[0].Start()

	// Wait longer for election to happen
	time.Sleep(200 * time.Millisecond)

	// First leader should be elected
	assert.True(t, leaders[0].IsLeader())

	// Start the other leaders
	for i := 1; i < 3; i++ {
		leaders[i].Start()
	}

	// Wait for a few refresh cycles
	time.Sleep(500 * time.Millisecond)

	// First leader should still be the leader
	assert.True(t, leaders[0].IsLeader())
	assert.False(t, leaders[1].IsLeader())
	assert.False(t, leaders[2].IsLeader())

	// Stop the first leader
	leaders[0].Stop()

	// Wait longer for a new leader to be elected - increase timeout
	time.Sleep(3000 * time.Millisecond)

	// One of the other leaders should be elected
	var newLeaderFound bool
	for i := 1; i < 3; i++ {
		if leaders[i].IsLeader() {
			newLeaderFound = true

			break
		}
	}

	if !newLeaderFound {
		// If no leader was found, log some diagnostic info
		mu.Lock()
		t.Logf("Change events: %+v", changes)
		mu.Unlock()
	}

	assert.True(t, newLeaderFound, "A new leader should have been elected (either leader 1 or 2)")

	// Stop all leaders
	for i := 1; i < 3; i++ {
		leaders[i].Stop()
	}

	// Wait for cleanup
	time.Sleep(200 * time.Millisecond)

	// Verify changes
	mu.Lock()
	leaderElected := false
	for _, change := range changes {
		if change.id == 0 && change.elected {
			leaderElected = true

			break
		}
	}
	mu.Unlock()

	assert.True(t, leaderElected, "Leader 0 should have been elected at some point")
}

// This test would need Redis integration
func TestLeaderElectionWithRedis(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping Redis integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	metrics := metrics.NewMetricsService("lab", logrus.New())

	// Create Redis cache
	redisCache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Minute,
	}, metrics)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}
	defer func() { _ = redisCache.Stop() }()

	// Create Redis-backed locker
	redisLocker := locker.New(logrus.New(), redisCache, metrics)

	// Test with two leaders
	var leader1Elected, leader1Revoked bool
	var leader2Elected, leader2Revoked bool
	var mu sync.Mutex

	// Create leader 1 with longer TTL and refresh interval
	leader1 := leader.New(logrus.New(), redisLocker, leader.Config{
		Resource:        "redis-test-resource",
		TTL:             2 * time.Second,        // Increase TTL
		RefreshInterval: 200 * time.Millisecond, // Increase refresh interval
		OnElected: func() {
			mu.Lock()
			leader1Elected = true
			mu.Unlock()
		},
		OnRevoked: func() {
			mu.Lock()
			leader1Revoked = true
			mu.Unlock()
		},
	}, metrics)

	// Create leader 2 with same resource
	leader2 := leader.New(logrus.New(), redisLocker, leader.Config{
		Resource:        "redis-test-resource",
		TTL:             2 * time.Second,        // Increase TTL
		RefreshInterval: 200 * time.Millisecond, // Increase refresh interval
		OnElected: func() {
			mu.Lock()
			leader2Elected = true
			mu.Unlock()
		},
		OnRevoked: func() {
			mu.Lock()
			leader2Revoked = true
			mu.Unlock()
		},
	}, metrics)

	// Start leader 1
	leader1.Start()

	// Wait longer for election to happen
	time.Sleep(500 * time.Millisecond)

	// Leader 1 should be elected
	assert.True(t, leader1.IsLeader())
	mu.Lock()
	assert.True(t, leader1Elected, "Leader 1 OnElected callback should have been called")
	assert.False(t, leader1Revoked, "Leader 1 OnRevoked callback should not have been called yet")
	mu.Unlock()

	// Start leader 2
	leader2.Start()

	// Wait for a few refresh cycles
	time.Sleep(1 * time.Second)

	// Leader 1 should still be the leader, leader 2 should not
	assert.True(t, leader1.IsLeader())
	assert.False(t, leader2.IsLeader())
	mu.Lock()
	assert.False(t, leader2Elected, "Leader 2 should not have been elected yet")
	mu.Unlock()

	// Stop leader 1
	leader1.Stop()

	// Wait longer for leadership transfer
	time.Sleep(3 * time.Second)

	// Check that leader 1 is no longer the leader
	assert.False(t, leader1.IsLeader())
	mu.Lock()
	assert.True(t, leader1Revoked, "Leader 1 OnRevoked callback should have been called")
	mu.Unlock()

	// Leader 2 should now be the leader
	assert.True(t, leader2.IsLeader(), "Leader 2 should be the leader now that leader 1 has stopped")
	mu.Lock()
	assert.True(t, leader2Elected, "Leader 2 OnElected callback should have been called")
	mu.Unlock()

	// Stop leader 2
	leader2.Stop()

	// Wait for callbacks to be triggered
	time.Sleep(500 * time.Millisecond)

	// Leader 2 should no longer be the leader
	assert.False(t, leader2.IsLeader())
	mu.Lock()
	assert.True(t, leader2Revoked, "Leader 2 OnRevoked callback should have been called")
	mu.Unlock()
}

// SetupRedisContainer creates a Redis container for testing
func SetupRedisContainer(t *testing.T) (string, func()) {
	ctx := context.Background()

	// Define the Redis container request
	req := testcontainers.ContainerRequest{
		Image:        "redis:latest",
		ExposedPorts: []string{"6379/tcp"},
		WaitingFor:   wait.ForLog("Ready to accept connections"),
	}

	// Create the Redis container
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Fatalf("failed to start redis container: %v", err)
	}

	// Get the mapped port for Redis
	mappedPort, err := container.MappedPort(ctx, nat.Port("6379/tcp"))
	if err != nil {
		t.Fatalf("failed to get mapped port: %v", err)
	}

	// Get the host where Redis is running
	host, err := container.Host(ctx)
	if err != nil {
		t.Fatalf("failed to get host: %v", err)
	}

	// Generate Redis URL
	redisURL := fmt.Sprintf("redis://%s:%s", host, mappedPort.Port())

	// Return the Redis URL and a cleanup function
	return redisURL, func() {
		if err := container.Terminate(ctx); err != nil {
			t.Fatalf("failed to terminate container: %v", err)
		}
	}
}
