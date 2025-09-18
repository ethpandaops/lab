package rest

import (
	"encoding/json"
	"net/http"
	"strconv"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
)

// handleBeaconBlockTiming handles GET /api/v1/{network}/beacon/slot/{slot}/block/timing
func (r *PublicRouter) handleBeaconBlockTiming(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
		slotStr = vars["slot"]
	)

	// Handle CORS preflight.
	if req.Method == methodOptions {
		w.WriteHeader(http.StatusOK)

		return
	}

	// Parse and validate slot number
	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.writeError(w, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Validate network
	if network == "" {
		r.writeError(w, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse query parameters
	queryParams := req.URL.Query()

	// Build gRPC request with required slot filter
	grpcReq := &cbtproto.ListIntBlockFirstSeenByNodeRequest{
		// Set slot filter to get data for specific slot
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply optional filters from query parameters
	if v := queryParams.Get("node_id"); v != "" {
		grpcReq.NodeId = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("username"); v != "" {
		grpcReq.Username = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	// Pagination
	if v := queryParams.Get("page_size"); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get("page_token"); v != "" {
		grpcReq.PageToken = v
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
	}).Debug("REST v1: BeaconBlockTiming")

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListIntBlockFirstSeenByNode(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to get block timing")
		r.handleError(w, err)

		return
	}

	// Transform CBT types to public API types
	nodes := make([]*apiv1.BlockTimingNode, 0, len(grpcResp.IntBlockFirstSeenByNode))

	for _, n := range grpcResp.IntBlockFirstSeenByNode {
		nodes = append(nodes, &apiv1.BlockTimingNode{
			NodeId:     n.NodeId,
			Username:   n.Username,
			SeenDiffMs: int64(n.SeenSlotStartDiff),
			Geo: &apiv1.GeoInfo{
				City:          n.MetaClientGeoCity,
				Country:       n.MetaClientGeoCountry,
				CountryCode:   n.MetaClientGeoCountryCode,
				ContinentCode: n.MetaClientGeoContinentCode,
			},
			Client: &apiv1.ClientInfo{
				Name:           n.MetaClientName,
				Version:        n.MetaClientVersion,
				Implementation: n.MetaClientImplementation,
			},
		})
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if v[0] != "" && k != "page_size" && k != "page_token" {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.BlockTimingResponse{
		Nodes: nodes,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	}

	// Set headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Vary", "Accept-Encoding")

	// Cache headers optimized for block timing data
	// max-age=30: Browser cache for 30 seconds
	// s-maxage=45: CDN cache slightly longer
	// stale-while-revalidate=30: Serve stale content while fetching updates
	w.Header().Set("Cache-Control", "public, max-age=30, s-maxage=45, stale-while-revalidate=30")

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode block timing response")
	}
}
