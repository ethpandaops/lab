package api

import (
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
)

// Config contains the configuration for the API service
type Config struct {
	LogLevel   string           `yaml:"logLevel" default:"info"`
	HttpServer HttpServerConfig `yaml:"httpServer"`
	Cache      *cache.Config    `yaml:"cache"`
	Storage    *storage.Config  `yaml:"storage"`
	SrvClient  *SrvClientConfig `yaml:"srvClient"`
}

type SrvClientConfig struct {
	Address string `yaml:"address"`
	TLS     bool   `yaml:"tls"`
}

// HttpServerConfig contains the configuration for the HTTP server
type HttpServerConfig struct {
	Host           string   `yaml:"host"`
	Port           int      `yaml:"port"`
	PathPrefix     string   `yaml:"pathPrefix" default:"/lab-data"`
	CORSAllowAll   bool     `yaml:"corsAllowAll" default:"true"`
	AllowedOrigins []string `yaml:"allowedOrigins"`
}

// Validate validates the Config
func (c *Config) Validate() error {
	if c.SrvClient == nil {
		return fmt.Errorf("srvClient config is required")
	}

	if err := c.SrvClient.Validate(); err != nil {
		return fmt.Errorf("srvClient config is invalid: %w", err)
	}

	return nil
}

// Validate validates the SrvClientConfig
func (c *SrvClientConfig) Validate() error {
	if c.Address == "" {
		return fmt.Errorf("address is required")
	}

	return nil
}
