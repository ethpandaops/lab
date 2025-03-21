package cache

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisConfig struct {
	URL        string        `yaml:"url"`
	DefaultTTL time.Duration `yaml:"defaultTTL"`
}

// RedisCache implements the Cache interface using Redis
type RedisCache struct {
	client     *redis.Client
	ctx        context.Context
	defaultTTL time.Duration
}

// NewRedis creates a new Redis cache
func NewRedis(config RedisConfig) (*RedisCache, error) {
	opts, err := redis.ParseURL(config.URL)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)
	ctx := context.Background()

	// Test the connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &RedisCache{
		client:     client,
		ctx:        ctx,
		defaultTTL: config.DefaultTTL,
	}, nil
}

// Get gets a value from the cache
func (c *RedisCache) Get(key string) ([]byte, error) {
	val, err := c.client.Get(c.ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, errors.New("key not found")
		}
		return nil, err
	}
	return val, nil
}

// Set sets a value in the cache
func (c *RedisCache) Set(key string, value []byte, ttl time.Duration) error {
	// Use default TTL if not specified
	if ttl == 0 {
		ttl = c.defaultTTL
	}

	return c.client.Set(c.ctx, key, value, ttl).Err()
}

// Delete deletes a value from the cache
func (c *RedisCache) Delete(key string) error {
	result, err := c.client.Del(c.ctx, key).Result()
	if err != nil {
		return err
	}
	if result == 0 {
		return errors.New("key not found")
	}
	return nil
}

// Close closes the cache connection
func (c *RedisCache) Stop() error {
	return c.client.Close()
}
