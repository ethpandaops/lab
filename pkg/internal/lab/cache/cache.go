package cache

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/mitchellh/mapstructure"
)

// Error returned when a key is not found in the cache
var ErrCacheMiss = errors.New("key not found in cache")

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
	Config map[string]interface{}
}

// New creates a new cache based on the config
func New(config Config) (Client, error) {
	switch config.Type {
	case CacheTypeRedis:
		redisConfig := &RedisConfig{}
		if config.Config != nil {
			// Attempt to parse the config
			if err := mapstructure.Decode(config.Config, redisConfig); err != nil {
				return nil, err
			}
		}

		return NewRedis(*redisConfig)
	case CacheTypeMemory:
		memoryConfig := &MemoryConfig{}
		if config.Config != nil {
			if err := mapstructure.Decode(config.Config, memoryConfig); err != nil {
				return nil, err
			}
		}

		return NewMemory(*memoryConfig), nil
	default:
		return nil, fmt.Errorf("invalid cache type: %s", config.Type)
	}
}
