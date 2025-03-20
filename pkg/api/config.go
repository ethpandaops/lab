package api

// Config contains the configuration for the API service
type Config struct {
	Server    ServerConfig    `yaml:"server"`
	SrvClient SrvClientConfig `yaml:"srv_client"`
	Broker    BrokerConfig    `yaml:"broker"` // Renamed from NATS
	Cache     CacheConfig     `yaml:"cache"`
}

// ServerConfig contains the configuration for the HTTP server
type ServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

// SrvClientConfig contains the configuration for the gRPC client to srv service
type SrvClientConfig struct {
	Address string `yaml:"address"`
}

// BrokerConfig contains the configuration for the message broker
type BrokerConfig struct {
	URL     string `yaml:"url"`
	Subject string `yaml:"subject"`
}

// CacheConfig contains the configuration for the cache
type CacheConfig struct {
	Type     string `yaml:"type"`
	TTL      int    `yaml:"ttl"`
	RedisURL string `yaml:"redis_url,omitempty"`
}
