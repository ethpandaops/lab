package api

import (
	"github.com/ethpandaops/lab/pkg/internal/lab/broker"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
)

// Config contains the configuration for the API service
type Config struct {
	HttpServer        HttpServerConfig `yaml:"httpServer"`
	Broker            *broker.Config   `yaml:"broker"` // Renamed from NATS
	Cache             *cache.Config    `yaml:"cache"`
	EnableGRPCGateway bool             `yaml:"enableGRPCGateway"`
	Gateway           *GatewayConfig   `yaml:"gateway"`
	SrvClient         *SrvClientConfig `yaml:"srvClient"`
}

type SrvClientConfig struct {
	Address string `yaml:"address"`
}

// HttpServerConfig contains the configuration for the HTTP server
type HttpServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}
