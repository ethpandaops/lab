package geolocation

// Config contains configuration for the geolocation client
type Config struct {
	Enabled *bool `yaml:"enabled" default:"false"`
	// Optional URL override for the cities database
	DatabaseLocation string `yaml:"databaseLocation" default:""`
}

// Validate checks if the config is valid
func (c *Config) Validate() error {
	if c.Enabled != nil && !*c.Enabled {
		return nil
	}

	return nil
}
