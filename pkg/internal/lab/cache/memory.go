package cache

import (
	"sync"
	"time"
)

// MemoryConfig contains configuration for memory cache
type MemoryConfig struct {
	DefaultTTL time.Duration `yaml:"defaultTTL"`
}

// Memory implements an in-memory cache
type Memory struct {
	data       map[string]cacheItem
	defaultTTL time.Duration
	mu         sync.RWMutex
}

type cacheItem struct {
	value      []byte
	expiration time.Time
}

// NewMemory creates a new memory cache
func NewMemory(config MemoryConfig) *Memory {
	cache := &Memory{
		data:       make(map[string]cacheItem),
		defaultTTL: config.DefaultTTL,
	}

	// Start garbage collection in background
	go cache.startGC()

	return cache
}

// Get gets a value from the cache
func (c *Memory) Get(key string) ([]byte, error) {
	c.mu.RLock()
	item, exists := c.data[key]
	c.mu.RUnlock()

	if !exists {
		return nil, ErrCacheMiss
	}

	// Check if the item has expired
	if !item.expiration.IsZero() && time.Now().After(item.expiration) {
		// Item has expired, delete it
		if err := c.Delete(key); err != nil {
			return nil, err
		}

		return nil, ErrCacheMiss
	}

	return item.value, nil
}

// Set sets a value in the cache
func (c *Memory) Set(key string, value []byte, ttl time.Duration) error {
	// Use default TTL if not specified
	if ttl == 0 {
		ttl = c.defaultTTL
	}

	// Calculate expiration
	var expiration time.Time
	if ttl > 0 {
		expiration = time.Now().Add(ttl)
	}

	// Create or update the cache item
	c.mu.Lock()
	c.data[key] = cacheItem{
		value:      value,
		expiration: expiration,
	}
	c.mu.Unlock()

	return nil
}

// Delete deletes a value from the cache
func (c *Memory) Delete(key string) error {
	c.mu.Lock()
	delete(c.data, key)
	c.mu.Unlock()

	return nil
}

// Stop gracefully stops the cache
func (c *Memory) Stop() error {
	// Nothing to clean up for in-memory cache
	return nil
}

// startGC starts the garbage collector to clean up expired items
func (c *Memory) startGC() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.deleteExpired()
	}
}

// deleteExpired deletes all expired items
func (c *Memory) deleteExpired() {
	now := time.Now()

	// Clean up cache items
	c.mu.Lock()
	for key, item := range c.data {
		if !item.expiration.IsZero() && now.After(item.expiration) {
			delete(c.data, key)
		}
	}
	c.mu.Unlock()
}
