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
		{
			Path:        "/{network}/experiments/{experimentId}/config",
			Handler:     r.handleNetworkExperimentConfig,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheBrowserShort,
			Description: "Get experiment configuration for specific network",
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
			Path:        "/{network}/beacon/slot/{slot}/mev/deployed",
			Handler:     r.handleMevBlock,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get MEV block data for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/mev/relay/count",
			Handler:     r.handleMevRelayBidCount,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get MEV relay bid count statistics for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/mev/builder/bid",
			Handler:     r.handleMevBuilderBid,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get highest MEV bid values by builder for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/mev/builder/count",
			Handler:     r.handleMevBuilderBidCount,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get MEV builder bid count statistics for a specific slot",
		},
		{
			Path:        "/{network}/beacon/slot/{slot}/proposer/entity",
			Handler:     r.handleBeaconSlotProposerEntity,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime, // Real-time data for recent slots
			Description: "Get block proposer entity information for a specific slot",
		},
		// Prepared block endpoints
		{
			Path:        "/{network}/prepared/blocks",
			Handler:     r.handleListPreparedBlocks,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime,
			Description: "List prepared blocks showing what would have been built",
		},
		{
			Path:        "/{network}/prepared/blocks/{slot}",
			Handler:     r.handlePreparedBlockBySlot,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheRealtime,
			Description: "Get prepared blocks for a specific slot",
		},

		// State expiry endpoints
		{
			Path:        "/{network}/state-expiry/access/history",
			Handler:     r.handleStateExpiryAccessHistory,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheNearRealtime,
			Description: "Get address access history chunked by 10000 blocks for state expiry analysis",
		},
		{
			Path:        "/{network}/state-expiry/storage/history",
			Handler:     r.handleStateExpiryStorageHistory,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheNearRealtime,
			Description: "Get storage slot history chunked by 10000 blocks for state expiry analysis",
		},
		{
			Path:        "/{network}/state-expiry/access/total",
			Handler:     r.handleStateExpiryAccessTotal,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheNearRealtime,
			Description: "Get total address access statistics for state expiry analysis",
		},
		{
			Path:        "/{network}/state-expiry/storage/expired/top",
			Handler:     r.handleStateExpiryStorageExpiredTop,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheNearRealtime,
			Description: "Get top 100 contracts by expired storage slots for state expiry analysis",
		},
		{
			Path:        "/{network}/state-expiry/storage/top",
			Handler:     r.handleStateExpiryStorageTop,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheNearRealtime,
			Description: "Get top 100 contracts by total storage slots for state expiry analysis",
		},
		{
			Path:        "/{network}/state-expiry/storage/total",
			Handler:     r.handleStateExpiryStorageTotal,
			Methods:     []string{http.MethodGet, http.MethodOptions},
			Cache:       middleware.CacheNearRealtime,
			Description: "Get total storage slot statistics for state expiry analysis",
		},
	}
}
