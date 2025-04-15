package beacon_slots

import (
	"fmt"
	"time"
)

// Config represents the configuration for the beacon_slots module
type Config struct {
	Enabled  bool           `yaml:"enabled"`
	Networks []string       `yaml:"networks"`
	Backfill BackfillConfig `yaml:"backfill"`
}

// BackfillConfig represents configuration for backlog and middle processing
type BackfillConfig struct {
	Enabled                 bool          `yaml:"enabled"`
	SlotsAgo                int64         `yaml:"slots_ago"`
	MiddleProcessorEnable   bool          `yaml:"middle_processor_enable"`   // Enable processing recent window on startup
	MiddleProcessorDuration time.Duration `yaml:"middle_processor_duration"` // Duration for the middle processor (e.g., "1h")
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if !c.Enabled {
		return nil
	}

	if len(c.Networks) == 0 {
		return fmt.Errorf("no networks specified")
	}

	if c.Backfill.MiddleProcessorEnable && c.Backfill.MiddleProcessorDuration <= 0 {
		return fmt.Errorf("middle_processor_duration must be positive if middle_processor_enable is true")
	}

	return nil
}

// GetInterval returns the interval for processing
func (c *Config) GetInterval() time.Duration {
	return 15 * time.Minute // default interval
}
