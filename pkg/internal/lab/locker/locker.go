// Package locker provides interfaces and implementations for distributed locking.
package locker

import (
	"fmt"
	"strconv"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// For testing purposes, we can replace this function
var generateTokenFn = cache.GenerateToken

// Locker is an interface for acquiring and releasing distributed locks
type Locker interface {
	// Lock attempts to acquire a lock with the given name and TTL.
	// Returns a token that can be used to release the lock, a boolean indicating success,
	// and an error if something went wrong.
	// If the lock is already held, success will be false with a nil error.
	Lock(name string, ttl time.Duration) (string, bool, error)

	// Unlock releases a lock with the given name and token.
	// The token must match the one returned by Lock.
	// Returns true if the lock was released, false otherwise.
	Unlock(name string, token string) (bool, error)
}

// locker implements the Locker interface
type locker struct {
	log   logrus.FieldLogger
	cache cache.Client

	// Metrics
	metrics           *metrics.Metrics
	collector         *metrics.Collector
	operationsTotal   *prometheus.CounterVec
	operationDuration *prometheus.HistogramVec
	locksHeld         *prometheus.GaugeVec
	lockContention    *prometheus.CounterVec
	lockHoldDuration  *prometheus.HistogramVec
}

// New creates a new distributed lock implementation using the provided cache
func New(log logrus.FieldLogger, cache cache.Client, metricsSvc *metrics.Metrics) Locker {
	l := &locker{
		log:     log.WithField("component", "lab/locker"),
		cache:   cache,
		metrics: metricsSvc,
	}

	l.initMetrics()

	return l
}

// initMetrics initializes Prometheus metrics for the locker
func (l *locker) initMetrics() {
	// Create a collector for the locker subsystem
	l.collector = l.metrics.NewCollector("locker")

	// Register metrics
	var err error
	l.operationsTotal, err = l.collector.NewCounterVec(
		"operations_total",
		"Total number of lock operations (acquire, release)",
		[]string{"operation", "status"},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create operations_total metric")
	}

	l.operationDuration, err = l.collector.NewHistogramVec(
		"operation_duration_seconds",
		"Duration of lock operations in seconds",
		[]string{"operation"},
		prometheus.DefBuckets,
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create operation_duration_seconds metric")
	}

	l.locksHeld, err = l.collector.NewGaugeVec(
		"locks_held",
		"Number of currently held locks",
		[]string{"status"},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create locks_held metric")
	}

	l.lockContention, err = l.collector.NewCounterVec(
		"contention_total",
		"Total number of lock contentions (attempts to acquire an already held lock)",
		[]string{},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create contention_total metric")
	}

	// Add a histogram to track lock hold durations
	l.lockHoldDuration, err = l.collector.NewHistogramVec(
		"hold_duration_seconds",
		"Duration that locks are held before being released",
		[]string{},
		prometheus.ExponentialBuckets(0.001, 2, 15), // From 1ms to ~16s
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create hold_duration_seconds metric")
	}
}

// Lock attempts to acquire a lock using cache
func (l *locker) Lock(name string, ttl time.Duration) (string, bool, error) {
	startTime := time.Now()
	var status string = "success"
	var acquired bool = false

	// Defer metrics recording
	defer func() {
		duration := time.Since(startTime).Seconds()
		l.operationDuration.WithLabelValues("lock").Observe(duration)
		l.operationsTotal.WithLabelValues("lock", status).Inc()

		// Update locks held gauge if lock was acquired
		if acquired {
			l.locksHeld.WithLabelValues("active").Inc()
		}
	}()

	logCtx := l.log.WithField("name", name).WithField("ttl", ttl)
	logCtx.Debug("Locking")

	// Generate a unique token for this lock
	token, err := generateTokenFn()
	if err != nil {
		logCtx.WithError(err).Error("Failed to generate token")
		status = "error"
		return "", false, err
	}

	// The lock key in the cache
	lockKey := "lock:" + name

	// The timestamp key in the cache (for measuring hold duration)
	timestampKey := "lock_timestamp:" + name

	// Try to get the existing lock
	_, err = l.cache.Get(lockKey)
	if err == nil {
		// Lock exists and is valid
		logCtx.Debug("Lock exists and is valid")
		status = "already_locked"

		// Increment contention counter when a lock is already held
		l.lockContention.WithLabelValues().Inc()

		return "", false, nil
	} else if err != cache.ErrCacheMiss {
		// Unexpected error
		logCtx.WithError(err).Error("Failed to get lock")
		status = "error"
		return "", false, err
	}

	// No lock exists or it has expired, try to set it
	err = l.cache.Set(lockKey, []byte(token), ttl)
	if err != nil {
		logCtx.WithError(err).Error("Failed to set lock")
		status = "error"
		return "", false, err
	}

	// Store the acquisition timestamp for measuring hold duration
	timestamp := time.Now().UnixNano()
	err = l.cache.Set(timestampKey, []byte(fmt.Sprintf("%d", timestamp)), ttl)
	if err != nil {
		logCtx.WithError(err).Warn("Failed to set lock timestamp")
	}

	logCtx.Debug("Lock acquired")
	acquired = true

	return token, true, nil
}

// Unlock releases a lock
func (l *locker) Unlock(name string, token string) (bool, error) {
	startTime := time.Now()
	var status string = "success"
	var released bool = false

	// Defer metrics recording
	defer func() {
		duration := time.Since(startTime).Seconds()
		l.operationDuration.WithLabelValues("unlock").Observe(duration)
		l.operationsTotal.WithLabelValues("unlock", status).Inc()

		// Update locks held gauge if lock was released
		if released {
			l.locksHeld.WithLabelValues("active").Dec()
		}
	}()

	lockKey := "lock:" + name
	timestampKey := "lock_timestamp:" + name

	logCtx := l.log.WithField("name", name).WithField("token", token)
	logCtx.Debug("Unlocking")

	// Get the current token
	data, err := l.cache.Get(lockKey)
	if err != nil {
		if err == cache.ErrCacheMiss {
			// Lock doesn't exist
			logCtx.Debug("Lock doesn't exist")
			status = "not_found"
			return false, nil
		}

		logCtx.WithError(err).Error("Failed to get lock")
		status = "error"
		return false, err
	}

	// Check if the token matches
	if string(data) != token {
		logCtx.Debug("Lock token doesn't match")
		status = "token_mismatch"
		return false, nil
	}

	// Measure hold duration
	timestampData, err := l.cache.Get(timestampKey)
	if err == nil {
		// Parse the timestamp
		timestamp, err := strconv.ParseInt(string(timestampData), 10, 64)
		if err == nil {
			// Calculate hold duration
			holdDuration := time.Since(time.Unix(0, timestamp)).Seconds()
			l.lockHoldDuration.WithLabelValues().Observe(holdDuration)
		}
	}

	// Delete the lock
	err = l.cache.Delete(lockKey)
	if err != nil {
		logCtx.WithError(err).Error("Failed to delete lock")
		status = "error"
		return false, err
	}

	// Clean up the timestamp key
	_ = l.cache.Delete(timestampKey) // Ignore errors for cleanup

	logCtx.Debug("Lock released")
	released = true

	return true, nil
}
