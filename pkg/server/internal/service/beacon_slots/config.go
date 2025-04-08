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

// BackfillConfig represents configuration for backlog processing
type BackfillConfig struct {
	Enabled  bool  `yaml:"enabled"`
	SlotsAgo int64 `yaml:"slots_ago"`
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if !c.Enabled {
		return nil
	}

	if len(c.Networks) == 0 {
		return fmt.Errorf("no networks specified")
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
			Enabled:  c.Backfill.Enabled,
			SlotsAgo: c.Backfill.SlotsAgo,
		},
	}
}

// FromProtoConfig creates an internal config from a proto config
func FromProtoConfig(pbConfig *pb.Config) *Config {
	return &Config{
		Enabled:  pbConfig.Enabled,
		Networks: pbConfig.Networks,
		Backfill: BackfillConfig{
			Enabled:  pbConfig.Backfill.Enabled,
			SlotsAgo: pbConfig.Backfill.SlotsAgo,
		},
	}
}

// Note: ToProtoConfig and FromProtoConfig will be implemented after
// the proto package is generated correctly
