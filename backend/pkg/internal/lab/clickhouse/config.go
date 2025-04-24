package clickhouse

import "fmt"

type Config struct {
	// DSN is the data source name for ClickHouse in the format:
	// clickhouse+http://username:password@host:port/database?protocol=https
	DSN string `yaml:"dsn"`
	// InsecureSkipVerify allows skipping TLS certificate verification. Use with caution.
	InsecureSkipVerify bool `yaml:"insecure_skip_verify,omitempty"`
	// Protocol specifies the connection protocol ("native" or "http"). Overrides DSN scheme if set.
	Protocol string `yaml:"protocol,omitempty"`
}

func (c *Config) Validate() error {
	if c.DSN == "" {
		return fmt.Errorf("dsn is required")
	}

	return nil
}
