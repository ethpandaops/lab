package api

import (
	"github.com/ethpandaops/lab/pkg/internal/lab/broker"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/discovery"
)

// Config contains the configuration for the API service
type Config struct {
	HttpServer HttpServerConfig  `yaml:"httpServer"`
	Discovery  *discovery.Config `yaml:"discovery"`
	Broker     *broker.Config    `yaml:"broker"` // Renamed from NATS
	Cache      *cache.Config     `yaml:"cache"`
}

// HttpServerConfig contains the configuration for the HTTP server
type HttpServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}
