// Package locker provides interfaces and implementations for distributed locking.
package locker

import (
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
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
}

// New creates a new distributed lock implementation using the provided cache
func New(log logrus.FieldLogger, cache cache.Client) Locker {
	return &locker{
		log:   log.WithField("component", "lab/locker"),
		cache: cache,
	}
}

// Lock attempts to acquire a lock using cache
func (l *locker) Lock(name string, ttl time.Duration) (string, bool, error) {
	logCtx := l.log.WithField("name", name).WithField("ttl", ttl)
	logCtx.Debug("Locking")

	// Generate a unique token for this lock
	token, err := generateTokenFn()
	if err != nil {
		logCtx.WithError(err).Error("Failed to generate token")

		return "", false, err
	}

	// The lock key in the cache
	lockKey := "lock:" + name

	// Try to get the existing lock
	_, err = l.cache.Get(lockKey)
	if err == nil {
		// Lock exists and is valid
		logCtx.Debug("Lock exists and is valid")

		return "", false, nil
	} else if err != cache.ErrCacheMiss {
		// Unexpected error
		logCtx.WithError(err).Error("Failed to get lock")

		return "", false, err
	}

	// No lock exists or it has expired, try to set it
	err = l.cache.Set(lockKey, []byte(token), ttl)
	if err != nil {
		logCtx.WithError(err).Error("Failed to set lock")

		return "", false, err
	}

	logCtx.Debug("Lock acquired")

	return token, true, nil
}

// Unlock releases a lock
func (l *locker) Unlock(name string, token string) (bool, error) {
	lockKey := "lock:" + name

	logCtx := l.log.WithField("name", name).WithField("token", token)
	logCtx.Debug("Unlocking")

	// Get the current token
	data, err := l.cache.Get(lockKey)
	if err != nil {
		if err == cache.ErrCacheMiss {
			// Lock doesn't exist
			logCtx.Debug("Lock doesn't exist")

			return false, nil
		}

		logCtx.WithError(err).Error("Failed to get lock")

		return false, err
	}

	// Check if the token matches
	if string(data) != token {
		logCtx.Debug("Lock token doesn't match")

		return false, nil
	}

	// Delete the lock
	err = l.cache.Delete(lockKey)
	if err != nil {
		logCtx.WithError(err).Error("Failed to delete lock")

		return false, err
	}

	logCtx.Debug("Lock released")

	return true, nil
}
