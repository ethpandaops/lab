package api

import (
	"github.com/ethpandaops/lab/pkg/internal/lab/broker"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
)

// Config contains the configuration for the API service
type Config struct {
	LogLevel   string           `yaml:"logLevel" default:"info"`
	HttpServer HttpServerConfig `yaml:"httpServer"`
	Broker     *broker.Config   `yaml:"broker"` // Renamed from NATS
	Cache      *cache.Config    `yaml:"cache"`
	Storage    *storage.Config  `yaml:"storage"`
	SrvClient  *SrvClientConfig `yaml:"srvClient"`
	Discovery  DiscoveryConfig  `yaml:"discovery"`
}

type DiscoveryConfig struct {
	Type   string            `yaml:"type"`
	Static map[string]string `yaml:"static"`
}

type SrvClientConfig struct {
	Address string `yaml:"address"`
}

// HttpServerConfig contains the configuration for the HTTP server
type HttpServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}
