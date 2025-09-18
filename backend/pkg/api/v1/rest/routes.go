package rest

import (
	"net/http"

	"github.com/ethpandaops/lab/backend/pkg/api/v1/rest/middleware"
)

// RouteConfig defines configuration for a single route
type RouteConfig struct {
	// Path is the URL pattern (e.g., "/{network}/beacon/slot/{slot}/block/timing")
	Path string
	// Handler is the handler function for this route
	Handler http.HandlerFunc
	// Methods are the HTTP methods this route accepts
	Methods []string
	// Cache defines the caching strategy for this route
	Cache middleware.CacheConfig
	// Description provides documentation for this route
	Description string
}

// GetRoutes returns all route configurations for the API
func (r *PublicRouter) GetRoutes() []RouteConfig {
	return []RouteConfig{
		// Configuration endpoints
		{
			Path:        "/config",
			Handler:     r.handleConfig,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheConfigEndpoint,
			Description: "Get frontend configuration",
		},
		{
			Path:        "/experiments/{experimentId}/config",
			Handler:     r.handleExperimentConfig,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheConfigEndpoint,
			Description: "Get experiment-specific configuration",
		},

		// Node endpoints
		{
			Path:        "/{network}/nodes",
			Handler:     r.handleListNodes,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheNearRealtime,
			Description: "List nodes for a network",
		},

		// Beacon slot endpoints
		{
			Path:        "/{network}/beacon/slot/{slot}/block/timing",
			Handler:     r.handleBeaconBlockTiming,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get block timing data for a specific slot",
		},
	}
}
