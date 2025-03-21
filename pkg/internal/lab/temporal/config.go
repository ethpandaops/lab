package temporal

import "fmt"

// Config contains configuration for Temporal
type Config struct {
	Address   string `yaml:"address"`
	Namespace string `yaml:"namespace"`
	TaskQueue string `yaml:"taskQueue"`
}

func (c *Config) Validate() error {
	if c.Address == "" {
		return fmt.Errorf("address is required")
	}

	return nil
}
