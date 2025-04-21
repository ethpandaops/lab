package api

import (
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
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
