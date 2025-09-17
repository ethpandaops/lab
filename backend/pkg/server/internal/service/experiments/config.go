package experiments

import (
	"fmt"
)

// Config holds the configuration for the experiments service
type Config []ExperimentConfig

// ExperimentConfig represents a single experiment configuration
type ExperimentConfig struct {
	ID       string   `yaml:"id"`
	Enabled  bool     `yaml:"enabled"`
	Networks []string `yaml:"networks"`
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c == nil {
		return fmt.Errorf("experiments config is nil")
	}

	// Check for duplicate experiment IDs
	seen := make(map[string]bool)

	for i := range *c {
		exp := &(*c)[i]

		if exp.ID == "" {
			return fmt.Errorf("experiment ID cannot be empty")
		}

		if seen[exp.ID] {
			return fmt.Errorf("duplicate experiment ID: %s", exp.ID)
		}

		seen[exp.ID] = true
	}

	return nil
}
