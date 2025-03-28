package xatu_public_contributors

import (
	"fmt"
	"time"
)

// Config represents the configuration for the xatu_public_contributors module
type Config struct {
	Enabled     bool          `yaml:"enabled"`
	Networks    []string      `yaml:"networks"`
	Interval    string        `yaml:"interval"`
	TimeWindows []TimeWindow  `yaml:"time_windows"`
	interval    time.Duration // parsed interval
}

// TimeWindow represents a time window configuration
type TimeWindow struct {
	File  string `yaml:"file"`
	Step  string `yaml:"step"`
	Label string `yaml:"label"`
	Range string `yaml:"range"`
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if len(c.Networks) == 0 {
		return fmt.Errorf("no networks specified")
	}

	// Parse interval
	var err error
	c.interval, err = time.ParseDuration(c.Interval)
	if err != nil {
		return fmt.Errorf("invalid interval: %w", err)
	}

	// Validate time windows
	for i, window := range c.TimeWindows {
		if window.File == "" {
			return fmt.Errorf("time window %d: file is required", i)
		}
		if window.Step == "" {
			return fmt.Errorf("time window %d: step is required", i)
		}
		if window.Label == "" {
			return fmt.Errorf("time window %d: label is required", i)
		}
		if window.Range == "" {
			return fmt.Errorf("time window %d: range is required", i)
		}

		// Validate step and range formats
		_, err := time.ParseDuration(window.Step)
		if err != nil {
			return fmt.Errorf("time window %d: invalid step: %w", i, err)
		}

		// Range is a bit special since it can be like "-90d", we'll just check the format
		if len(window.Range) < 2 || window.Range[0] != '-' {
			return fmt.Errorf("time window %d: range must start with '-'", i)
		}
	}

	return nil
}

// GetInterval returns the parsed interval
func (c *Config) GetInterval() time.Duration {
	return c.interval
}

// GetTimeRange returns the time range for a window
func (w *TimeWindow) GetTimeRange(now time.Time) (time.Time, time.Time) {
	end := now

	// Parse range (like "-90d")
	valueStr := w.Range[1 : len(w.Range)-1]
	unit := w.Range[len(w.Range)-1:]

	var value int
	_, err := fmt.Sscanf(valueStr, "%d", &value)
	if err != nil {
		return end, end
	}

	var start time.Time
	switch unit {
	case "d":
		start = end.AddDate(0, 0, -value)
	case "h":
		start = end.Add(-time.Hour * time.Duration(value))
	default:
		start = end
	}

	return start, end
}

// GetStepDuration returns the step duration
func (w *TimeWindow) GetStepDuration() (time.Duration, error) {
	return time.ParseDuration(w.Step)
}
