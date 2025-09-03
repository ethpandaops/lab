package leader

import (
	"context"
	"sync"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

type Client interface {
	IsLeader() bool
	Start()
	Stop()
}

// Config defines parameters for Client election
type Config struct {
	// Resource is the name of the resource to lock
	Resource string

	// TTL is the lock time-to-live. Should be at least 2-3× longer than the
	// RefreshInterval to ensure locks don't expire during normal operation
	TTL time.Duration

	// RefreshInterval is how often to refresh the lock. Should be less than
	// half the TTL to ensure we refresh before expiry
	RefreshInterval time.Duration

	// OnElected is called when this instance is elected Client
	OnElected func()

	// OnRevoked is called when leadership is lost
	OnRevoked func()
}

// Client provides auto-refreshing leader election using distributed locks
type client struct {
	log logrus.FieldLogger

	config Config
	locker locker.Locker

	mu       sync.RWMutex
	isLeader bool
	token    string

	ctx     context.Context //nolint:containedctx // context is used for leader election
	cancel  context.CancelFunc
	started bool
	stopped bool

	// Metrics
	metrics                *metrics.Metrics
	collector              *metrics.Collector
	isLeaderGauge          *prometheus.GaugeVec
	electionAttemptsTotal  *prometheus.CounterVec
	leadershipChangesTotal *prometheus.CounterVec
	errorsTotal            *prometheus.CounterVec
}

// New creates a new Client election controller
func New(log logrus.FieldLogger, lock locker.Locker, config Config, metricsSvc *metrics.Metrics) *client {
	if config.RefreshInterval == 0 {
		config.RefreshInterval = config.TTL / 3
	}

	ctx, cancel := context.WithCancel(context.Background())

	c := &client{
		log:      log.WithField("component", "lab/leader").WithField("resource", config.Resource),
		config:   config,
		locker:   lock,
		ctx:      ctx,
		cancel:   cancel,
		isLeader: false,
		token:    "",
		started:  false,
		stopped:  false,
		metrics:  metricsSvc,
	}

	c.initMetrics()

	return c
}

// initMetrics initializes Prometheus metrics for the leader
func (l *client) initMetrics() {
	// Create a collector for the leader subsystem
	l.collector = l.metrics.NewCollector("leader")

	// Register metrics
	var err error

	// Gauge to indicate if this instance is the leader
	l.isLeaderGauge, err = l.collector.NewGaugeVec(
		"is_leader",
		"Indicates if this instance is currently the leader (1) or not (0)",
		[]string{},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create is_leader metric")
	}
	// Initialize to 0 (not leader)
	l.isLeaderGauge.WithLabelValues().Set(0)

	// Counter for leader election attempts
	l.electionAttemptsTotal, err = l.collector.NewCounterVec(
		"election_attempts_total",
		"Total number of leader election attempts",
		[]string{"status"},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create election_attempts_total metric")
	}

	// Counter for leadership changes
	l.leadershipChangesTotal, err = l.collector.NewCounterVec(
		"leadership_changes_total",
		"Total number of leadership changes",
		[]string{"change"},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create leadership_changes_total metric")
	}

	// Counter for errors
	l.errorsTotal, err = l.collector.NewCounterVec(
		"errors_total",
		"Total number of errors during leader election",
		[]string{"operation"},
	)
	if err != nil {
		l.log.WithError(err).Warn("Failed to create errors_total metric")
	}
}

// IsLeader returns true if this instance is currently the Client
func (l *client) IsLeader() bool {
	l.mu.RLock()
	defer l.mu.RUnlock()

	return l.isLeader
}

// Start begins the Client election process.
// This method is non-blocking and returns immediately.
// Use IsLeader() to check Client status.
func (l *client) Start() {
	l.log.Info("Starting Client election")

	l.mu.Lock()

	if l.started || l.stopped {
		l.mu.Unlock()

		return
	}

	l.started = true

	l.mu.Unlock()

	go l.run()
}

// Stop ends the Client election process and releases the lock if held
func (l *client) Stop() {
	l.log.Info("Stopping Client election")

	l.mu.Lock()

	if l.stopped {
		l.mu.Unlock()

		return
	}

	l.stopped = true

	l.mu.Unlock()

	// Cancel the context to stop the refresh goroutine
	l.cancel()

	// Release lock if we're the Client
	l.mu.Lock()
	defer l.mu.Unlock()

	l.log.Debug("Releasing lock")

	if l.isLeader && l.token != "" {
		// Release lock and notify about leadership loss
		_, _ = l.locker.Unlock(l.config.Resource, l.token)
		l.isLeader = false
		l.token = ""

		// Update metrics
		l.isLeaderGauge.WithLabelValues().Set(0)
		l.leadershipChangesTotal.WithLabelValues("lost").Inc()

		if l.config.OnRevoked != nil {
			// Call callback outside of lock
			go l.config.OnRevoked()
		}
	}
}

// run is the main control loop for Client election
func (l *client) run() {
	// Immediately try to acquire leadership
	if l.tryAcquireLeadership() {
		// Successfully acquired leadership
		if l.config.OnElected != nil {
			l.config.OnElected()
		}
	}

	ticker := time.NewTicker(l.config.RefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			l.mu.RLock()
			isLeader := l.isLeader
			l.mu.RUnlock()

			if isLeader {
				// We're the Client, refresh the lock
				if !l.refreshLock() {
					// Failed to refresh, we lost leadership
					l.mu.Lock()
					wasLeader := l.isLeader
					l.isLeader = false
					l.token = ""
					l.mu.Unlock()

					// Update metrics
					l.isLeaderGauge.WithLabelValues().Set(0)

					if wasLeader {
						l.leadershipChangesTotal.WithLabelValues("lost").Inc()
					}

					if wasLeader && l.config.OnRevoked != nil {
						l.config.OnRevoked()
					}
				}
			} else {
				// We're not the Client, try to acquire leadership
				if l.tryAcquireLeadership() {
					// Successfully acquired leadership
					if l.config.OnElected != nil {
						l.config.OnElected()
					}
				}
			}

		case <-l.ctx.Done():
			// Context canceled, stop the Client election
			return
		}
	}
}

// tryAcquireLeadership attempts to become the Client
// Returns true if leadership was acquired
func (l *client) tryAcquireLeadership() bool {
	l.log.Debug("Attempting to acquire leadership")

	// Check if we're already stopped
	select {
	case <-l.ctx.Done():
		return false
	default:
	}

	token, success, err := l.locker.Lock(l.config.Resource, l.config.TTL)

	// Track attempt in metrics
	if err != nil {
		l.electionAttemptsTotal.WithLabelValues("error").Inc()
		l.errorsTotal.WithLabelValues("acquire").Inc()

		return false
	} else if !success {
		l.electionAttemptsTotal.WithLabelValues("failure").Inc()

		return false
	}

	l.log.Info("Successfully acquired leadership")
	l.electionAttemptsTotal.WithLabelValues("success").Inc()

	// Successfully acquired lock
	l.mu.Lock()
	wasLeader := l.isLeader
	l.isLeader = true
	l.token = token
	l.mu.Unlock()

	// Update metrics
	l.isLeaderGauge.WithLabelValues().Set(1)

	if !wasLeader {
		l.leadershipChangesTotal.WithLabelValues("gained").Inc()
	}

	return true
}

// refreshLock extends the lock TTL to maintain leadership
// Returns true if lock was successfully refreshed
func (l *client) refreshLock() bool {
	l.log.Debug("Refreshing lock")

	// Check if we're already stopped
	select {
	case <-l.ctx.Done():
		return false
	default:
	}

	l.mu.RLock()
	token := l.token
	isLeader := l.isLeader
	l.mu.RUnlock()

	if !isLeader || token == "" {
		return false
	}

	// Use the locker's atomic Refresh method
	newToken, success, err := l.locker.Refresh(l.config.Resource, token, l.config.TTL)
	if err != nil {
		l.log.WithError(err).Error("Failed to refresh lock")
		l.errorsTotal.WithLabelValues("refresh").Inc()

		return false
	}

	if !success {
		l.log.Warn("Lost leadership during refresh")
		l.errorsTotal.WithLabelValues("lost").Inc()

		// We've lost leadership
		l.mu.Lock()
		wasLeader := l.isLeader
		l.isLeader = false
		l.token = ""
		l.mu.Unlock()

		// Update metrics
		l.isLeaderGauge.WithLabelValues().Set(0)

		if wasLeader {
			l.leadershipChangesTotal.WithLabelValues("lost").Inc()

			if l.config.OnRevoked != nil {
				go l.config.OnRevoked()
			}
		}

		return false
	}

	l.log.Debug("Successfully refreshed lock")

	// Successfully refreshed with new token
	l.mu.Lock()
	l.token = newToken
	l.mu.Unlock()

	return true
}
