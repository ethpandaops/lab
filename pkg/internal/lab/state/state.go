// Package state provides a simple interface for storing and retrieving typed state using a cache backend.
package state

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
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
	log    logrus.FieldLogger
	cache  cache.Client
	config *Config
	key    string
}

// New creates a new typed state client for a specific type and key
func New[T any](log logrus.FieldLogger, cacheClient cache.Client, config *Config, key string) Client[T] {
	return &client[T]{
		log:    log.WithField("component", "lab/state"),
		cache:  cacheClient,
		config: config,
		key:    key,
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

	data, err := c.cache.Get(namespacedKey)
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			return result, ErrNotFound
		}
		return result, fmt.Errorf("failed to get state for key %s: %w", namespacedKey, err)
	}

	if err := json.Unmarshal(data, &result); err != nil {
		return result, fmt.Errorf("failed to unmarshal state for key %s: %w", namespacedKey, err)
	}

	return result, nil
}

// Set stores state with optional TTL
func (c *client[T]) Set(ctx context.Context, value T) error {
	namespacedKey := c.namespaceKey()

	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal state for key %s: %w", namespacedKey, err)
	}

	if err := c.cache.Set(namespacedKey, data, c.config.TTL); err != nil {
		return fmt.Errorf("failed to set state for key %s: %w", namespacedKey, err)
	}

	return nil
}

// Delete removes state
func (c *client[T]) Delete(ctx context.Context) error {
	namespacedKey := c.namespaceKey()
	if err := c.cache.Delete(namespacedKey); err != nil {
		return fmt.Errorf("failed to delete state for key %s: %w", namespacedKey, err)
	}

	return nil
}
