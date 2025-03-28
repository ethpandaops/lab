package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisConfig contains configuration for Redis cache
type RedisConfig struct {
	URL        string        `yaml:"url"`        // Redis connection URL
	DefaultTTL time.Duration `yaml:"defaultTTL"` // Default TTL for cache items
}

// Redis is a Redis-backed cache implementation
type Redis struct {
	client     *redis.Client
	ctx        context.Context
	defaultTTL time.Duration
}

// NewRedis creates a new Redis cache
func NewRedis(config RedisConfig) (*Redis, error) {
	// Parse the Redis connection URL
	opts, err := redis.ParseURL(config.URL)
	if err != nil {
		return nil, fmt.Errorf("invalid Redis URL: %w", err)
	}

	// Create Redis client
	client := redis.NewClient(opts)

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &Redis{
		client:     client,
		ctx:        ctx,
		defaultTTL: config.DefaultTTL,
	}, nil
}

// Get retrieves a value from Redis
func (r *Redis) Get(key string) ([]byte, error) {
	// Get value from Redis
	value, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, ErrCacheMiss
		}
		return nil, fmt.Errorf("redis get error: %w", err)
	}

	return []byte(value), nil
}

// Set stores a value in Redis with TTL
func (r *Redis) Set(key string, value []byte, ttl time.Duration) error {
	// Use default TTL if not specified
	if ttl == 0 {
		ttl = r.defaultTTL
	}

	// Set value in Redis with TTL
	err := r.client.Set(r.ctx, key, value, ttl).Err()
	if err != nil {
		return fmt.Errorf("redis set error: %w", err)
	}

	return nil
}

// Delete removes a value from Redis
func (r *Redis) Delete(key string) error {
	err := r.client.Del(r.ctx, key).Err()
	if err != nil {
		return fmt.Errorf("redis delete error: %w", err)
	}

	return nil
}

// Stop closes the Redis connection
func (r *Redis) Stop() error {
	return r.client.Close()
}
