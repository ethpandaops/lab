// Package state provides a simple interface for storing and retrieving typed state using a cache backend.
package state

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// Error returned when a key is not found
var ErrNotFound = errors.New("key not found")

// Client is a generic state client interface for a specific type and key
type Client[T any] interface {
	// Get retrieves state
	Get(ctx context.Context) (T, error)

	// Set updates the state
	Set(ctx context.Context, value T) error
}

// Config contains configuration for the state client
type Config struct {
	// Namespace is the prefix used for all keys to prevent conflicts between modules
	Namespace string `yaml:"namespace"`

	// TTL is the time-to-live for state entries. Refreshes the TTL when the state is updated.
	TTL time.Duration `yaml:"ttl" default:"774h"` // 32 days
}

// Validate validates the config
func (c *Config) Validate() error {
	if c.Namespace == "" {
		return fmt.Errorf("namespace is required")
	}

	if c.TTL <= 0 {
		return fmt.Errorf("ttl must be greater than 0")
	}

	return nil
}

// client implements the Client interface for a specific type
type client[T any] struct {
	log     logrus.FieldLogger
	cache   cache.Client
	config  *Config
	key     string
	metrics *metrics.Collector

	// Prometheus metrics
	operationsTotal   *prometheus.CounterVec
	operationDuration *prometheus.HistogramVec
}

// New creates a new typed state client for a specific type and key
func New[T any](log logrus.FieldLogger, cacheClient cache.Client, config *Config, key string, metricsService *metrics.Metrics) Client[T] {
	c := &client[T]{
		log:    log.WithField("component", "lab/state"),
		cache:  cacheClient,
		config: config,
		key:    key,
	}

	if metricsService != nil {
		collector := metricsService.NewCollector("state")
		c.metrics = collector
		c.initMetrics()
	}

	return c
}

// initMetrics initializes the metrics for the state client
func (c *client[T]) initMetrics() {
	// Define metrics
	var err error

	// Operations counter (count operations by type and status)
	c.operationsTotal, err = c.metrics.NewCounterVec(
		"operations_total",
		"Total number of state operations",
		[]string{"operation", "status"},
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create operations_total metric")
	}

	// Operation duration histogram
	c.operationDuration, err = c.metrics.NewHistogramVec(
		"operation_duration_seconds",
		"Duration of state operations in seconds",
		[]string{"operation"},
		nil, // Use default buckets
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create operation_duration_seconds metric")
	}
}

func (c *client[T]) Start(ctx context.Context) error {
	c.log.WithFields(logrus.Fields{
		"key":       c.key,
		"ttl":       c.config.TTL,
		"namespace": c.config.Namespace,
	}).Debug("Starting state client")

	if err := c.config.Validate(); err != nil {
		return fmt.Errorf("failed to validate config: %w", err)
	}

	return nil
}

// namespaceKey prefixes the key with the namespace
func (c *client[T]) namespaceKey() string {
	key := c.key

	if c.config.Namespace == "" {
		return key
	}

	// Avoid double separators
	if strings.HasSuffix(c.config.Namespace, "/") {
		return c.config.Namespace + key
	}

	return c.config.Namespace + "/" + key
}

// Get retrieves state
func (c *client[T]) Get(ctx context.Context) (T, error) {
	var result T
	namespacedKey := c.namespaceKey()

	// Start timer for operation duration if metrics are enabled
	var timer *prometheus.Timer
	if c.operationDuration != nil {
		timer = prometheus.NewTimer(c.operationDuration.WithLabelValues("get"))
		defer timer.ObserveDuration()
	}

	data, err := c.cache.Get(namespacedKey)
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			// Increment error counter if metrics are enabled
			if c.operationsTotal != nil {
				c.operationsTotal.WithLabelValues("get", "not_found").Inc()
			}
			return result, ErrNotFound
		}
		// Increment error counter if metrics are enabled
		if c.operationsTotal != nil {
			c.operationsTotal.WithLabelValues("get", "error").Inc()
		}
		return result, fmt.Errorf("failed to get state for key %s: %w", namespacedKey, err)
	}

	if err := json.Unmarshal(data, &result); err != nil {
		// Increment error counter if metrics are enabled
		if c.operationsTotal != nil {
			c.operationsTotal.WithLabelValues("get", "error").Inc()
		}
		return result, fmt.Errorf("failed to unmarshal state for key %s: %w", namespacedKey, err)
	}

	// Increment success counter if metrics are enabled
	if c.operationsTotal != nil {
		c.operationsTotal.WithLabelValues("get", "success").Inc()
	}

	return result, nil
}

// Set stores state with optional TTL
func (c *client[T]) Set(ctx context.Context, value T) error {
	namespacedKey := c.namespaceKey()

	// Start timer for operation duration if metrics are enabled
	var timer *prometheus.Timer
	if c.operationDuration != nil {
		timer = prometheus.NewTimer(c.operationDuration.WithLabelValues("set"))
		defer timer.ObserveDuration()
	}

	data, err := json.Marshal(value)
	if err != nil {
		// Increment error counter if metrics are enabled
		if c.operationsTotal != nil {
			c.operationsTotal.WithLabelValues("set", "error").Inc()
		}
		return fmt.Errorf("failed to marshal state for key %s: %w", namespacedKey, err)
	}

	if err := c.cache.Set(namespacedKey, data, c.config.TTL); err != nil {
		// Increment error counter if metrics are enabled
		if c.operationsTotal != nil {
			c.operationsTotal.WithLabelValues("set", "error").Inc()
		}
		return fmt.Errorf("failed to set state for key %s: %w", namespacedKey, err)
	}

	// Increment success counter if metrics are enabled
	if c.operationsTotal != nil {
		c.operationsTotal.WithLabelValues("set", "success").Inc()
	}

	return nil
}

// Delete removes state
func (c *client[T]) Delete(ctx context.Context) error {
	namespacedKey := c.namespaceKey()

	// Start timer for operation duration if metrics are enabled
	var timer *prometheus.Timer
	if c.operationDuration != nil {
		timer = prometheus.NewTimer(c.operationDuration.WithLabelValues("delete"))
		defer timer.ObserveDuration()
	}

	if err := c.cache.Delete(namespacedKey); err != nil {
		// Increment error counter if metrics are enabled
		if c.operationsTotal != nil {
			c.operationsTotal.WithLabelValues("delete", "error").Inc()
		}
		return fmt.Errorf("failed to delete state for key %s: %w", namespacedKey, err)
	}

	// Increment success counter if metrics are enabled
	if c.operationsTotal != nil {
		c.operationsTotal.WithLabelValues("delete", "success").Inc()
	}

	return nil
}
