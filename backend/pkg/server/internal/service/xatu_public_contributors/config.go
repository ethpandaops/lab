package xatu_public_contributors

import (
	"errors"
	"fmt"
	"time"
)

// Config is the configuration for the xatu_public_contributors service
type Config struct {
	// Enable the xatu_public_contributors module
	Enabled *bool `yaml:"enabled" json:"enabled"`
	// Redis key prefix
	RedisKeyPrefix string `yaml:"redis_key_prefix" json:"redis_key_prefix"`
	// Hours to backfill when no data exists (Note: This might be less relevant with time windows)
	BackfillHours int64 `yaml:"backfill_hours" json:"backfill_hours"`
	// Time windows for processing data (e.g., 1h, 24h)
	TimeWindows []TimeWindow `yaml:"time_windows" json:"time_windows"`
	// Overall processing interval (e.g., "15m")
	Interval string `yaml:"interval" json:"interval"`
}

// TimeWindow defines the configuration for a processing time window.
type TimeWindow struct {
	File  string `yaml:"file" json:"file"`   // e.g., "1h", "24h"
	Step  string `yaml:"step" json:"step"`   // e.g., "5m", "1h" - duration string
	Range string `yaml:"range" json:"range"` // e.g., "-1h", "-24h" - duration string
	Label string `yaml:"label" json:"label"` // e.g., "Last Hour", "Last 24 Hours"
}

// Validate validates the TimeWindow configuration.
func (tw *TimeWindow) Validate() error {
	if tw.File == "" {
		return errors.New("time window file is required")
	}
	if _, err := tw.GetStepDuration(); err != nil {
		return fmt.Errorf("invalid step duration for window %s: %w", tw.File, err)
	}
	if _, err := tw.GetRangeDuration(); err != nil {
		return fmt.Errorf("invalid range duration for window %s: %w", tw.File, err)
	}
	return nil
}

// GetStepDuration parses the step duration string.
func (tw *TimeWindow) GetStepDuration() (time.Duration, error) {
	return time.ParseDuration(tw.Step)
}

// GetRangeDuration parses the range duration string.
func (tw *TimeWindow) GetRangeDuration() (time.Duration, error) {
	return time.ParseDuration(tw.Range)
}

// GetTimeRange calculates the start and end time for the window based on the current time.
func (tw *TimeWindow) GetTimeRange(now time.Time) (time.Time, time.Time, error) {
	rangeDuration, err := tw.GetRangeDuration()
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	// Range is typically negative, so adding it goes back in time.
	startTime := now.Add(rangeDuration)
	endTime := now
	return startTime, endTime, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.Enabled != nil && !*c.Enabled {
		return nil
	}

	if c.RedisKeyPrefix == "" {
		return errors.New("redis_key_prefix is required")
	}

	if _, err := c.GetInterval(); err != nil {
		return fmt.Errorf("invalid interval: %w", err)
	}

	if len(c.TimeWindows) == 0 {
		return errors.New("at least one time_window must be defined")
	}
	for i := range c.TimeWindows {
		if err := c.TimeWindows[i].Validate(); err != nil {
			return fmt.Errorf("invalid time_window configuration: %w", err)
		}
	}

	return nil
}

// GetInterval parses the main processing interval duration string.
func (c *Config) GetInterval() (time.Duration, error) {
	if c.Interval == "" {
		// Default interval if not specified
		return 15 * time.Minute, nil
	}
	return time.ParseDuration(c.Interval)
}
