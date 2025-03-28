package leader

import (
	"context"
	"sync"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
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

	ctx     context.Context
	cancel  context.CancelFunc
	started bool
	stopped bool
}

// New creates a new Client election controller
func New(log logrus.FieldLogger, locker locker.Locker, config Config) *client {
	if config.RefreshInterval == 0 {
		config.RefreshInterval = config.TTL / 3
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &client{
		log:      log.WithField("component", "lab/leader").WithField("resource", config.Resource),
		config:   config,
		locker:   locker,
		ctx:      ctx,
		cancel:   cancel,
		isLeader: false,
		token:    "",
		started:  false,
		stopped:  false,
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
		// Continue with lock acquisition
	}

	token, success, err := l.locker.Lock(l.config.Resource, l.config.TTL)
	if err != nil || !success {
		return false
	}

	l.log.Info("Successfully acquired leadership")

	// Successfully acquired lock
	l.mu.Lock()
	l.isLeader = true
	l.token = token
	l.mu.Unlock()

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
		// Continue with lock refresh
	}

	l.mu.RLock()
	token := l.token
	isLeader := l.isLeader
	l.mu.RUnlock()

	if !isLeader || token == "" {
		return false
	}

	// Approach 1: Try to extend the existing lock by reacquiring it
	newToken, success, err := l.locker.Lock(l.config.Resource, l.config.TTL)
	if err == nil && success {
		l.log.Info("Successfully refreshed lock")

		// Successfully refreshed, update token
		l.mu.Lock()
		l.token = newToken
		l.mu.Unlock()

		// Best effort cleanup of old lock
		_, _ = l.locker.Unlock(l.config.Resource, token)
		return true
	}

	// Approach 2: If the lock couldn't be acquired, verify we still hold it
	// by attempting a no-op unlock/lock cycle with 0 TTL
	released, _ := l.locker.Unlock(l.config.Resource, token)
	if !released {
		l.log.Error("Failed to release our own lock, something is wrong")

		// We couldn't release our own lock, something is wrong
		return false
	}

	// Immediately try to reacquire
	newToken, success, err = l.locker.Lock(l.config.Resource, l.config.TTL)
	if err != nil || !success {
		l.log.Error("Failed to reacquire lock, something is wrong")

		return false
	}

	l.log.Info("Successfully refreshed lock")

	// Successfully refreshed with approach 2
	l.mu.Lock()
	l.token = newToken
	l.mu.Unlock()

	return true
}
