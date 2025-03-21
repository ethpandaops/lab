package cache

import (
	"errors"
	"sync"
	"time"
)

type MemoryConfig struct {
	DefaultTTL time.Duration `yaml:"defaultTTL"`
}

// MemoryCache implements the Cache interface using an in-memory map
type MemoryCache struct {
	data       map[string]cacheItem
	defaultTTL time.Duration
	mu         sync.RWMutex
}

type cacheItem struct {
	value      []byte
	expiration time.Time
}

// NewMemory creates a new memory cache
func NewMemory(config MemoryConfig) *MemoryCache {
	cache := &MemoryCache{
		data:       make(map[string]cacheItem),
		defaultTTL: config.DefaultTTL,
	}

	// Start a garbage collector to clean up expired items
	go cache.startGC()

	return cache
}

// Get gets a value from the cache
func (c *MemoryCache) Get(key string) ([]byte, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, ok := c.data[key]
	if !ok {
		return nil, errors.New("key not found")
	}

	// Check if item has expired
	if !item.expiration.IsZero() && time.Now().After(item.expiration) {
		// Delete expired item
		delete(c.data, key)
		return nil, errors.New("key expired")
	}

	return item.value, nil
}

// Set sets a value in the cache
func (c *MemoryCache) Set(key string, value []byte, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = c.defaultTTL
	}

	var expiration time.Time
	if ttl > 0 {
		expiration = time.Now().Add(ttl)
	}

	c.data[key] = cacheItem{
		value:      value,
		expiration: expiration,
	}

	return nil
}

// Delete deletes a value from the cache
func (c *MemoryCache) Delete(key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	_, ok := c.data[key]
	if !ok {
		return errors.New("key not found")
	}

	delete(c.data, key)
	return nil
}

// Stop gracefully stops the cache
func (c *MemoryCache) Stop() error {
	// Nothing to clean up for in-memory cache
	return nil
}

// startGC starts the garbage collector to clean up expired items
func (c *MemoryCache) startGC() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.deleteExpired()
	}
}

// deleteExpired deletes all expired items
func (c *MemoryCache) deleteExpired() {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()

	for key, item := range c.data {
		if !item.expiration.IsZero() && now.After(item.expiration) {
			delete(c.data, key)
		}
	}
}
