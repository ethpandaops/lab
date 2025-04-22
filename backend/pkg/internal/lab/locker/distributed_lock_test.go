package locker_test

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/docker/go-connections/nat"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker/mock"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/sirupsen/logrus"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

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

func createRedisCache(t *testing.T) (cache.Client, func()) {
	redisURL, cleanup := SetupRedisContainer(t)

	metricsSvc := metrics.NewMetricsService("test", logrus.New())

	// Create Redis cache
	redisCache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Minute,
	}, metricsSvc)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}

	return redisCache, func() {
		redisCache.Stop()
		cleanup()
	}
}

func createMemoryCache(t *testing.T) (cache.Client, func()) {
	metricsSvc := metrics.NewMetricsService("test", logrus.New())
	memCache := cache.NewMemory(cache.MemoryConfig{DefaultTTL: time.Minute}, metricsSvc)
	return memCache, func() {}
}

// TestDistributedLockInterfaces tests the Lock/Unlock behavior with different implementations
func TestDistributedLockInterfaces(t *testing.T) {
	// Test with both Redis and memory implementations
	tests := []struct {
		name        string
		createCache func(t *testing.T) (cache.Client, func())
		skipInShort bool
	}{
		{
			name:        "Redis",
			createCache: createRedisCache,
			skipInShort: true,
		},
		{
			name:        "Memory",
			createCache: createMemoryCache,
			skipInShort: false,
		},
	}

	for _, test := range tests {
		test := test // capture range variable
		t.Run(test.name, func(t *testing.T) {
			if test.skipInShort && testing.Short() {
				t.Skip("skipping integration test in short mode")
			}

			cacheClient, cleanup := test.createCache(t)
			defer cleanup()

			metricsSvc := metrics.NewMetricsService("test", logrus.New())
			testLocker := locker.New(logrus.New(), cacheClient, metricsSvc)

			testLockBehavior(t, test.name, testLocker)
		})
	}
}

// testLockBehavior runs a consistent set of tests against any Locker implementation
func testLockBehavior(t *testing.T, impl string, locker locker.Locker) {
	t.Run(fmt.Sprintf("%s_BasicLock", impl), func(t *testing.T) {
		// Test acquiring a lock
		lockName := fmt.Sprintf("%s-test-lock", impl)
		token, success, err := locker.Lock(lockName, time.Second)
		if err != nil {
			t.Fatalf("Error acquiring lock: %v", err)
		}
		if !success {
			t.Fatal("Failed to acquire lock")
		}
		if token == "" {
			t.Fatal("Empty token returned")
		}

		// Test unlocking
		released, err := locker.Unlock(lockName, token)
		if err != nil {
			t.Fatalf("Error releasing lock: %v", err)
		}
		if !released {
			t.Fatal("Failed to release lock")
		}
	})

	t.Run(fmt.Sprintf("%s_CantAcquireLock", impl), func(t *testing.T) {
		// Test cannot acquire same lock twice
		lockName := fmt.Sprintf("%s-double-test", impl)
		token1, success, err := locker.Lock(lockName, time.Second)
		if err != nil {
			t.Fatalf("Error acquiring first lock: %v", err)
		}
		if !success {
			t.Fatal("Failed to acquire first lock")
		}

		// Try to acquire same lock
		token2, success, err := locker.Lock(lockName, time.Second)
		if err != nil {
			t.Fatalf("Error attempting second lock: %v", err)
		}
		if success {
			// Release the second lock to clean up
			released, err := locker.Unlock(lockName, token2)
			if err != nil {
				t.Fatalf("Error releasing second lock: %v", err)
			}

			if !released {
				t.Fatal("Failed to release second lock")
			}

			t.Fatal("Should not be able to acquire lock twice")
		}

		// Release the first lock
		released, err := locker.Unlock(lockName, token1)
		if err != nil {
			t.Fatalf("Error releasing lock: %v", err)
		}
		if !released {
			t.Fatal("Failed to release lock")
		}
	})

	t.Run(fmt.Sprintf("%s_WrongToken", impl), func(t *testing.T) {
		// Test incorrect token
		lockName := fmt.Sprintf("%s-token-test", impl)
		token, success, err := locker.Lock(lockName, time.Second)
		if err != nil {
			t.Fatalf("Error acquiring lock: %v", err)
		}
		if !success {
			t.Fatal("Failed to acquire lock")
		}

		// Try to unlock with wrong token
		released, err := locker.Unlock(lockName, "wrong-token")
		if err != nil {
			t.Fatalf("Error trying to unlock with wrong token: %v", err)
		}
		if released {
			t.Fatal("Should not release lock with wrong token")
		}

		// Release with correct token
		released, err = locker.Unlock(lockName, token)
		if err != nil {
			t.Fatalf("Error releasing with correct token: %v", err)
		}
		if !released {
			t.Fatal("Failed to release lock with correct token")
		}
	})

	t.Run(fmt.Sprintf("%s_Expiration", impl), func(t *testing.T) {
		// Test lock expiration
		lockName := fmt.Sprintf("%s-expiring-lock", impl)
		_, success, err := locker.Lock(lockName, 100*time.Millisecond)
		if err != nil {
			t.Fatalf("Error acquiring lock: %v", err)
		}
		if !success {
			t.Fatal("Failed to acquire lock")
		}

		// Try to acquire same lock (should fail)
		_, success, err = locker.Lock(lockName, 100*time.Millisecond)
		if err != nil {
			t.Fatalf("Error trying second lock: %v", err)
		}
		if success {
			t.Fatal("Should not acquire locked resource")
		}

		// Wait for original lock to expire
		time.Sleep(200 * time.Millisecond)

		// Try to acquire after expiration (should succeed)
		_, success, err = locker.Lock(lockName, 100*time.Millisecond)
		if err != nil {
			t.Fatalf("Error acquiring after expiration: %v", err)
		}
		if !success {
			t.Fatal("Should acquire lock after expiration")
		}
	})

	t.Run(fmt.Sprintf("%s_Concurrency", impl), func(t *testing.T) {
		// Test concurrent lock operations
		lockName := fmt.Sprintf("%s-concurrent-lock", impl)
		var wg sync.WaitGroup
		var acquireCount, releaseCount int
		var countMutex sync.Mutex

		// Launch multiple goroutines to compete for the lock
		for i := 0; i < 5; i++ {
			wg.Add(1)
			go func(id int) {
				defer wg.Done()

				// Try to acquire the lock
				token, success, err := locker.Lock(lockName, 500*time.Millisecond)
				if err != nil {
					t.Errorf("Error in goroutine %d acquiring lock: %v", id, err)
					return
				}

				if success {
					// Increment acquire count
					countMutex.Lock()
					acquireCount++
					countMutex.Unlock()

					// Hold the lock briefly
					time.Sleep(10 * time.Millisecond)

					// Release the lock
					released, err := locker.Unlock(lockName, token)
					if err != nil {
						t.Errorf("Error in goroutine %d releasing lock: %v", id, err)
						return
					}

					if released {
						countMutex.Lock()
						releaseCount++
						countMutex.Unlock()
					}
				}
			}(i)
		}

		// Wait for all goroutines to finish
		wg.Wait()

		// Check results
		if acquireCount == 0 {
			t.Error("Expected at least one successful lock acquisition")
		}

		if acquireCount != releaseCount {
			t.Errorf("Mismatch between acquisitions (%d) and releases (%d)",
				acquireCount, releaseCount)
		}
	})
}

// TestLockErrorScenarios tests error scenarios in the Lock method
func TestLockErrorScenarios(t *testing.T) {
	t.Run("ErrorGettingLock", func(t *testing.T) {
		// Create mock with error on get but not ErrCacheMiss
		mockClient := mock.NewStandardCache().WithGetError(fmt.Errorf("forced get error"))

		metricsSvc := metrics.NewMetricsService("test", logrus.New())
		testLocker := locker.New(logrus.New(), mockClient, metricsSvc)

		// Should return the error from Get
		_, success, err := testLocker.Lock("test-lock", time.Second)
		if err == nil {
			t.Fatal("Expected error from Lock when cache Get fails")
		}
		if success {
			t.Fatal("Expected success to be false when error occurs")
		}
	})

	t.Run("ErrorSettingLock", func(t *testing.T) {
		// Create mock with error on set
		mockClient := mock.NewStandardCache().WithSetError(fmt.Errorf("forced set error"))

		metricsSvc := metrics.NewMetricsService("test", logrus.New())
		testLocker := locker.New(logrus.New(), mockClient, metricsSvc)

		// Should return the error from Set
		_, success, err := testLocker.Lock("test-lock", time.Second)
		if err == nil {
			t.Fatal("Expected error from Lock when cache Set fails")
		}
		if success {
			t.Fatal("Expected success to be false when error occurs")
		}
	})

	t.Run("TokenGenerationError", func(t *testing.T) {
		// Create a memory cache to use as base
		metricsSvc := metrics.NewMetricsService("test", logrus.New())
		memCache := cache.NewMemory(cache.MemoryConfig{DefaultTTL: time.Minute}, metricsSvc)

		// Create the token error cache that will simulate token generation failures
		tokenErrorCache := mock.NewTokenErrorCache(memCache)

		// Test token generation error
		_, success, err := tokenErrorCache.Lock("test-token-error", time.Second)
		if err == nil {
			t.Fatal("Expected error from Lock when token generation fails")
		}
		if success {
			t.Fatal("Expected success to be false when token generation fails")
		}
	})
}

// TestUnlockErrorScenarios tests error scenarios in the Unlock method
func TestUnlockErrorScenarios(t *testing.T) {
	t.Run("ErrorGettingLock", func(t *testing.T) {
		// Create mock with error on get but not ErrCacheMiss
		mockClient := mock.NewStandardCache().WithGetError(fmt.Errorf("forced get error"))

		metricsSvc := metrics.NewMetricsService("test", logrus.New())
		testLocker := locker.New(logrus.New(), mockClient, metricsSvc)

		// Should return the error from Get
		success, err := testLocker.Unlock("test-lock", "token")
		if err == nil {
			t.Fatal("Expected error from Unlock when cache Get fails")
		}
		if success {
			t.Fatal("Expected success to be false when error occurs")
		}
	})

	t.Run("LockNotFound", func(t *testing.T) {
		// Create mock with ErrCacheMiss on get
		mockClient := mock.NewStandardCache().WithGetError(cache.ErrCacheMiss)

		metricsSvc := metrics.NewMetricsService("test", logrus.New())
		testLocker := locker.New(logrus.New(), mockClient, metricsSvc)

		// Should not return an error, but success should be false
		success, err := testLocker.Unlock("test-lock", "token")
		if err != nil {
			t.Fatalf("Expected no error from Unlock when lock not found, got: %v", err)
		}
		if success {
			t.Fatal("Expected success to be false when lock not found")
		}
	})

	t.Run("ErrorDeletingLock", func(t *testing.T) {
		// Create mock with error on delete
		mockClient := mock.NewStandardCache().WithDeleteError(fmt.Errorf("forced delete error"))

		// Set up the cache with a value to simulate a valid lock
		err := mockClient.Set("lock:test-lock", []byte("token"), time.Minute)
		if err != nil {
			t.Fatalf("Failed to set up test: %v", err)
		}

		metricsSvc := metrics.NewMetricsService("test", logrus.New())
		testLocker := locker.New(logrus.New(), mockClient, metricsSvc)

		// Should return the error from Delete
		success, err := testLocker.Unlock("test-lock", "token")
		if err == nil {
			t.Fatal("Expected error from Unlock when cache Delete fails")
		}
		if success {
			t.Fatal("Expected success to be false when error occurs")
		}
	})
}
