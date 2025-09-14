package clickhouse

import (
	"fmt"
	"time"
)

// Config holds the configuration for the ClickHouse client.
type Config struct {
	// DSN is the data source name for ClickHouse in the format:
	// clickhouse+http://username:password@host:port/database
	// The protocol is auto-detected based on the port:
	// - Ports 9000/9440: Native protocol for direct ClickHouse connections.
	// - Other ports (443/8123/etc): HTTP/HTTPS protocol for proxy connections.
	DSN string `yaml:"dsn"`
	// ConnectionConfig holds all connection-related settings.
	ConnectionConfig ConnectionConfig `yaml:"connection,omitempty"`
}

// ConnectionConfig holds connection pool and timeout configuration.
type ConnectionConfig struct {
	// InsecureSkipVerify allows skipping TLS certificate verification.
	// Use with caution in production environments.
	// Default: false.
	InsecureSkipVerify bool `yaml:"insecure_skip_verify,omitempty"`
	// DialTimeout is the timeout for establishing a connection.
	// Default: 10s.
	DialTimeout time.Duration `yaml:"dial_timeout,omitempty"`
	// ReadTimeout is the timeout for reading from the connection.
	// Default: 30s.
	ReadTimeout time.Duration `yaml:"read_timeout,omitempty"`
	// WriteTimeout is the timeout for writing to the connection.
	// Default: 30s.
	WriteTimeout time.Duration `yaml:"write_timeout,omitempty"`
	// MaxExecutionTime is the maximum query execution time in seconds.
	// Default: 60.
	MaxExecutionTime int `yaml:"max_execution_time,omitempty"`
	// MaxOpenConns is the maximum number of open connections to the database.
	// Default: 10.
	MaxOpenConns int `yaml:"max_open_conns,omitempty"`
	// MaxIdleConns is the maximum number of idle connections in the pool.
	// Default: 5.
	MaxIdleConns int `yaml:"max_idle_conns,omitempty"`
	// ConnMaxLifetime is the maximum lifetime of a connection.
	// Default: 1h.
	ConnMaxLifetime time.Duration `yaml:"conn_max_lifetime,omitempty"`
}

// Validate validates the configuration and sets defaults.
func (c *Config) Validate() error {
	if c.DSN == "" {
		return fmt.Errorf("dsn is required")
	}

	// Set default connection configuration values.
	c.setDefaults()

	return nil
}

// setDefaults sets default values for connection configuration.
func (c *Config) setDefaults() {
	// Set timeout defaults.
	if c.ConnectionConfig.DialTimeout == 0 {
		c.ConnectionConfig.DialTimeout = 10 * time.Second
	}

	if c.ConnectionConfig.ReadTimeout == 0 {
		c.ConnectionConfig.ReadTimeout = 30 * time.Second
	}

	if c.ConnectionConfig.WriteTimeout == 0 {
		c.ConnectionConfig.WriteTimeout = 30 * time.Second
	}

	if c.ConnectionConfig.MaxExecutionTime == 0 {
		c.ConnectionConfig.MaxExecutionTime = 60
	}

	// Set connection pool defaults.
	if c.ConnectionConfig.MaxOpenConns == 0 {
		c.ConnectionConfig.MaxOpenConns = 10
	}

	if c.ConnectionConfig.MaxIdleConns == 0 {
		c.ConnectionConfig.MaxIdleConns = 5
	}

	if c.ConnectionConfig.ConnMaxLifetime == 0 {
		c.ConnectionConfig.ConnMaxLifetime = time.Hour
	}
}
