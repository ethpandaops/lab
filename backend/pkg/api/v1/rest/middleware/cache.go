package middleware

import (
	"fmt"
	"net/http"
	"time"
)

// CacheConfig defines caching behavior for a route
type CacheConfig struct {
	// MaxAge is the browser cache duration (Cache-Control: max-age)
	MaxAge time.Duration
	// SMaxAge is the CDN cache duration (Cache-Control: s-maxage)
	SMaxAge time.Duration
	// StaleWhileRevalidate allows serving stale content while fetching fresh
	StaleWhileRevalidate time.Duration
	// NoCache disables caching entirely
	NoCache bool
	// Private marks the response as private (user-specific)
	Private bool
}

// Common cache configurations that can be reused
var (
	// CacheRealtime for real-time data that changes frequently
	CacheRealtime = CacheConfig{
		MaxAge:               30 * time.Second,
		SMaxAge:              45 * time.Second,
		StaleWhileRevalidate: 30 * time.Second,
	}
	// CacheNearRealtime for data that updates every few minutes
	CacheNearRealtime = CacheConfig{
		MaxAge:               2 * time.Minute,
		SMaxAge:              5 * time.Minute,
		StaleWhileRevalidate: 1 * time.Minute,
	}
	// CacheConfigEndpoint for configuration endpoints that change infrequently
	CacheConfigEndpoint = CacheConfig{
		MaxAge:               1 * time.Minute,
		SMaxAge:              5 * time.Minute,
		StaleWhileRevalidate: 30 * time.Second,
	}
	// CachePrivate for user-specific data
	CachePrivate = CacheConfig{
		Private: true,
		MaxAge:  30 * time.Second,
	}
	// CacheNone disables caching
	CacheNone = CacheConfig{
		NoCache: true,
	}
)

// WithCaching wraps a handler with cache header middleware
func WithCaching(handler http.HandlerFunc, cache CacheConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		// Handle CORS preflight first
		if req.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)

			return
		}

		// Set cache headers before calling the handler
		SetCacheHeaders(w, cache)

		// Call the actual handler
		handler(w, req)
	}
}

// SetCacheHeaders applies cache configuration to the response
func SetCacheHeaders(w http.ResponseWriter, cache CacheConfig) {
	// Always set Vary header for proper CDN caching
	w.Header().Set("Vary", "Accept-Encoding")

	if cache.NoCache {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")

		return
	}

	// Build Cache-Control header
	var directives []string

	if cache.Private {
		directives = append(directives, "private")
	} else {
		directives = append(directives, "public")
	}

	if cache.MaxAge > 0 {
		directives = append(directives, fmt.Sprintf("max-age=%d", int(cache.MaxAge.Seconds())))
	}

	if cache.SMaxAge > 0 {
		directives = append(directives, fmt.Sprintf("s-maxage=%d", int(cache.SMaxAge.Seconds())))
	}

	if cache.StaleWhileRevalidate > 0 {
		directives = append(directives, fmt.Sprintf("stale-while-revalidate=%d", int(cache.StaleWhileRevalidate.Seconds())))
	}

	// Join directives and set header
	if len(directives) > 0 {
		cacheControl := ""

		for i, d := range directives {
			if i > 0 {
				cacheControl += ", "
			}

			cacheControl += d
		}

		w.Header().Set("Cache-Control", cacheControl)
	}
}
