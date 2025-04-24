package locker

import (
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
)

// mockTokenErrorCache is a test-local implementation that allows testing token generation errors
type mockTokenErrorCache struct{}

func (m *mockTokenErrorCache) Get(key string) ([]byte, error) {
	// Always return cache miss to trigger the token generation path
	return nil, cache.ErrCacheMiss
}

func (m *mockTokenErrorCache) Set(key string, value []byte, ttl time.Duration) error {
	// No-op
	return nil
}

func (m *mockTokenErrorCache) Delete(key string) error {
	// No-op
	return nil
}

func (m *mockTokenErrorCache) Stop() error {
	// No-op
	return nil
}
