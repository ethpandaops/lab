package storage

import "fmt"

// Config contains configuration for storage
type Config struct {
	Endpoint     string `yaml:"endpoint"`
	Region       string `yaml:"region"`
	AccessKey    string `yaml:"accessKey"`
	SecretKey    string `yaml:"secretKey"`
	Bucket       string `yaml:"bucket"`
	Secure       bool   `yaml:"secure"`
	UsePathStyle bool   `yaml:"usePathStyle"`
}

func (c *Config) Validate() error {
	if c.Endpoint == "" {
		return fmt.Errorf("endpoint is required")
	}

	if c.Bucket == "" {
		return fmt.Errorf("bucket is required")
	}

	return nil
}
