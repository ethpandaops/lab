package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/metrics"
	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus"
)

// RedisConfig contains configuration for Redis cache
type RedisConfig struct {
	URL        string        `yaml:"url"`        // Redis connection URL
	DefaultTTL time.Duration `yaml:"defaultTTL"` // Default TTL for cache items
}

// Redis is a Redis-backed cache implementation
type Redis struct {
	client            *redis.Client
	ctx               context.Context
	defaultTTL        time.Duration
	metricsCollector  *metrics.Collector
	requestsTotal     *prometheus.CounterVec
	operationDuration *prometheus.HistogramVec
	items             *prometheus.GaugeVec
	hitsTotal         *prometheus.CounterVec
	missesTotal       *prometheus.CounterVec
}

// NewRedis creates a new Redis cache
func NewRedis(config RedisConfig, metricsSvc *metrics.Metrics) (*Redis, error) {
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

	// Initialize metrics
	collector := metricsSvc.NewCollector("cache")

	var requestsTotal *prometheus.CounterVec
	var operationDuration *prometheus.HistogramVec
	var items *prometheus.GaugeVec
	var hitsTotal *prometheus.CounterVec
	var missesTotal *prometheus.CounterVec

	requestsTotal, err = collector.NewCounterVec(
		"requests_total",
		"Total number of cache requests.",
		[]string{"operation", "status"},
	)
	if err != nil {
		metricsSvc.Log().WithError(err).Warn("Failed to create cache_requests_total metric")
	}

	operationDuration, err = collector.NewHistogramVec(
		"operation_duration_seconds",
		"Duration of cache operations.",
		[]string{"operation"},
		nil, // Use default buckets
	)
	if err != nil {
		metricsSvc.Log().WithError(err).Warn("Failed to create cache_operation_duration_seconds metric")
	}

	items, err = collector.NewGaugeVec(
		"items",
		"Current number of items in the cache.",
		[]string{}, // No labels
	)
	if err != nil {
		metricsSvc.Log().WithError(err).Warn("Failed to create cache_items metric")
	}

	hitsTotal, err = collector.NewCounterVec(
		"hits_total",
		"Total number of cache hits.",
		[]string{}, // No labels
	)
	if err != nil {
		metricsSvc.Log().WithError(err).Warn("Failed to create cache_hits_total metric")
	}

	missesTotal, err = collector.NewCounterVec(
		"misses_total",
		"Total number of cache misses.",
		[]string{}, // No labels
	)
	if err != nil {
		metricsSvc.Log().WithError(err).Warn("Failed to create cache_misses_total metric")
	}

	redis := &Redis{
		client:            client,
		ctx:               ctx,
		defaultTTL:        config.DefaultTTL,
		metricsCollector:  collector,
		requestsTotal:     requestsTotal,
		operationDuration: operationDuration,
		items:             items,
		hitsTotal:         hitsTotal,
		missesTotal:       missesTotal,
	}

	// Initialize items count
	go redis.updateItemsCount()

	// Start periodic updates of items count
	go redis.startItemsCountUpdater()

	return redis, nil
}

// Get retrieves a value from Redis
func (r *Redis) Get(key string) ([]byte, error) {
	start := time.Now()
	var status string
	var err error
	var value []byte

	defer func() {
		duration := time.Since(start).Seconds()
		r.operationDuration.With(prometheus.Labels{"operation": "get"}).Observe(duration)
		r.requestsTotal.With(prometheus.Labels{"operation": "get", "status": status}).Inc()
	}()

	// Get value from Redis
	result, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			status = "miss"
			r.missesTotal.WithLabelValues().Inc()
			return nil, ErrCacheMiss
		}
		status = "error"
		return nil, fmt.Errorf("redis get error: %w", err)
	}

	status = "hit"
	value = []byte(result)
	r.hitsTotal.WithLabelValues().Inc()
	return value, nil
}

// Set stores a value in Redis with TTL
func (r *Redis) Set(key string, value []byte, ttl time.Duration) error {
	start := time.Now()
	var status string = "ok" // Assume ok unless error occurs

	defer func() {
		duration := time.Since(start).Seconds()
		r.operationDuration.With(prometheus.Labels{"operation": "set"}).Observe(duration)
		r.requestsTotal.With(prometheus.Labels{"operation": "set", "status": status}).Inc()
	}()

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = r.defaultTTL
	}

	// Set value in Redis with TTL
	err := r.client.Set(r.ctx, key, value, ttl).Err()
	if err != nil {
		status = "error"
		return fmt.Errorf("redis set error: %w", err)
	}

	// Update items count after successful set
	go r.updateItemsCount()

	return nil
}

// Delete removes a value from Redis
func (r *Redis) Delete(key string) error {
	start := time.Now()
	var status string = "ok" // Assume ok unless error occurs

	defer func() {
		duration := time.Since(start).Seconds()
		r.operationDuration.With(prometheus.Labels{"operation": "delete"}).Observe(duration)
		r.requestsTotal.With(prometheus.Labels{"operation": "delete", "status": status}).Inc()
	}()

	err := r.client.Del(r.ctx, key).Err()
	if err != nil {
		status = "error"
		return fmt.Errorf("redis delete error: %w", err)
	}

	// Update items count after successful delete
	go r.updateItemsCount()

	return nil
}

// Stop closes the Redis connection
func (r *Redis) Stop() error {
	return r.client.Close()
}

// updateItemsCount updates the items gauge with the current number of keys in Redis
func (r *Redis) updateItemsCount() {
	// Use DBSIZE command to get the number of keys in the current database
	size, err := r.client.DBSize(r.ctx).Result()
	if err != nil {
		// Log error but don't fail
		return
	}

	// Update the items gauge
	r.items.WithLabelValues().Set(float64(size))
}

// startItemsCountUpdater starts a goroutine that periodically updates the items count
func (r *Redis) startItemsCountUpdater() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		r.updateItemsCount()
	}
}
