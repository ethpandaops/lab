// Package mock provides mock implementations for testing
package mock

import (
	"fmt"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
)

// TokenErrorCache is a special cache implementation that forces token generation errors
type TokenErrorCache struct {
	cache.Client
}

// NewTokenErrorCache creates a new token error cache
func NewTokenErrorCache(baseCache cache.Client) *TokenErrorCache {
	return &TokenErrorCache{
		Client: baseCache,
	}
}

// Lock attempts to acquire a lock but always returns a token generation error
func (l *TokenErrorCache) Lock(name string, ttl time.Duration) (string, bool, error) {
	return "", false, fmt.Errorf("mock token generation error")
}

// GenerateTokenError returns a predefined error for token generation
func GenerateTokenError() (string, error) {
	return "", fmt.Errorf("mock token generation error")
}

// StandardCache is a mock implementation of cache.Client
type StandardCache struct {
	getErr    error
	setErr    error
	deleteErr error
	data      map[string][]byte
}

// NewStandardCache creates a new standard cache mock
func NewStandardCache() *StandardCache {
	return &StandardCache{
		data: make(map[string][]byte),
	}
}

// WithGetError configures the mock to return an error on Get
func (m *StandardCache) WithGetError(err error) *StandardCache {
	m.getErr = err
	return m
}

// WithSetError configures the mock to return an error on Set
func (m *StandardCache) WithSetError(err error) *StandardCache {
	m.setErr = err
	return m
}

// WithDeleteError configures the mock to return an error on Delete
func (m *StandardCache) WithDeleteError(err error) *StandardCache {
	m.deleteErr = err
	return m
}

// Get implements cache.Client
func (m *StandardCache) Get(key string) ([]byte, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	value, exists := m.data[key]
	if !exists {
		return nil, cache.ErrCacheMiss
	}
	return value, nil
}

// Set implements cache.Client
func (m *StandardCache) Set(key string, value []byte, ttl time.Duration) error {
	if m.setErr != nil {
		return m.setErr
	}
	m.data[key] = value
	return nil
}

// Delete implements cache.Client
func (m *StandardCache) Delete(key string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.data, key)
	return nil
}

// Stop implements cache.Client
func (m *StandardCache) Stop() error {
	return nil
}
