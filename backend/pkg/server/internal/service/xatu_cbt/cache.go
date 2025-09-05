package xatu_cbt

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"
)

// tryCache attempts to retrieve and unmarshal data from cache.
// Returns (found, error) where found indicates if cache hit occurred.
//
//nolint:nilerr // intentional - cache errors are treated as misses.
func (x *XatuCBT) tryCache(cacheKey string, result interface{}) (bool, error) {
	if x.cacheClient == nil || cacheKey == "" {
		return false, nil
	}

	cachedData, err := x.cacheClient.Get(cacheKey)
	if err != nil || cachedData == nil {
		return false, nil
	}

	if err := json.Unmarshal(cachedData, result); err != nil {
		x.log.WithError(err).Warn("Failed to unmarshal cached data")

		return false, nil
	}

	return true, nil
}

// storeInCache stores a response in the cache.
func (x *XatuCBT) storeInCache(key string, value interface{}, ttl time.Duration) {
	if x.cacheClient == nil {
		return
	}

	data, err := json.Marshal(value)
	if err != nil {
		x.log.WithError(err).Warn("Failed to marshal data for cache")

		return
	}

	if err := x.cacheClient.Set(key, data, ttl); err != nil {
		x.log.WithError(err).Warn("Failed to store in cache")
	}
}

// generateCacheKey creates a cache key based on request parameters.
func (x *XatuCBT) generateCacheKey(table, network string, req interface{}) string {
	// Hash the request parameters to create a unique cache key.
	reqBytes, _ := json.Marshal(req)
	hash := fmt.Sprintf("%x", sha256.Sum256(reqBytes))

	return fmt.Sprintf("cbt:%s:%s:%s", table, network, hash[:16])
}
