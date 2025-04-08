package xatu_public_contributors

import (
	"errors"
	"time"
)

// Config is the configuration for the xatu_public_contributors service
type Config struct {
	// Enable the xatu_public_contributors module
	Enabled bool `yaml:"enabled" json:"enabled"`
	// Redis key prefix
	RedisKeyPrefix string `yaml:"redis_key_prefix" json:"redis_key_prefix"`
	// Networks to target
	Networks []string `yaml:"networks" json:"networks"`
	// Hours to backfill when no data exists
	BackfillHours int64 `yaml:"backfill_hours" json:"backfill_hours"`
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if !c.Enabled {
		return nil
	}

	if len(c.Networks) == 0 {
		return errors.New("no networks specified")
	}

	if c.RedisKeyPrefix == "" {
		return errors.New("redis_key_prefix is required")
	}

	return nil
}

// GetInterval returns the interval for the service
func (c *Config) GetInterval(window string) time.Duration {
	switch window {
	case "hourly":
		return time.Hour
	case "daily":
		return 24 * time.Hour
	default:
		return 15 * time.Minute
	}
}

// Note: ToProtoConfig and FromProtoConfig will be implemented after
// the proto package is generated correctly
