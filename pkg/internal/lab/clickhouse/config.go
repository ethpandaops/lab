package clickhouse

import "fmt"

type Config struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Database string `yaml:"database"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	Secure   bool   `yaml:"secure"`
}

func (c *Config) Validate() error {
	if c.Host == "" {
		return fmt.Errorf("host is required")
	}

	return nil
}
