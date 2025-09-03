package xatu_cbt

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt/queries"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/prometheus/client_golang/prometheus"
)

// ListXatuNodes returns the list of xatu nodes in the last 24h
func (x *XatuCBT) ListXatuNodes(ctx context.Context, req *pb.ListXatuNodesRequest) (*pb.ListXatuNodesResponse, error) {
	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues("ListXatuNodes", req.Network))
	defer timer.ObserveDuration()

	// Validate request
	if req.Network == "" {
		x.requestsTotal.WithLabelValues("ListXatuNodes", "", "error").Inc()

		return nil, fmt.Errorf("network is required")
	}

	// Check if network is configured
	client, ok := x.cbtClients[req.Network]
	if !ok {
		x.requestsTotal.WithLabelValues("ListXatuNodes", req.Network, "error").Inc()

		return nil, fmt.Errorf("network %s not configured", req.Network)
	}

	// Check cache first
	var cacheKey string
	if x.cacheClient != nil {
		cacheKey = fmt.Sprintf("cbt:xatu_nodes:%s", req.Network)

		cachedData, err := x.cacheClient.Get(cacheKey)
		if err == nil && cachedData != nil {
			var cachedResp pb.ListXatuNodesResponse
			if err := json.Unmarshal(cachedData, &cachedResp); err == nil {
				x.cacheHitsTotal.WithLabelValues("ListXatuNodes", req.Network).Inc()
				x.requestsTotal.WithLabelValues("ListXatuNodes", req.Network, "success").Inc()

				return &cachedResp, nil
			}
		}

		x.cacheMissesTotal.WithLabelValues("ListXatuNodes", req.Network).Inc()
	}

	// Query database using extracted query and direct scanning
	queryTemplate := queries.GetXatuNodeQueries()[queries.TableIntXatuNodes24h]

	xatuNodes, err := queries.ScanXatuNodes(ctx, client, queryTemplate)
	if err != nil {
		x.requestsTotal.WithLabelValues("ListXatuNodes", req.Network, "error").Inc()

		return nil, fmt.Errorf("failed to query xatu nodes: %w", err)
	}

	response := &pb.ListXatuNodesResponse{
		XatuNodes: xatuNodes,
	}

	// Store in cache
	if x.cacheClient != nil {
		x.storeInCache(cacheKey, response, x.config.CacheTTL)
	}

	x.requestsTotal.WithLabelValues("ListXatuNodes", req.Network, "success").Inc()

	return response, nil
}
