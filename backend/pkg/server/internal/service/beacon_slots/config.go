package beacon_slots

import (
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
)

// Config represents the configuration for the beacon_slots module
type Config struct {
	Enabled                  bool                     `yaml:"enabled" default:"true"`
	Backfill                 BackfillConfig           `yaml:"backfill" default:"{\"enabled\":true,\"slots\":1000}"`
	HeadDelaySlots           phase0.Slot              `yaml:"head_delay_slots" default:"2"`
	LocallyBuiltBlocksConfig LocallyBuiltBlocksConfig `yaml:"locally_built_blocks" default:"{\"max_slots\":16,\"ttl\":\"6h\"}"`
}

// BackfillConfig represents configuration for backlog and middle processing
type BackfillConfig struct {
	Enabled bool  `yaml:"enabled" default:"true"`
	Slots   int64 `yaml:"slots" default:"1000"`
}

// LocallyBuiltBlocksConfig represents configuration for the locally built blocks feature
type LocallyBuiltBlocksConfig struct {
	Enabled *bool         `yaml:"enabled" default:"true"`
	Slots   int           `yaml:"slots" default:"16"`
	TTL     time.Duration `yaml:"ttl" default:"6h"`
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if !c.Enabled {
		return nil
	}

	return nil
}
