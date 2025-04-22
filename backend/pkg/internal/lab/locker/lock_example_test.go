package locker

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/sirupsen/logrus"
)

func ExampleLocker_Lock() {
	// Create a new metrics service
	metricsSvc := metrics.NewMetricsService("lab", logrus.New())

	// Create a new memory cache
	cache := cache.NewMemory(cache.MemoryConfig{
		DefaultTTL: 5 * time.Minute,
	}, metricsSvc)

	// Get the locker
	locker := New(logrus.New(), cache, metricsSvc)

	// Acquire a lock for 30 seconds
	token, success, err := locker.Lock("my-resource", 30*time.Second)
	if err != nil {
		fmt.Println("Error acquiring lock:", err)

		return
	}

	if !success {
		fmt.Println("Could not acquire lock, it's already held by another process")

		return
	}

	fmt.Println("Lock acquired with token:", token)

	// Do your work with the locked resource here...

	// Release the lock when done
	released, err := locker.Unlock("my-resource", token)
	if err != nil {
		fmt.Println("Error releasing lock:", err)

		return
	}

	if released {
		fmt.Println("Lock released successfully")
	} else {
		fmt.Println("Lock was not released, it might have expired or been taken by another process")
	}
}

func TestDistributedLock(t *testing.T) {
	// Create a new metrics service
	metricsSvc := metrics.NewMetricsService("lab", logrus.New())

	// Create a new memory cache
	cache := cache.NewMemory(cache.MemoryConfig{
		DefaultTTL: 5 * time.Minute,
	}, metricsSvc)

	// Get the locker
	locker := New(logrus.New(), cache, metricsSvc)

	// Test that a lock can be acquired and released
	token, success, err := locker.Lock("test-lock", 10*time.Second)
	if err != nil {
		t.Fatalf("Error acquiring lock: %v", err)
	}
	if !success {
		t.Fatal("Expected to acquire lock but failed")
	}

	// Test that the same lock cannot be acquired again
	_, success, err = locker.Lock("test-lock", 10*time.Second)
	if err != nil {
		t.Fatalf("Error acquiring lock second time: %v", err)
	}
	if success {
		t.Fatal("Expected lock acquisition to fail but it succeeded")
	}

	// Test that unlocking works
	released, err := locker.Unlock("test-lock", token)
	if err != nil {
		t.Fatalf("Error releasing lock: %v", err)
	}
	if !released {
		t.Fatal("Expected lock to be released but it wasn't")
	}

	// Test that lock can be acquired again after release
	_, success, err = locker.Lock("test-lock", 10*time.Second)
	if err != nil {
		t.Fatalf("Error acquiring lock after release: %v", err)
	}
	if !success {
		t.Fatal("Expected to acquire lock after release but failed")
	}
}

func TestConcurrentLocking(t *testing.T) {
	// Create a new metrics service
	metricsSvc := metrics.NewMetricsService("lab", logrus.New())

	// Create a new memory cache
	cache := cache.NewMemory(cache.MemoryConfig{
		DefaultTTL: 5 * time.Minute,
	}, metricsSvc)

	// Get the locker
	locker := New(logrus.New(), cache, metricsSvc)

	// Keep track of how many goroutines acquired the lock
	var lockAcquired int
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Launch 10 goroutines that all try to acquire the lock
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			// Try to acquire the lock
			token, success, err := locker.Lock("concurrent-lock", 1*time.Second)
			if err != nil {
				t.Errorf("Goroutine %d - Error acquiring lock: %v", id, err)

				return
			}

			if success {
				// Sleep briefly to simulate doing work
				time.Sleep(100 * time.Millisecond)

				mu.Lock()
				lockAcquired++
				mu.Unlock()

				// Release the lock
				_, err = locker.Unlock("concurrent-lock", token)
				if err != nil {
					t.Errorf("Goroutine %d - Error releasing lock: %v", id, err)
				}
			}
		}(i)
	}

	wg.Wait()

	// Only a single goroutine should have acquired the lock at any given time
	// But in sequence, multiple might acquire it
	if lockAcquired == 0 {
		t.Fatal("Expected at least one lock acquisition")
	}
}
