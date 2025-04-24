package beacon_chain_timings

import (
	"fmt"
	"time"
)

type Config struct {
	Enabled     *bool        `yaml:"enabled" default:"true"`
	TimeWindows []TimeWindow `yaml:"time_windows"`
	Interval    string       `yaml:"interval"`
}

func (c *Config) GetIntervalDuration() time.Duration {
	return parseDuration(c.Interval)
}

type TimeWindow struct {
	File  string
	Step  string
	Label string
	Range string
}

func (tw *TimeWindow) GetStepDuration() time.Duration {
	return parseDuration(tw.Step)
}

func (tw *TimeWindow) GetRangeDuration() time.Duration {
	return parseDuration(tw.Range)
}

func parseDuration(s string) time.Duration {
	unit := s[len(s)-1:]
	value := s[:len(s)-1]

	var multiplier time.Duration

	switch unit {
	case "s":
		multiplier = time.Second
	case "m":
		multiplier = time.Minute
	case "h":
		multiplier = time.Hour
	case "d":
		multiplier = time.Hour * 24
	default:
		return 0
	}

	val := 0

	_, err := fmt.Sscanf(value, "%d", &val)
	if err != nil {
		return 0
	}

	return time.Duration(val) * multiplier
}
