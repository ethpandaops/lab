package cartographoor

import (
	"fmt"
	"net/http"
	"time"
)

const defaultCartographoorURL = "https://ethpandaops-platform-production-cartographoor.ams3.cdn.digitaloceanspaces.com/networks.json"

// Config holds the configuration for the cartographoor service
type Config struct {
	SourceURL       string        `yaml:"source_url"`
	RefreshInterval time.Duration `yaml:"refresh_interval"`
	RequestTimeout  time.Duration `yaml:"request_timeout"`
	CacheTTL        time.Duration `yaml:"cache_ttl"`
}

// Validate validates the configuration and sets defaults
func (c *Config) Validate() error {
	// Default to known cartographoor URL if not specified.
	if c.SourceURL == "" {
		c.SourceURL = defaultCartographoorURL
	}

	if c.RefreshInterval == 0 {
		c.RefreshInterval = 1 * time.Hour
	}

	if c.RequestTimeout == 0 {
		c.RequestTimeout = 30 * time.Second
	}

	if c.CacheTTL == 0 {
		c.CacheTTL = 10 * time.Minute
	}

	// Validate that intervals make sense
	if c.RefreshInterval < 1*time.Minute {
		return fmt.Errorf("refresh_interval must be at least 1 minute")
	}

	if c.RequestTimeout < 1*time.Second {
		return fmt.Errorf("request_timeout must be at least 1 second")
	}

	if c.CacheTTL < 1*time.Second {
		return fmt.Errorf("cache_ttl must be at least 1 second")
	}

	return nil
}

// HTTPClient creates an HTTP client configured with the request timeout
func (c *Config) HTTPClient() *http.Client {
	return &http.Client{
		Timeout: c.RequestTimeout,
	}
}
