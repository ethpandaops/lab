package cache

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/mitchellh/mapstructure"
)

// Error message constants
const (
	ErrCacheMissMsg = "key not found in cache"
)

// Error returned when a key is not found in the cache
var ErrCacheMiss = errors.New(ErrCacheMissMsg)

// GenerateToken generates a random token for lock identification
func GenerateToken() (string, error) {
	b := make([]byte, 16)

	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(b), nil
}

// Client is a cache client
type Client interface {
	// Get gets a value from the cache
	Get(key string) ([]byte, error)

	// Set sets a value in the cache
	Set(key string, value []byte, ttl time.Duration) error

	// Delete deletes a value from the cache
	Delete(key string) error

	// Stop gracefully stops the cache
	Stop() error
}

type CacheType string

const (
	CacheTypeRedis  CacheType = "redis"
	CacheTypeMemory CacheType = "memory"
)

// Config contains configuration for caches
type Config struct {
	Type   CacheType `yaml:"type"` // "redis" or "memory"
	Config map[string]any
}

func (c *Config) Validate() error {
	if c.Type == "" {
		return fmt.Errorf("cache type is required")
	}

	return nil
}

// New creates a new cache based on the config
func New(config *Config, metricsSvc *metrics.Metrics) (Client, error) {
	if metricsSvc == nil {
		return nil, fmt.Errorf("metrics service is required")
	}

	switch config.Type {
	case CacheTypeRedis:
		redisConfig := &RedisConfig{}
		if config.Config != nil {
			if err := mapstructure.Decode(config.Config, redisConfig); err != nil {
				return nil, fmt.Errorf("failed to decode redis config: %w", err)
			}
		}

		// Pass metricsSvc, even though Redis instrumentation is not done yet
		return NewRedis(*redisConfig, metricsSvc)
	case CacheTypeMemory:
		memoryConfig := &MemoryConfig{}
		if config.Config != nil {
			if err := mapstructure.Decode(config.Config, memoryConfig); err != nil {
				return nil, fmt.Errorf("failed to decode memory config: %w", err)
			}
		}

		return NewMemory(*memoryConfig, metricsSvc), nil
	default:
		return nil, fmt.Errorf("invalid cache type: %s", config.Type)
	}
}
