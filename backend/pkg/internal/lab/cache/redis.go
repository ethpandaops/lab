package cache

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus"
)

// Status constants for metrics
const (
	StatusMiss  = "miss"
	StatusError = "error"
	StatusHit   = "hit"
	StatusOK    = "ok"
)

// RedisConfig contains configuration for Redis cache
type RedisConfig struct {
	URL        string        `yaml:"url"`        // Redis connection URL
	DefaultTTL time.Duration `yaml:"defaultTTL"` // Default TTL for cache items
}

// Redis is a Redis-backed cache implementation
type Redis struct {
	client            *redis.Client
	ctx               context.Context //nolint:containedctx // context is used for redis operations
	defaultTTL        time.Duration
	metricsCollector  *metrics.Collector
	requestsTotal     *prometheus.CounterVec
	operationDuration *prometheus.HistogramVec
	items             *prometheus.GaugeVec
	hitsTotal         *prometheus.CounterVec
	missesTotal       *prometheus.CounterVec
	stopChan          chan struct{} // Channel to signal goroutines to stop
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

	red := &Redis{
		client:            client,
		ctx:               ctx,
		defaultTTL:        config.DefaultTTL,
		metricsCollector:  collector,
		requestsTotal:     requestsTotal,
		operationDuration: operationDuration,
		items:             items,
		hitsTotal:         hitsTotal,
		missesTotal:       missesTotal,
		stopChan:          make(chan struct{}),
	}

	// Initialize items count
	go red.updateItemsCount()

	// Start periodic updates of items count
	go red.startItemsCountUpdater()

	return red, nil
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
			status = StatusMiss

			r.missesTotal.WithLabelValues().Inc()

			return nil, ErrCacheMiss
		}

		status = StatusError

		return nil, fmt.Errorf("redis get error: %w", err)
	}

	status = StatusHit
	value = []byte(result)

	r.hitsTotal.WithLabelValues().Inc()

	return value, nil
}

// Set stores a value in Redis with TTL
func (r *Redis) Set(key string, value []byte, ttl time.Duration) error {
	start := time.Now()

	var status = StatusOK // Assume ok unless error occurs

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
		status = StatusError

		return fmt.Errorf("redis set error: %w", err)
	}

	// Update items count after successful set
	go r.updateItemsCount()

	return nil
}

// SetNX sets a value in Redis only if the key doesn't exist (atomic operation)
func (r *Redis) SetNX(key string, value []byte, ttl time.Duration) (bool, error) {
	start := time.Now()

	var status = StatusOK

	var set bool

	defer func() {
		duration := time.Since(start).Seconds()
		r.operationDuration.With(prometheus.Labels{"operation": "setnx"}).Observe(duration)
		r.requestsTotal.With(prometheus.Labels{"operation": "setnx", "status": status}).Inc()
	}()

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = r.defaultTTL
	}

	// Use Redis SetNX operation (atomic)
	result := r.client.SetNX(r.ctx, key, value, ttl)

	set, err := result.Result()
	if err != nil {
		status = StatusError

		return false, fmt.Errorf("redis setnx error: %w", err)
	}

	// Update items count after successful set
	if set {
		go r.updateItemsCount()
	}

	return set, nil
}

// SetIfMatch sets a value in Redis only if the current value matches expected (atomic operation)
func (r *Redis) SetIfMatch(key string, value []byte, expected []byte, ttl time.Duration) (bool, error) {
	start := time.Now()

	var status = StatusOK

	var set bool

	defer func() {
		duration := time.Since(start).Seconds()
		r.operationDuration.With(prometheus.Labels{"operation": "setifmatch"}).Observe(duration)
		r.requestsTotal.With(prometheus.Labels{"operation": "setifmatch", "status": status}).Inc()
	}()

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = r.defaultTTL
	}

	// Use a Lua script for atomic compare-and-set
	// Script: if current value matches expected, set new value and return 1, else return 0
	script := `
		local key = KEYS[1]
		local expected = ARGV[1]
		local newval = ARGV[2]
		local ttl = ARGV[3]
		
		local current = redis.call('GET', key)
		if current == expected then
			if ttl == "0" then
				redis.call('SET', key, newval)
			else
				redis.call('SET', key, newval, 'EX', ttl)
			end
			return 1
		else
			return 0
		end
	`

	ttlSeconds := int64(ttl.Seconds())
	result := r.client.Eval(r.ctx, script, []string{key}, expected, value, ttlSeconds)

	val, err := result.Int()
	if err != nil {
		status = StatusError

		return false, fmt.Errorf("redis setifmatch error: %w", err)
	}

	set = val == 1

	// Update items count after successful set
	if set {
		go r.updateItemsCount()
	}

	return set, nil
}

// Delete removes a value from Redis
func (r *Redis) Delete(key string) error {
	start := time.Now()

	var status = StatusOK // Assume ok unless error occurs

	defer func() {
		duration := time.Since(start).Seconds()
		r.operationDuration.With(prometheus.Labels{"operation": "delete"}).Observe(duration)
		r.requestsTotal.With(prometheus.Labels{"operation": "delete", "status": status}).Inc()
	}()

	err := r.client.Del(r.ctx, key).Err()
	if err != nil {
		status = StatusError

		return fmt.Errorf("redis delete error: %w", err)
	}

	// Update items count after successful delete
	go r.updateItemsCount()

	return nil
}

// Stop closes the Redis connection and stops background goroutines
func (r *Redis) Stop() error {
	// Signal all goroutines to stop
	close(r.stopChan)

	// Close the Redis connection
	return r.client.Close()
}

// updateItemsCount updates the items gauge with the current number of keys in Redis
func (r *Redis) updateItemsCount() {
	// Use DBSIZE command to get the number of keys in the current database
	size, err := r.client.DBSize(r.ctx).Result()
	if err != nil {
		// Just log to stderr since we can't access the logger directly
		fmt.Fprintf(os.Stderr, "Failed to get Redis database size: %v\n", err)

		return
	}

	// Update the items gauge
	r.items.WithLabelValues().Set(float64(size))
}

// startItemsCountUpdater starts a goroutine that periodically updates the items count
func (r *Redis) startItemsCountUpdater() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.updateItemsCount()
		case <-r.stopChan:
			// Stop the goroutine when signaled
			return
		}
	}
}
