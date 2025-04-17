package cache

import (
	"sync"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
)

// MemoryConfig contains configuration for memory cache
type MemoryConfig struct {
	DefaultTTL time.Duration `yaml:"defaultTTL"`
}

// Memory implements an in-memory cache
type Memory struct {
	data              map[string]cacheItem
	defaultTTL        time.Duration
	mu                sync.RWMutex
	metricsCollector  *metrics.Collector
	requestsTotal     *prometheus.CounterVec
	operationDuration *prometheus.HistogramVec
	items             *prometheus.GaugeVec
	hitsTotal         *prometheus.CounterVec
	missesTotal       *prometheus.CounterVec
}

type cacheItem struct {
	value      []byte
	expiration time.Time
}

// NewMemory creates a new memory cache
func NewMemory(config MemoryConfig, metricsSvc *metrics.Metrics) *Memory {
	collector := metricsSvc.NewCollector("cache")

	var requestsTotal *prometheus.CounterVec
	var operationDuration *prometheus.HistogramVec
	var items *prometheus.GaugeVec
	var hitsTotal *prometheus.CounterVec
	var missesTotal *prometheus.CounterVec
	var err error

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

	cache := &Memory{
		data:              make(map[string]cacheItem),
		defaultTTL:        config.DefaultTTL,
		metricsCollector:  collector,
		requestsTotal:     requestsTotal,
		operationDuration: operationDuration,
		items:             items,
		hitsTotal:         hitsTotal,
		missesTotal:       missesTotal,
	}

	// Start garbage collection in background
	go cache.startGC()

	return cache
}

// Get gets a value from the cache
func (c *Memory) Get(key string) ([]byte, error) {
	start := time.Now()
	var status string
	var err error
	var value []byte

	defer func() {
		duration := time.Since(start).Seconds()
		c.operationDuration.With(prometheus.Labels{"operation": "get"}).Observe(duration)
		c.requestsTotal.With(prometheus.Labels{"operation": "get", "status": status}).Inc()
	}()

	c.mu.RLock()
	item, exists := c.data[key]
	c.mu.RUnlock()

	if !exists {
		status = "miss"
		err = ErrCacheMiss
		c.missesTotal.WithLabelValues().Inc()
		return nil, err
	}

	// Check if the item has expired
	if !item.expiration.IsZero() && time.Now().After(item.expiration) {
		// Item has expired, delete it (Delete method already has instrumentation)
		delErr := c.Delete(key) // Use separate var to avoid shadowing outer err
		if delErr != nil {
			// Log or handle error? For now, just return the original miss error
			// but maybe log the delete error.
			status = "miss" // Still a miss from the caller's perspective
			err = ErrCacheMiss
			return nil, err
		}

		status = "miss"
		err = ErrCacheMiss
		c.missesTotal.WithLabelValues().Inc()
		return nil, err
	}

	status = "hit"
	value = item.value
	c.hitsTotal.WithLabelValues().Inc()
	return value, nil
}

// Set sets a value in the cache
func (c *Memory) Set(key string, value []byte, ttl time.Duration) error {
	start := time.Now()
	var status string = "ok" // Assume ok unless error occurs (though this impl doesn't error)

	defer func() {
		duration := time.Since(start).Seconds()
		c.operationDuration.With(prometheus.Labels{"operation": "set"}).Observe(duration)
		c.requestsTotal.With(prometheus.Labels{"operation": "set", "status": status}).Inc()
	}()

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = c.defaultTTL
	}

	// Calculate expiration
	var expiration time.Time
	if ttl > 0 {
		expiration = time.Now().Add(ttl)
	}

	// Create or update the cache item
	c.mu.Lock()
	c.data[key] = cacheItem{
		value:      value,
		expiration: expiration,
	}
	// Update items metric
	c.items.WithLabelValues().Set(float64(len(c.data)))
	c.mu.Unlock()

	return nil
}

// Delete deletes a value from the cache
func (c *Memory) Delete(key string) error {
	start := time.Now()
	var status string = "ok" // Assume ok unless error occurs (though this impl doesn't error)

	defer func() {
		duration := time.Since(start).Seconds()
		c.operationDuration.With(prometheus.Labels{"operation": "delete"}).Observe(duration)
		c.requestsTotal.With(prometheus.Labels{"operation": "delete", "status": status}).Inc()
	}()

	c.mu.Lock()
	delete(c.data, key)
	// Update items metric
	c.items.WithLabelValues().Set(float64(len(c.data)))
	c.mu.Unlock()

	return nil
}

// Stop gracefully stops the cache
func (c *Memory) Stop() error {
	// Nothing to clean up for in-memory cache
	return nil
}

// startGC starts the garbage collector to clean up expired items
func (c *Memory) startGC() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.deleteExpired()
	}
}

// deleteExpired deletes all expired items
func (c *Memory) deleteExpired() {
	now := time.Now()

	// Clean up cache items
	c.mu.Lock()
	for key, item := range c.data {
		if !item.expiration.IsZero() && now.After(item.expiration) {
			delete(c.data, key)
		}
	}
	// Update items metric after cleanup
	c.items.WithLabelValues().Set(float64(len(c.data)))
	c.mu.Unlock()
}
