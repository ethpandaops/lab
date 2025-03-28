package discovery

import (
	"fmt"
	"os"
	"strconv"
	"sync"

	"github.com/sirupsen/logrus"
)

// Client represents a service discovery client
type Client struct {
	log            logrus.FieldLogger
	servicesMutex  sync.RWMutex
	servicesByName map[string]*ServiceEntry
}

// ServiceEntry represents a service entry
type ServiceEntry struct {
	Name    string
	Address string
	Port    int
	Type    string
}

// Config contains configuration for the service discovery client
type Config struct {
	Services []ServiceConfig
}

// ServiceConfig contains configuration for a service entry
type ServiceConfig struct {
	Name    string
	EnvVar  string
	Default string
	Type    string
}

// New creates a new service discovery client
func New(log logrus.FieldLogger) (*Client, error) {
	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	return &Client{
		log:            log,
		servicesByName: make(map[string]*ServiceEntry),
	}, nil
}

// RegisterService registers a service with the service discovery client
func (c *Client) RegisterService(name, address string, port int, serviceType string) {
	c.servicesMutex.Lock()
	defer c.servicesMutex.Unlock()

	c.servicesByName[name] = &ServiceEntry{
		Name:    name,
		Address: address,
		Port:    port,
		Type:    serviceType,
	}

	c.log.WithField("name", name).
		WithField("address", address).
		WithField("port", port).
		WithField("type", serviceType).
		Info("Registered service")
}

// GetService gets a service by name
func (c *Client) GetService(name string) (*ServiceEntry, error) {
	c.servicesMutex.RLock()
	defer c.servicesMutex.RUnlock()

	service, ok := c.servicesByName[name]
	if !ok {
		return nil, fmt.Errorf("service not found: %s", name)
	}

	return service, nil
}

// LoadFromConfig loads services from configuration
func (c *Client) LoadFromConfig(cfg *Config) error {
	if cfg == nil {
		return nil
	}

	for _, service := range cfg.Services {
		address := ""
		port := 0

		// Try to get address and port from environment variable
		if service.EnvVar != "" {
			envValue := os.Getenv(service.EnvVar)
			if envValue != "" {
				// Parse host:port format
				var host string
				_, err := fmt.Sscanf(envValue, "%s:%d", &host, &port)
				if err != nil {
					c.log.WithField("name", service.Name).
						WithField("env_var", service.EnvVar).
						WithField("value", envValue).
						WithError(err).
						Warn("Failed to parse environment variable, using default")

					address = service.Default
				} else {
					address = host
				}
			}
		}

		// Use default if environment variable is not set or invalid
		if address == "" && service.Default != "" {
			address = service.Default
			// Parse host:port format if needed
			if port == 0 {
				var host string
				_, err := fmt.Sscanf(service.Default, "%s:%d", &host, &port)
				if err == nil {
					address = host
				}
			}
		}

		// Register service if address is set
		if address != "" {
			c.RegisterService(service.Name, address, port, service.Type)
		}
	}

	return nil
}

// ListServices lists all services
func (c *Client) ListServices() []*ServiceEntry {
	c.servicesMutex.RLock()
	defer c.servicesMutex.RUnlock()

	services := make([]*ServiceEntry, 0, len(c.servicesByName))
	for _, service := range c.servicesByName {
		services = append(services, service)
	}

	return services
}

// GetSRVGRPCAddress returns the full gRPC address for the SRV service
func (c *Client) GetSRVGRPCAddress() (string, error) {
	srvService, err := c.GetService("srv")
	if err != nil {
		return "", fmt.Errorf("failed to get SRV service: %w", err)
	}

	if srvService.Port == 0 {
		return "", fmt.Errorf("SRV service port is not set")
	}

	return fmt.Sprintf("%s:%d", srvService.Address, srvService.Port), nil
}

// GetSRVGRPCAddressString returns the gRPC address for the SRV service as a string
func (c *Client) GetSRVGRPCAddressString() (string, error) {
	return c.GetSRVGRPCAddress()
}

// GetAPIRESTAddress returns the REST API address for the API service
func (c *Client) GetAPIRESTAddress() (string, int, error) {
	host := os.Getenv("LAB_API_REST_HOST")
	if host == "" {
		host = "localhost" // Default host
	}

	portStr := os.Getenv("LAB_API_REST_PORT")
	if portStr == "" {
		portStr = "8080" // Default port
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return "", 0, fmt.Errorf("failed to parse API REST port: %w", err)
	}

	c.log.WithField("host", host).WithField("port", port).Debug("Discovered API REST address")

	return host, port, nil
}

// GetAPIRESTAddressString returns the REST API address for the API service as a string
func (c *Client) GetAPIRESTAddressString() (string, error) {
	host, port, err := c.GetAPIRESTAddress()
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s:%d", host, port), nil
}
