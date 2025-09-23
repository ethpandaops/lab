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
			Cache:       middleware.CacheBrowserShort,
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
			Path:        "/{network}/beacon/slot/{slot}/block",
			Handler:     r.handleBeaconBlock,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get beacon block data for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/block/timing",
			Handler:     r.handleBeaconBlockTiming,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get block timing data for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/attestation/timing",
			Handler:     r.handleBeaconAttestationTiming,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get attestation timing data in 50ms chunks for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/attestation/correctness",
			Handler:     r.handleBeaconAttestationCorrectness,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get attestation correctness data for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/blob/total",
			Handler:     r.handleBeaconBlobTotal,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get total blob count for blocks in a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/blob/timing",
			Handler:     r.handleBeaconBlobTiming,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get blob timing data for a specific slot",
		},

		// MEV endpoints
		{
			Path:        "/{network}/beacon/slot/{slot}/mev",
			Handler:     r.handleMevBlock,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get MEV block data for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/mev/relay",
			Handler:     r.handleMevRelayBidCount,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get MEV relay bid count statistics for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/mev/builder",
			Handler:     r.handleMevBuilderBid,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get highest MEV bid values by builder for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/proposer/entity",
			Handler:     r.handleBeaconSlotProposerEntity,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get block proposer entity information for a specific slot",
		},
	}
}
