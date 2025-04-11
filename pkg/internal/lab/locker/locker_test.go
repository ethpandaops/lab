package locker

import (
	"testing"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/sirupsen/logrus"
)

func TestMemoryLocker(t *testing.T) {
	memCache := cache.NewMemory(cache.MemoryConfig{DefaultTTL: time.Minute})
	locker := New(logrus.New(), memCache)

	// Test acquiring a lock
	lockName := "test-lock"
	token, success, err := locker.Lock(lockName, time.Second)
	if err != nil {
		t.Fatalf("failed to acquire lock: %v", err)
	}
	if !success {
		t.Fatal("failed to acquire lock")
	}
	if token == "" {
		t.Fatal("empty token returned")
	}

	// Test cannot acquire same lock twice
	_, success, err = locker.Lock(lockName, time.Second)
	if err != nil {
		t.Fatalf("error attempting second lock: %v", err)
	}
	if success {
		t.Fatal("should not be able to acquire lock twice")
	}

	// Release the lock
	released, err := locker.Unlock(lockName, token)
	if err != nil {
		t.Fatalf("failed to release lock: %v", err)
	}
	if !released {
		t.Fatal("failed to release lock")
	}

	// Verify we can acquire it again
	_, success, err = locker.Lock(lockName, time.Second)
	if err != nil {
		t.Fatalf("failed to reacquire lock: %v", err)
	}
	if !success {
		t.Fatal("should be able to reacquire lock after release")
	}
}

func TestLockerWithInvalidToken(t *testing.T) {
	memCache := cache.NewMemory(cache.MemoryConfig{DefaultTTL: time.Minute})
	locker := New(logrus.New(), memCache)

	// Acquire a lock
	lockName := "test-lock"
	token, success, err := locker.Lock(lockName, time.Second)
	if err != nil {
		t.Fatalf("failed to acquire lock: %v", err)
	}
	if !success {
		t.Fatal("failed to acquire lock")
	}

	// Try to unlock with wrong token
	released, err := locker.Unlock(lockName, "wrong-token")
	if err != nil {
		t.Fatalf("error with wrong token: %v", err)
	}
	if released {
		t.Fatal("should not be able to release with wrong token")
	}

	// Can still unlock with correct token
	released, err = locker.Unlock(lockName, token)
	if err != nil {
		t.Fatalf("failed to release lock: %v", err)
	}
	if !released {
		t.Fatal("failed to release lock with correct token")
	}
}

func TestLockerExpiration(t *testing.T) {
	memCache := cache.NewMemory(cache.MemoryConfig{DefaultTTL: time.Minute})
	locker := New(logrus.New(), memCache)

	// Acquire a lock with very short TTL
	lockName := "expiring-lock"
	_, success, err := locker.Lock(lockName, 50*time.Millisecond)
	if err != nil {
		t.Fatalf("failed to acquire lock: %v", err)
	}
	if !success {
		t.Fatal("failed to acquire lock")
	}

	// Verify we can't acquire it immediately
	_, success, err = locker.Lock(lockName, time.Second)
	if err != nil {
		t.Fatalf("error checking lock: %v", err)
	}
	if success {
		t.Fatal("should not be able to acquire locked resource")
	}

	// Wait for expiration
	time.Sleep(100 * time.Millisecond)

	// Should be able to acquire after expiration
	_, success, err = locker.Lock(lockName, time.Second)
	if err != nil {
		t.Fatalf("failed to acquire after expiration: %v", err)
	}
	if !success {
		t.Fatal("should be able to acquire lock after expiration")
	}
}
