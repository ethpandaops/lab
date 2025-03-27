package state

import (
	"fmt"
	"time"
)

// Config contains configuration for state manager
type Config struct {
	// Name is the name of the module that owns this state manager
	Name string `yaml:"name"`

	// FlushInterval is the interval at which state is flushed to storage
	FlushInterval time.Duration `yaml:"flushInterval"`
}

// Validate validates the state config
func (c *Config) Validate() error {
	if c.Name == "" {
		return fmt.Errorf("name is required")
	}

	if c.FlushInterval == 0 {
		c.FlushInterval = 60 * time.Second // Default to 60 seconds
	}

	return nil
}
