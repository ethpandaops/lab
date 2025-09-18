package rest

import (
	"net/http"
	"strconv"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"google.golang.org/grpc/metadata"
)

// handleListNodes handles GET /api/v1/{network}/nodes with full filtering
func (r *PublicRouter) handleListNodes(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse query parameters and map to upstream proto fields.
	queryParams := req.URL.Query()

	// Build upstream gRPC request with all filtering capabilities.
	grpcReq := &cbtproto.ListFctNodeActiveLast24HRequest{}

	// Map of known string filter fields
	stringFilterFields := map[string]**cbtproto.StringFilter{
		"username":                       &grpcReq.Username,
		"node_id":                        &grpcReq.NodeId,
		"classification":                 &grpcReq.Classification,
		"meta_client_name":               &grpcReq.MetaClientName,
		"meta_client_version":            &grpcReq.MetaClientVersion,
		"meta_client_implementation":     &grpcReq.MetaClientImplementation,
		"meta_client_geo_city":           &grpcReq.MetaClientGeoCity,
		"meta_client_geo_country":        &grpcReq.MetaClientGeoCountry,
		"meta_client_geo_country_code":   &grpcReq.MetaClientGeoCountryCode,
		"meta_client_geo_continent_code": &grpcReq.MetaClientGeoContinentCode,
		"meta_consensus_version":         &grpcReq.MetaConsensusVersion,
		"meta_consensus_implementation":  &grpcReq.MetaConsensusImplementation,
	}

	// Process each query parameter
	for key, values := range queryParams {
		if len(values) == 0 || values[0] == "" {
			continue
		}

		// Parse the filter (handles bracket notation and defaults)
		filter, fieldName, err := parseStringFilter(key, values[0])
		if err != nil {
			r.WriteJSONResponseError(w, req, http.StatusBadRequest, err.Error())

			return
		}

		// Skip if no filter was created (empty value)
		if filter == nil {
			continue
		}

		// Apply filter to the appropriate field
		if fieldPtr, ok := stringFilterFields[fieldName]; ok {
			*fieldPtr = filter
		}
		// Non-filter parameters (page_size, page_token, etc.) handled separately below
	}

	// Time filter - handle various formats with UInt32Filter
	if v := queryParams.Get("last_seen_from"); v != "" {
		if timestamp, err := parseTimeParam(v); err == nil {
			grpcReq.LastSeenDateTime = &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Gte{Gte: uint32(timestamp)}, //nolint:gosec // safe.
			}
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

	// Ordering
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
	}

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service with upstream types directly
	upstreamResp, err := r.xatuCBTClient.ListFctNodeActiveLast24H(ctxWithMeta, grpcReq)
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform upstream response to v1 API response
	nodes := make([]*apiv1.Node, 0, len(upstreamResp.FctNodeActiveLast_24H))

	for _, n := range upstreamResp.FctNodeActiveLast_24H {
		nodes = append(nodes, &apiv1.Node{
			Username:       n.Username,
			NodeId:         n.NodeId,
			Classification: n.Classification,
			Client: &apiv1.ClientInfo{
				Name:           n.MetaClientName,
				Version:        n.MetaClientVersion,
				Implementation: n.MetaClientImplementation,
			},
			Geo: &apiv1.GeoInfo{
				City:          n.MetaClientGeoCity,
				Country:       n.MetaClientGeoCountry,
				CountryCode:   n.MetaClientGeoCountryCode,
				ContinentCode: n.MetaClientGeoContinentCode,
			},
			Consensus: &apiv1.ConsensusInfo{
				Version:        n.MetaConsensusVersion,
				Implementation: n.MetaConsensusImplementation,
			},
			LastSeen: formatUnixTime(n.LastSeenDateTime),
		})
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)

	for k, v := range queryParams {
		if v[0] != "" && k != "page_size" && k != "page_token" && k != "order_by" {
			appliedFilters[k] = v[0]
		}
	}

	// Write response
	r.WriteJSONResponseOK(w, req, &apiv1.ListNodesResponse{
		Nodes: nodes,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: upstreamResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	})
}
