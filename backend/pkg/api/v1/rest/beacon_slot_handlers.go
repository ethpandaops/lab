package rest

import (
	"net/http"
	"strconv"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
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

	// Parse and validate slot number
	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse query parameters
	queryParams := req.URL.Query()

	// Build gRPC request with required slot filter
	grpcReq := &cbtproto.ListFctBlockFirstSeenByNodeRequest{
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

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctBlockFirstSeenByNode(ctxWithMeta, grpcReq)
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to public API types
	nodes := make([]*apiv1.BlockTimingNode, 0, len(grpcResp.FctBlockFirstSeenByNode))

	for _, n := range grpcResp.FctBlockFirstSeenByNode {
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

	// Write response
	r.WriteJSONResponseOK(w, req, &apiv1.BlockTimingResponse{
		Nodes: nodes,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	})
}
