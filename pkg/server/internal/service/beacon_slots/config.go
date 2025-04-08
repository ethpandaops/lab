package beacon_slots

import (
	"fmt"
	"time"

	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
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

// ToProtoConfig converts the internal config to proto config
func (c *Config) ToProtoConfig() *pb.Config {
	return &pb.Config{
		Enabled:  c.Enabled,
		Networks: c.Networks,
		Backfill: &pb.BackfillConfig{
			Enabled:                 c.Backfill.Enabled,
			SlotsAgo:                c.Backfill.SlotsAgo,
			MiddleProcessorEnable:   c.Backfill.MiddleProcessorEnable,
			MiddleProcessorDuration: c.Backfill.MiddleProcessorDuration.String(), // Store duration as string in proto
		},
	}
}

// FromProtoConfig creates an internal config from a proto config
func FromProtoConfig(pbConfig *pb.Config) *Config {
	return &Config{
		Enabled:  pbConfig.Enabled,
		Networks: pbConfig.Networks,
		Backfill: BackfillConfig{
			Enabled:               pbConfig.Backfill.Enabled,
			SlotsAgo:              pbConfig.Backfill.SlotsAgo,
			MiddleProcessorEnable: pbConfig.Backfill.MiddleProcessorEnable,
			// Parse duration from string, handle potential error
			MiddleProcessorDuration: parseDurationDef(pbConfig.Backfill.MiddleProcessorDuration, 1*time.Hour),
		},
	}
}

// Note: ToProtoConfig and FromProtoConfig will be implemented after
// the proto package is generated correctly

// parseDurationDef parses a duration string with a default value
func parseDurationDef(durationStr string, defaultVal time.Duration) time.Duration {
	if durationStr == "" {
		return defaultVal
	}
	d, err := time.ParseDuration(durationStr)
	if err != nil {
		// Log error or handle appropriately, return default for now
		fmt.Printf("Error parsing duration '%s': %v. Using default: %v\n", durationStr, err, defaultVal)
		return defaultVal
	}
	return d
}
