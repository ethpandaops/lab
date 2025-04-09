package discovery

import (
	"fmt"
)

// Discovery abstracts service discovery backends.
type Discovery interface {
	// GetServiceURL returns the URL for a given service name.
	// Returns an error if the service is not found.
	GetServiceURL(serviceName string) (string, error)
}

// StaticDiscovery is a static map-based implementation of Discovery.
type StaticDiscovery struct {
	services map[string]string
}

// NewStaticDiscovery creates a new StaticDiscovery with the provided service map.
func NewStaticDiscovery(serviceMap map[string]string) Discovery {
	return &StaticDiscovery{
		services: serviceMap,
	}
}

// GetServiceURL returns the URL for the given service name or an error if not found.
func (s *StaticDiscovery) GetServiceURL(serviceName string) (string, error) {
	url, ok := s.services[serviceName]
	if !ok {
		return "", fmt.Errorf("service %q not found", serviceName)
	}
	return url, nil
}
