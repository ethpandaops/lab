package test

import (
	"bytes"
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/docker/go-connections/nat"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
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

func TestRedisCache(t *testing.T) {
	// Skip integration tests if running in CI or short testing mode
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache with short default TTL for testing
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}

	defer cache.Stop()

	// Basic set and get
	key := "test-key"
	value := []byte("test-value")

	// Set a value
	if err := cache.Set(key, value, 0); err != nil {
		t.Fatalf("failed to set value: %v", err)
	}

	// Get the value
	retrieved, err := cache.Get(key)
	if err != nil {
		t.Fatalf("failed to get value: %v", err)
	}

	if !bytes.Equal(retrieved, value) {
		t.Errorf("expected %v, got %v", value, retrieved)
	}

	// Test deletion
	if err := cache.Delete(key); err != nil {
		t.Fatalf("failed to delete key: %v", err)
	}

	// Verify key is gone
	_, err = cache.Get(key)
	if err == nil {
		t.Error("expected error when getting deleted key")
	}
}

func TestRedisExpiration(t *testing.T) {
	// Skip integration tests if running in CI or short testing mode
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}

	defer cache.Stop()

	// Set a value with short TTL
	key := "expiring-key"
	value := []byte("will-expire")
	if err := cache.Set(key, value, 100*time.Millisecond); err != nil {
		t.Fatalf("failed to set value with expiration: %v", err)
	}

	// Verify key exists initially
	_, err = cache.Get(key)
	if err != nil {
		t.Fatalf("key should exist before expiration: %v", err)
	}

	// Wait for key to expire
	time.Sleep(200 * time.Millisecond)

	// Verify key is gone after expiration
	_, err = cache.Get(key)
	if err == nil {
		t.Error("expected error when getting expired key")
	}
}

// TestRedisInvalidURL tests creating a Redis cache with an invalid URL
func TestRedisInvalidURL(t *testing.T) {
	_, err := cache.NewRedis(cache.RedisConfig{
		URL:        "invalid-url",
		DefaultTTL: time.Second,
	}, nil)
	if err == nil {
		t.Fatal("expected error when creating Redis cache with invalid URL")
	}
}

// TestRedisConnectionFailure tests creating a Redis cache with a valid URL format but no running server
func TestRedisConnectionFailure(t *testing.T) {
	_, err := cache.NewRedis(cache.RedisConfig{
		URL:        "redis://localhost:54321", // Using a port that's likely not running Redis
		DefaultTTL: time.Second,
	}, nil)
	if err == nil {
		t.Fatal("expected error when connecting to non-existent Redis server")
	}
}

// TestRedisCacheGetNonExistent tests getting a non-existent key
func TestRedisCacheGetNonExistent(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}
	defer cache.Stop()

	// Attempt to get a non-existent key
	_, err = cache.Get("non-existent-key")
	if err == nil {
		t.Fatal("expected error when getting non-existent key")
	}
	// Check if the error is ErrCacheMiss by looking at the error message
	if err.Error() != "key not found in cache" {
		t.Fatalf("expected cache miss error, got: %v", err)
	}
}

// TestRedisCacheSetCustomTTL tests setting a value with a custom TTL
func TestRedisCacheSetCustomTTL(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache with a long default TTL
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: 1 * time.Hour, // Long default TTL
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}
	defer cache.Stop()

	// Set a value with a short custom TTL
	key := "custom-ttl-key"
	value := []byte("custom-ttl-value")
	if err := cache.Set(key, value, 100*time.Millisecond); err != nil {
		t.Fatalf("failed to set value with custom TTL: %v", err)
	}

	// Verify key exists initially
	retrievedValue, err := cache.Get(key)
	if err != nil {
		t.Fatalf("key should exist before expiration: %v", err)
	}
	if !bytes.Equal(retrievedValue, value) {
		t.Errorf("expected %v, got %v", value, retrievedValue)
	}

	// Wait for key to expire
	time.Sleep(200 * time.Millisecond)

	// Verify key is gone after expiration
	_, err = cache.Get(key)
	if err == nil {
		t.Error("expected error when getting expired key")
	}
}

// TestRedisCacheOverwrite tests overwriting an existing key
func TestRedisCacheOverwrite(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}
	defer cache.Stop()

	// Set initial value
	key := "overwrite-key"
	initialValue := []byte("initial-value")
	if err := cache.Set(key, initialValue, 0); err != nil {
		t.Fatalf("failed to set initial value: %v", err)
	}

	// Set new value with same key
	newValue := []byte("new-value")
	if err := cache.Set(key, newValue, 0); err != nil {
		t.Fatalf("failed to overwrite value: %v", err)
	}

	// Get the value and verify it was overwritten
	retrievedValue, err := cache.Get(key)
	if err != nil {
		t.Fatalf("failed to get overwritten value: %v", err)
	}
	if !bytes.Equal(retrievedValue, newValue) {
		t.Errorf("expected overwritten value %v, got %v", newValue, retrievedValue)
	}
}

// TestRedisCacheDeleteNonExistent tests deleting a non-existent key
func TestRedisCacheDeleteNonExistent(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}
	defer cache.Stop()

	// Delete a non-existent key
	err = cache.Delete("non-existent-key")
	if err != nil {
		t.Fatalf("expected no error when deleting non-existent key, got: %v", err)
	}
}

// TestRedisStop tests stopping the Redis cache client
func TestRedisStop(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}

	// Stop should succeed
	err = cache.Stop()
	if err != nil {
		t.Fatalf("failed to stop Redis cache: %v", err)
	}

	// Verify further operations fail
	err = cache.Set("key", []byte("value"), 0)
	if err == nil {
		t.Fatal("expected error when using Redis cache after stopping")
	}
}

// TestRedisCacheGetError tests the error handling in Get when Redis returns an error
func TestRedisCacheGetError(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}

	// Stop Redis client to force errors on subsequent operations
	cache.Stop()

	// Try to get a key, should return a Redis error (not cache miss)
	_, err = cache.Get("any-key")
	if err == nil {
		t.Fatal("expected error when getting key from closed connection")
	}
	// Verify it's not a cache miss error
	if err.Error() == "key not found in cache" {
		t.Fatalf("expected Redis error, got cache miss error")
	}
}

// TestRedisCacheDeleteError tests the error handling in Delete when Redis returns an error
func TestRedisCacheDeleteError(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}

	// Stop Redis client to force errors on subsequent operations
	cache.Stop()

	// Try to delete a key, should return a Redis error
	err = cache.Delete("any-key")
	if err == nil {
		t.Fatal("expected error when deleting key from closed connection")
	}
}

// TestRedisSetError tests the error handling in Set when Redis returns an error
func TestRedisSetError(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup Redis container
	redisURL, cleanup := SetupRedisContainer(t)
	defer cleanup()

	// Create Redis cache
	cache, err := cache.NewRedis(cache.RedisConfig{
		URL:        redisURL,
		DefaultTTL: time.Second,
	}, nil)
	if err != nil {
		t.Fatalf("failed to create Redis cache: %v", err)
	}

	// Stop Redis client to force errors on subsequent operations
	cache.Stop()

	// Try to set a key, should return a Redis error
	err = cache.Set("any-key", []byte("value"), 0)
	if err == nil {
		t.Fatal("expected error when setting key on closed connection")
	}
}
