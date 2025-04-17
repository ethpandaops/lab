package locker

import (
	"fmt"
	"testing"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/sirupsen/logrus"
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

// TestTokenGenerationError tests the token generation error path in the Lock method
func TestTokenGenerationError(t *testing.T) {
	// Set up a test locker that uses our mock
	l := &locker{
		cache:   &mockTokenErrorCache{},
		log:     logrus.New().WithField("component", "lab/locker"),
		metrics: nil, // Metrics can be nil for this test
	}

	// Replace the GenerateToken function for this test
	// Store the original to restore it later
	originalGenerateTokenFn := generateTokenFn
	generateTokenFn = func() (string, error) {
		return "", fmt.Errorf("simulated token generation error")
	}
	defer func() {
		// Restore the original function when done
		generateTokenFn = originalGenerateTokenFn
	}()

	// Now try to acquire a lock, which should fail due to token generation error
	token, success, err := l.Lock("test-lock", time.Second)

	// Verify we got the expected error
	if err == nil {
		t.Fatal("Expected error from Lock when token generation fails")
	}
	if success {
		t.Fatal("Expected success to be false when token generation fails")
	}
	if token != "" {
		t.Fatalf("Expected empty token, got: %s", token)
	}
}
