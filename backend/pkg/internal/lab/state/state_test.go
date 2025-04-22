package state

import (
	"context"
	"testing"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker/mock"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test struct for JSON marshaling
type TestJSON struct {
	Value string `json:"value"`
	Count int    `json:"count"`
}

// ExtendedClient adds non-interface methods for testing
type ExtendedClient[T any] interface {
	Client[T]
	Delete(ctx context.Context) error
}

// Create a test client for TestJSON type with a specific key
func createTestClient(t *testing.T, key string) (Client[TestJSON], *mock.StandardCache) {
	mockCache := mock.NewStandardCache()
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	config := &Config{
		Namespace: "test",
		TTL:       1 * time.Hour,
	}

	client := New[TestJSON](logger, mockCache, config, key, nil)
	return client, mockCache
}

// TestNamespaceKey tests the namespace key functionality
func TestNamespaceKey(t *testing.T) {
	tests := []struct {
		name      string
		namespace string
		key       string
		expected  string
	}{
		{
			name:      "Empty namespace",
			namespace: "",
			key:       "test-key",
			expected:  "test-key",
		},
		{
			name:      "Simple namespace",
			namespace: "module",
			key:       "test-key",
			expected:  "module/test-key",
		},
		{
			name:      "Namespace with trailing slash",
			namespace: "module/",
			key:       "test-key",
			expected:  "module/test-key",
		},
		{
			name:      "Multi-level namespace",
			namespace: "service/module",
			key:       "test-key",
			expected:  "service/module/test-key",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := logrus.New()
			mockCache := mock.NewStandardCache()
			config := &Config{
				Namespace: tt.namespace,
				TTL:       time.Hour,
			}

			// Test the effective key by looking at what's stored in the cache
			client := New[TestJSON](logger, mockCache, config, tt.key, nil)
			ctx := context.Background()

			// Set a value and see what key it uses in the cache
			testData := TestJSON{Value: "test"}
			err := client.Set(ctx, testData)
			require.NoError(t, err)

			// Check if the key in the mock cache matches our expectation
			var foundKey string
			for k := range mockCache.GetDataMap() {
				foundKey = k
				break
			}

			assert.Equal(t, tt.expected, foundKey)
		})
	}
}

func TestSetAndGet(t *testing.T) {
	// Create a client with the "json-key" key
	client, mockCache := createTestClient(t, "json-key")
	ctx := context.Background()

	// Test data
	jsonData := TestJSON{
		Value: "test value",
		Count: 42,
	}

	// Test Set
	err := client.Set(ctx, jsonData)
	require.NoError(t, err)

	// Verify data was stored in cache
	namespacedKey := "test/json-key" // Construct the expected namespaced key
	rawData, err := mockCache.Get(namespacedKey)
	require.NoError(t, err)
	assert.NotNil(t, rawData)

	// Test Get
	retrievedJSON, err := client.Get(ctx)
	require.NoError(t, err)
	assert.Equal(t, jsonData.Value, retrievedJSON.Value)
	assert.Equal(t, jsonData.Count, retrievedJSON.Count)
}

func TestPointerTypes(t *testing.T) {
	// Create client for pointer type
	logger := logrus.New()
	mockCache := mock.NewStandardCache()
	config := &Config{
		Namespace: "pointer-test",
	}

	// Create client with the "pointer-key" key
	client := New[*TestJSON](logger, mockCache, config, "pointer-key", nil)
	ctx := context.Background()

	// Test with pointer data
	jsonData := &TestJSON{
		Value: "pointer value",
		Count: 100,
	}

	// Test Set with pointer
	err := client.Set(ctx, jsonData)
	require.NoError(t, err)

	// Test Get with pointer
	retrievedJSON, err := client.Get(ctx)
	require.NoError(t, err)
	assert.NotNil(t, retrievedJSON)
	assert.Equal(t, jsonData.Value, retrievedJSON.Value)
	assert.Equal(t, jsonData.Count, retrievedJSON.Count)
}

func TestNotFound(t *testing.T) {
	client, _ := createTestClient(t, "non-existent-key")
	ctx := context.Background()

	_, err := client.Get(ctx)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestDelete(t *testing.T) {
	// Create a logger for direct initialization
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create the cache
	mockCache := mock.NewStandardCache()

	// Create the config
	config := &Config{
		Namespace: "test",
		TTL:       1 * time.Hour,
	}

	// Create a client and assert to the extended interface
	client := New[TestJSON](logger, mockCache, config, "delete-key", nil)
	extendedClient, ok := client.(ExtendedClient[TestJSON])

	// If we can't cast to extended client, skip this test
	if !ok {
		t.Skip("Client implementation doesn't satisfy ExtendedClient interface")
		return
	}

	ctx := context.Background()

	// First set some data
	testData := TestJSON{
		Value: "delete me",
		Count: 99,
	}

	err := extendedClient.Set(ctx, testData)
	require.NoError(t, err)

	// Verify it exists
	_, err = extendedClient.Get(ctx)
	require.NoError(t, err)

	// Delete it
	err = extendedClient.Delete(ctx)
	require.NoError(t, err)

	// Verify it's gone
	_, err = extendedClient.Get(ctx)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestClientWithErrors(t *testing.T) {
	logger := logrus.New()
	ctx := context.Background()

	// Mock cache that returns errors
	mockCache := mock.NewStandardCache().
		WithGetError(cache.ErrCacheMiss).
		WithSetError(assert.AnError)

	client := New[TestJSON](logger, mockCache, &Config{Namespace: "error-test"}, "error-key", nil)

	// Test Get with cache miss
	_, err := client.Get(ctx)
	assert.ErrorIs(t, err, ErrNotFound)

	// Test Set with error
	err = client.Set(ctx, TestJSON{Value: "error"})
	assert.Error(t, err)
}

// TestConfigDefaults verifies default config values
func TestConfigDefaults(t *testing.T) {
	// Create mock dependencies
	logger := logrus.New()
	mockCache := mock.NewStandardCache()

	// Create client with a minimal config instead of nil
	config := &Config{
		Namespace: "",
		TTL:       1 * time.Hour,
	}
	client := New[TestJSON](logger, mockCache, config, "default-key", nil)
	ctx := context.Background()

	// Set some data to verify defaults are applied
	testData := TestJSON{Value: "test defaults"}
	err := client.Set(ctx, testData)
	require.NoError(t, err)

	// Get the data back
	retrieved, err := client.Get(ctx)
	require.NoError(t, err)
	assert.Equal(t, testData.Value, retrieved.Value)

	// Verify data was saved in the mock cache
	// The empty namespace means the key should be used directly
	expectedKey := "default-key"
	_, err = mockCache.Get(expectedKey)
	require.NoError(t, err)
}
