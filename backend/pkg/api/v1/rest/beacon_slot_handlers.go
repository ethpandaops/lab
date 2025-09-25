package rest

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
)

// formatTimestamp converts a millisecond timestamp to ISO 8601 format.
func formatTimestamp(ms int64) string {
	return time.Unix(0, ms*int64(time.Millisecond)).UTC().Format(time.RFC3339)
}

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
		// Default ordering by seen_slot_start_diff ascending (fastest first)
		OrderBy: "seen_slot_start_diff",
		// Default page size of 10000
		PageSize: 10000,
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

	// Pagination - allow override of default page size
	if v := queryParams.Get("page_size"); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	// Allow custom ordering if specified
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
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
		geo := &apiv1.GeoInfo{
			City:          n.MetaClientGeoCity,
			Country:       n.MetaClientGeoCountry,
			CountryCode:   n.MetaClientGeoCountryCode,
			ContinentCode: n.MetaClientGeoContinentCode,
		}

		// Add latitude if present
		if n.MetaClientGeoLatitude != nil {
			lat := n.MetaClientGeoLatitude.GetValue()
			geo.Latitude = &lat
		}

		// Add longitude if present
		if n.MetaClientGeoLongitude != nil {
			lon := n.MetaClientGeoLongitude.GetValue()
			geo.Longitude = &lon
		}

		nodes = append(nodes, &apiv1.BlockTimingNode{
			NodeId:            n.NodeId,
			Username:          n.Username,
			SeenSlotStartDiff: n.SeenSlotStartDiff,
			Geo:               geo,
			Client: &apiv1.ClientInfo{
				Name:           n.MetaClientName,
				Version:        n.MetaClientVersion,
				Implementation: n.MetaClientImplementation,
			},
			Source: n.Source,
		})
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken {
			appliedFilters[k] = v[0]
		}
	}

	// Write response
	r.WriteJSONResponseOK(w, req, &apiv1.ListBeaconSlotBlockTimingResponse{
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

// handleBeaconAttestationTiming handles GET /api/v1/{network}/beacon/slot/{slot}/attestation/timing
func (r *PublicRouter) handleBeaconAttestationTiming(w http.ResponseWriter, req *http.Request) {
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
	grpcReq := &cbtproto.ListFctAttestationFirstSeenChunked50MsRequest{
		// Set slot filter to get data for specific slot
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply optional filters from query parameters
	if v := queryParams.Get("block_root"); v != "" {
		grpcReq.BlockRoot = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	// Filter by chunk time range if specified
	if v := queryParams.Get("chunk_start_ms[gte]"); v != "" {
		if chunkMs, err := strconv.ParseUint(v, 10, 32); err == nil {
			grpcReq.ChunkSlotStartDiff = &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Gte{Gte: uint32(chunkMs)},
			}
		}
	}

	// Pagination - default to 5000 to ensure we get all data
	// This can be overridden by query parameter
	grpcReq.PageSize = 5000

	if v := queryParams.Get("page_size"); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get("page_token"); v != "" {
		grpcReq.PageToken = v
	}

	// Order by chunk time to show chunks in chronological order
	// Allow override via query parameter for custom ordering
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
	} else {
		// Default: order by chunk time ascending
		grpcReq.OrderBy = "chunk_slot_start_diff"
	}

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctAttestationFirstSeenChunked50Ms(ctxWithMeta, grpcReq)
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to public API types
	chunks := make([]*apiv1.AttestationTimingChunk, 0, len(grpcResp.FctAttestationFirstSeenChunked_50Ms))

	for _, chunk := range grpcResp.FctAttestationFirstSeenChunked_50Ms {
		chunks = append(chunks, &apiv1.AttestationTimingChunk{
			BlockRoot:        chunk.BlockRoot,
			ChunkStartMs:     int64(chunk.ChunkSlotStartDiff),
			AttestationCount: chunk.AttestationCount,
		})
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken {
			appliedFilters[k] = v[0]
		}
	}

	// Write response
	r.WriteJSONResponseOK(w, req, &apiv1.ListBeaconSlotAttestationTimingResponse{
		Chunks: chunks,
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

// handleBeaconAttestationCorrectness handles GET /api/v1/{network}/beacon/slot/{slot}/attestation/correctness
func (r *PublicRouter) handleBeaconAttestationCorrectness(w http.ResponseWriter, req *http.Request) {
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
	grpcReq := &cbtproto.ListFctAttestationCorrectnessHeadRequest{
		// Set slot filter to get data for specific slot
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply optional filters from query parameters
	if v := queryParams.Get("block_root"); v != "" {
		grpcReq.BlockRoot = &cbtproto.NullableStringFilter{
			Filter: &cbtproto.NullableStringFilter_Eq{Eq: v},
		}
	}

	// Apply pagination from query parameters
	if v := queryParams.Get("page_size"); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get("page_token"); v != "" {
		grpcReq.PageToken = v
	}

	// Order by votes_head descending to show most correct blocks first
	// Allow override via query parameter for custom ordering
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
	} else {
		// Default: order by votes_head descending
		grpcReq.OrderBy = "votes_head DESC"
	}

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctAttestationCorrectnessHead(ctxWithMeta, grpcReq)
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to public API types
	blocks := make([]*apiv1.AttestationCorrectness, 0, len(grpcResp.FctAttestationCorrectnessHead))

	for _, cbtItem := range grpcResp.FctAttestationCorrectnessHead {
		// Calculate correctness percentage
		var correctnessPercentage float32

		if cbtItem.VotesMax > 0 {
			votesHead := uint32(0)

			if cbtItem.VotesHead != nil {
				votesHead = cbtItem.VotesHead.Value
			}

			correctnessPercentage = (float32(votesHead) / float32(cbtItem.VotesMax)) * 100
		}

		// Handle nullable block root
		blockRoot := ""
		if cbtItem.BlockRoot != nil {
			blockRoot = cbtItem.BlockRoot.Value
		}

		// Handle nullable votes head (actual votes for the current slot's block)
		votesHead := uint32(0)
		if cbtItem.VotesHead != nil {
			votesHead = cbtItem.VotesHead.Value
		}

		// Handle nullable votes other
		votesOther := uint32(0)
		if cbtItem.VotesOther != nil {
			votesOther = cbtItem.VotesOther.Value
		}

		block := &apiv1.AttestationCorrectness{
			BlockRoot:             blockRoot,
			VotesMax:              cbtItem.VotesMax,
			VotesActual:           votesHead, // VotesHead represents actual votes for current slot's block
			CorrectnessPercentage: correctnessPercentage,
			VotesOther:            votesOther,
		}

		blocks = append(blocks, block)
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	// Write response with blocks array
	r.WriteJSONResponseOK(w, req, &apiv1.ListBeaconSlotAttestationCorrectnessResponse{
		Blocks: blocks,
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
			OrderBy:        grpcReq.OrderBy,
		},
	})
}

// handleMevRelayBidCount handles GET /api/v1/{network}/beacon/slot/{slot}/mev/relay
// Returns MEV relay bid count statistics for a given slot.
func (r *PublicRouter) handleMevRelayBidCount(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// Validate network.
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse slot from path.
	slotStr := vars["slot"]

	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Parse query parameters.
	queryParams := req.URL.Query()

	// Build CBT request.
	grpcReq := &cbtproto.ListFctMevBidCountByRelayRequest{
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply relay filter if provided.
	if relayName := queryParams.Get("relay"); relayName != "" {
		grpcReq.RelayName = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: relayName},
		}
	}

	// Apply pagination from query parameters.
	if v := queryParams.Get(QueryParamPageSize); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil && pageSize > 0 {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get(QueryParamPageToken); v != "" {
		grpcReq.PageToken = v
	}

	// Apply ordering if specified.
	if v := queryParams.Get(QueryParamOrderBy); v != "" {
		grpcReq.OrderBy = v
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
	}).Debug("REST v1: MevRelayBidCount")

	// Set network in gRPC metadata and call service.
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service.
	grpcResp, err := r.xatuCBTClient.ListFctMevBidCountByRelay(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to query MEV bid count by relay")
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to Public API types.
	relays := make([]*apiv1.MevRelayBidCount, 0, len(grpcResp.FctMevBidCountByRelay))

	for _, cbtItem := range grpcResp.FctMevBidCountByRelay {
		apiItem := transformCBTToAPIMevRelayBidCount(cbtItem)
		relays = append(relays, apiItem)
	}

	// Build applied filters map for metadata.
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if len(v) > 0 && v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.ListBeaconSlotMevRelayResponse{
		Relays: relays,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			PageToken:     grpcReq.PageToken,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
			OrderBy:        grpcReq.OrderBy,
		},
	}

	// Set content type header (cache headers are handled by middleware).
	w.Header().Set("Content-Type", "application/json")

	// Write JSON response.
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode MEV relay bid count response")
	}
}

// transformCBTToAPIMevRelayBidCount transforms CBT types to public API types.
func transformCBTToAPIMevRelayBidCount(cbt *cbtproto.FctMevBidCountByRelay) *apiv1.MevRelayBidCount {
	return &apiv1.MevRelayBidCount{
		RelayName: cbt.RelayName,
		BidCount:  cbt.BidTotal,
	}
}

// handleMevBuilderBidCount handles GET /api/v1/{network}/beacon/slot/{slot}/mev/builder/count
// Returns MEV builder bid count statistics for a given slot.
func (r *PublicRouter) handleMevBuilderBidCount(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// Validate network.
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse slot from path.
	slotStr := vars["slot"]

	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Parse query parameters.
	queryParams := req.URL.Query()

	// Build CBT request.
	grpcReq := &cbtproto.ListFctMevBidCountByBuilderRequest{
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply builder filter if provided.
	if builderPubkey := queryParams.Get("builder"); builderPubkey != "" {
		grpcReq.BuilderPubkey = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: builderPubkey},
		}
	}

	// Apply pagination from query parameters.
	if v := queryParams.Get(QueryParamPageSize); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil && pageSize > 0 {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get(QueryParamPageToken); v != "" {
		grpcReq.PageToken = v
	}

	// Apply ordering if specified.
	if v := queryParams.Get(QueryParamOrderBy); v != "" {
		grpcReq.OrderBy = v
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
	}).Debug("REST v1: MevBuilderBidCount")

	// Set network in gRPC metadata and call service.
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service.
	grpcResp, err := r.xatuCBTClient.ListFctMevBidCountByBuilder(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to query MEV bid count by builder")
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to Public API types.
	builders := make([]*apiv1.MevBuilderBidCount, 0, len(grpcResp.FctMevBidCountByBuilder))

	for _, cbtItem := range grpcResp.FctMevBidCountByBuilder {
		apiItem := transformCBTToAPIMevBuilderBidCount(cbtItem)
		builders = append(builders, apiItem)
	}

	// Build applied filters map for metadata.
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if len(v) > 0 && v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.ListBeaconSlotMevBuilderCountResponse{
		Builders: builders,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			PageToken:     grpcReq.PageToken,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
			OrderBy:        grpcReq.OrderBy,
		},
	}

	// Set content type header (cache headers are handled by middleware).
	w.Header().Set("Content-Type", "application/json")

	// Write JSON response.
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode MEV builder bid count response")
	}
}

// transformCBTToAPIMevBuilderBidCount transforms CBT types to public API types.
func transformCBTToAPIMevBuilderBidCount(cbt *cbtproto.FctMevBidCountByBuilder) *apiv1.MevBuilderBidCount {
	return &apiv1.MevBuilderBidCount{
		BuilderPubkey: cbt.BuilderPubkey,
		BidCount:      cbt.BidTotal,
	}
}

// handleMevBlock handles GET /api/v1/{network}/beacon/slot/{slot}/mev
// Returns MEV block data for a given slot.
func (r *PublicRouter) handleMevBlock(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// Validate network.
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse slot from path.
	slotStr := vars["slot"]

	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Parse query parameters.
	queryParams := req.URL.Query()

	// Build CBT request.
	grpcReq := &cbtproto.ListFctBlockMevHeadRequest{
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply optional filters from query parameters.
	if builderPubkey := queryParams.Get("builder_pubkey"); builderPubkey != "" {
		grpcReq.BuilderPubkey = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: builderPubkey},
		}
	}

	if proposerPubkey := queryParams.Get("proposer_pubkey"); proposerPubkey != "" {
		grpcReq.ProposerPubkey = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: proposerPubkey},
		}
	}

	// Apply pagination from query parameters.
	if v := queryParams.Get(QueryParamPageSize); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil && pageSize > 0 {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get(QueryParamPageToken); v != "" {
		grpcReq.PageToken = v
	}

	// Apply ordering if specified.
	if v := queryParams.Get(QueryParamOrderBy); v != "" {
		grpcReq.OrderBy = v
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
	}).Debug("REST v1: MevBlock")

	// Set network in gRPC metadata and call service.
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service.
	grpcResp, err := r.xatuCBTClient.ListFctBlockMevHead(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to query MEV block data")
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to Public API types.
	blocks := make([]*apiv1.MevBlock, 0, len(grpcResp.FctBlockMevHead))

	for _, cbtItem := range grpcResp.FctBlockMevHead {
		apiItem := transformCBTToAPIMevBlock(cbtItem)
		blocks = append(blocks, apiItem)
	}

	// Build applied filters map for metadata.
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if len(v) > 0 && v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.ListBeaconSlotMevResponse{
		Blocks: blocks,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	}

	// Write JSON response.
	r.WriteJSONResponse(w, req, http.StatusOK, response)
}

// transformCBTToAPIMevBlock transforms CBT types to public API types.
func transformCBTToAPIMevBlock(cbt *cbtproto.FctBlockMevHead) *apiv1.MevBlock {
	block := &apiv1.MevBlock{
		BlockRoot:            cbt.BlockRoot,
		BlockHash:            cbt.BlockHash,
		BlockNumber:          cbt.BlockNumber,
		ParentHash:           cbt.ParentHash,
		BuilderPubkey:        cbt.BuilderPubkey,
		ProposerPubkey:       cbt.ProposerPubkey,
		ProposerFeeRecipient: cbt.ProposerFeeRecipient,
		GasLimit:             cbt.GasLimit,
		GasUsed:              cbt.GasUsed,
		TransactionCount:     cbt.TransactionCount,
		RelayNames:           cbt.RelayNames,
	}

	// Handle nullable fields.
	if cbt.Value != nil {
		block.Value = cbt.Value.Value
	}

	if cbt.EarliestBidDateTime != nil {
		block.EarliestBidTime = formatTimestamp(int64(cbt.EarliestBidDateTime.Value)) //nolint:gosec // safe timestamp conversion
	}

	return block
}

// handleMevBuilderBid handles GET /api/v1/{network}/beacon/slot/{slot}/mev/builder/value
// Returns highest MEV bid values by builder for a given slot.
func (r *PublicRouter) handleMevBuilderBid(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
		slotStr = vars["slot"]
	)

	// Validate network.
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse and validate slot number.
	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Parse query parameters.
	queryParams := req.URL.Query()

	// Build CBT request.
	grpcReq := &cbtproto.ListFctMevBidValueByBuilderRequest{
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
		// Default ordering by value descending (highest bids first)
		OrderBy:  "value desc",
		PageSize: 10000,
	}

	// Apply optional filters from query parameters.
	if blockHash := queryParams.Get("block_hash"); blockHash != "" {
		grpcReq.BlockHash = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: blockHash},
		}
	}

	// Filter by relay names if specified.
	if relayNames := queryParams["relay_names"]; len(relayNames) > 0 {
		grpcReq.RelayNames = relayNames
	}

	// Apply pagination from query parameters.
	if v := queryParams.Get(QueryParamPageSize); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil && pageSize > 0 {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get(QueryParamPageToken); v != "" {
		grpcReq.PageToken = v
	}

	// Apply ordering if specified.
	if v := queryParams.Get(QueryParamOrderBy); v != "" {
		grpcReq.OrderBy = v
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
	}).Debug("REST v1: MevBuilderBid")

	// Set network in gRPC metadata and call service.
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service.
	grpcResp, err := r.xatuCBTClient.ListFctMevBidValueByBuilder(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to query MEV builder bid data")
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to Public API types.
	builders := make([]*apiv1.MevBuilderBid, 0, len(grpcResp.FctMevBidValueByBuilder))

	for _, cbtItem := range grpcResp.FctMevBidValueByBuilder {
		apiItem := transformCBTToAPIMevBuilderBid(cbtItem)
		builders = append(builders, apiItem)
	}

	// Build applied filters map for metadata.
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if len(v) > 0 && v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.ListBeaconSlotMevBuilderResponse{
		Builders: builders,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	}

	// Write JSON response.
	r.WriteJSONResponse(w, req, http.StatusOK, response)
}

// transformCBTToAPIMevBuilderBid transforms CBT types to public API types.
func transformCBTToAPIMevBuilderBid(cbt *cbtproto.FctMevBidValueByBuilder) *apiv1.MevBuilderBid {
	return &apiv1.MevBuilderBid{
		BlockHash:       cbt.BlockHash,
		Value:           cbt.Value,
		RelayNames:      cbt.RelayNames,
		EarliestBidTime: formatTimestamp(int64(cbt.EarliestBidDateTime)), //nolint:gosec // safe timestamp conversion
	}
}

// handleBeaconBlobTotal handles GET /api/v1/{network}/beacon/slot/{slot}/blob/total
// This endpoint returns the total number of blobs for blocks in the given slot.
// Multiple blocks can exist for the same slot due to forks in the unfinalized chain.
func (r *PublicRouter) handleBeaconBlobTotal(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
		slotStr = vars["slot"]
	)

	// Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse and validate slot number
	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Parse query parameters
	queryParams := req.URL.Query()

	// Build CBT request
	grpcReq := &cbtproto.ListFctBlockBlobCountHeadRequest{
		// Set slot filter for the specific slot
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply optional block_root filter from query parameters
	if v := queryParams.Get("block_root"); v != "" {
		grpcReq.BlockRoot = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	// Apply pagination from query parameters
	if v := queryParams.Get("page_size"); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get("page_token"); v != "" {
		grpcReq.PageToken = v
	}

	// Order by blob_count descending to show blocks with most blobs first
	// Allow override via query parameter for custom ordering
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
	} else {
		// Default: order by blob_count descending
		grpcReq.OrderBy = "blob_count DESC"
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
	}).Debug("REST v1: BeaconBlobTotal")

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctBlockBlobCountHead(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to query blob count data")
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to Public API types
	blocks := make([]*apiv1.BlobTotal, 0, len(grpcResp.FctBlockBlobCountHead))

	for _, cbtItem := range grpcResp.FctBlockBlobCountHead {
		apiBlock := transformCBTToAPIBlobTotal(cbtItem)
		blocks = append(blocks, apiBlock)
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if len(v) > 0 && v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.ListBeaconSlotBlobTotalResponse{
		Blocks: blocks,
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
			OrderBy:        grpcReq.OrderBy,
		},
	}

	// Set content type header (cache headers are handled by middleware)
	w.Header().Set("Content-Type", "application/json")

	// Write JSON response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode blob total response")
	}
}

// transformCBTToAPIBlobTotal transforms CBT types to public API types.
// This is the ONLY place where transformation happens for blob total data.
func transformCBTToAPIBlobTotal(cbt *cbtproto.FctBlockBlobCountHead) *apiv1.BlobTotal {
	return &apiv1.BlobTotal{
		BlockRoot: cbt.BlockRoot,
		BlobCount: cbt.BlobCount,
	}
}

// handleBeaconBlobTiming handles GET /api/v1/{network}/beacon/slot/{slot}/blob/timing
func (r *PublicRouter) handleBeaconBlobTiming(w http.ResponseWriter, req *http.Request) {
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
	grpcReq := &cbtproto.ListFctBlockBlobFirstSeenByNodeRequest{
		// Set slot filter to get data for specific slot
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
		// Default ordering by seen_slot_start_diff ascending (fastest first)
		OrderBy: "seen_slot_start_diff",
		// Default page size of 10000
		PageSize: 10000,
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

	if v := queryParams.Get("blob_index"); v != "" {
		if blobIndex, err := strconv.ParseUint(v, 10, 32); err == nil {
			grpcReq.BlobIndex = &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(blobIndex)},
			}
		}
	}

	// Pagination - allow override of default page size
	if v := queryParams.Get("page_size"); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	// Allow custom ordering if specified
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
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
	grpcResp, err := r.xatuCBTClient.ListFctBlockBlobFirstSeenByNode(ctxWithMeta, grpcReq)
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to public API types
	nodes := make([]*apiv1.BlobTimingNode, 0, len(grpcResp.FctBlockBlobFirstSeenByNode))

	for _, n := range grpcResp.FctBlockBlobFirstSeenByNode {
		nodes = append(nodes, transformCBTToAPIBlobTimingNode(n))
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.ListBeaconSlotBlobTimingResponse{
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

	// Set content type header (cache headers are handled by middleware)
	w.Header().Set("Content-Type", "application/json")

	// Write JSON response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithFields(logrus.Fields{
			"error":   err,
			"network": network,
			"slot":    slot,
		}).Error("Failed to encode response")
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
		"nodes":   len(nodes),
	}).Debug("REST v1: BlobTiming")
}

// transformCBTToAPIBlobTimingNode transforms CBT blob timing types to public API types
func transformCBTToAPIBlobTimingNode(cbt *cbtproto.FctBlockBlobFirstSeenByNode) *apiv1.BlobTimingNode {
	geo := &apiv1.GeoInfo{
		City:          cbt.MetaClientGeoCity,
		Country:       cbt.MetaClientGeoCountry,
		CountryCode:   cbt.MetaClientGeoCountryCode,
		ContinentCode: cbt.MetaClientGeoContinentCode,
	}

	// Add latitude if present
	if cbt.MetaClientGeoLatitude != nil {
		lat := cbt.MetaClientGeoLatitude.GetValue()
		geo.Latitude = &lat
	}

	// Add longitude if present
	if cbt.MetaClientGeoLongitude != nil {
		lon := cbt.MetaClientGeoLongitude.GetValue()
		geo.Longitude = &lon
	}

	return &apiv1.BlobTimingNode{
		NodeId:            cbt.NodeId,
		Username:          cbt.Username,
		SeenSlotStartDiff: cbt.SeenSlotStartDiff,
		BlobIndex:         cbt.BlobIndex,
		BlockRoot:         cbt.BlockRoot,
		Geo:               geo,
		Client: &apiv1.ClientInfo{
			Name:           cbt.MetaClientName,
			Version:        cbt.MetaClientVersion,
			Implementation: cbt.MetaClientImplementation,
		},
		Source: cbt.Source,
	}
}

// handleBeaconBlock handles GET /api/v1/{network}/beacon/slot/{slot}/block
// This endpoint returns block data for blocks in the given slot.
// Multiple blocks can exist for the same slot due to forks in the unfinalized chain.
func (r *PublicRouter) handleBeaconBlock(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
		slotStr = vars["slot"]
	)

	// Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse and validate slot number
	slot, err := strconv.ParseUint(slotStr, 10, 32)
	if err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Invalid slot number")

		return
	}

	// Parse query parameters
	queryParams := req.URL.Query()

	// Build CBT request
	grpcReq := &cbtproto.ListFctBlockHeadRequest{
		// Set slot filter for the specific slot
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply optional block_root filter from query parameters
	if v := queryParams.Get("block_root"); v != "" {
		grpcReq.BlockRoot = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	// Apply optional proposer_index filter
	if v := queryParams.Get("proposer_index"); v != "" {
		if proposerIndex, err := strconv.ParseUint(v, 10, 32); err == nil {
			grpcReq.ProposerIndex = &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(proposerIndex)},
			}
		}
	}

	// Apply pagination from query parameters
	if v := queryParams.Get("page_size"); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			grpcReq.PageSize = int32(pageSize)
		}
	}

	if v := queryParams.Get("page_token"); v != "" {
		grpcReq.PageToken = v
	}

	// Allow custom ordering via query parameter
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
		"slot":    slot,
	}).Debug("REST v1: BeaconBlock")

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctBlockHead(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to query block data")
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to Public API types
	blocks := make([]*apiv1.BeaconBlock, 0, len(grpcResp.FctBlockHead))

	for _, cbtItem := range grpcResp.FctBlockHead {
		apiBlock := transformCBTToAPIBeaconBlock(cbtItem)
		blocks = append(blocks, apiBlock)
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	for k, v := range queryParams {
		if len(v) > 0 && v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.ListBeaconSlotBlockResponse{
		Blocks: blocks,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			PageToken:     grpcReq.PageToken,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
			OrderBy:        grpcReq.OrderBy,
		},
	}

	// Set content type header (cache headers are handled by middleware)
	w.Header().Set("Content-Type", "application/json")

	// Write JSON response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode beacon block response")
	}
}

// transformCBTToAPIBeaconBlock transforms CBT types to public API types.
// This is the ONLY place where transformation happens for beacon block data.
func transformCBTToAPIBeaconBlock(cbt *cbtproto.FctBlockHead) *apiv1.BeaconBlock {
	block := &apiv1.BeaconBlock{
		// Core block identifiers
		BlockRoot:     cbt.BlockRoot,
		ParentRoot:    cbt.ParentRoot,
		StateRoot:     cbt.StateRoot,
		ProposerIndex: cbt.ProposerIndex,
		BlockVersion:  cbt.BlockVersion,

		// Execution payload information
		ExecutionBlockHash:    cbt.ExecutionPayloadBlockHash,
		ExecutionBlockNumber:  cbt.ExecutionPayloadBlockNumber,
		ExecutionFeeRecipient: cbt.ExecutionPayloadFeeRecipient,
		ExecutionStateRoot:    cbt.ExecutionPayloadStateRoot,
		ExecutionParentHash:   cbt.ExecutionPayloadParentHash,
	}

	// Handle nullable fields
	if cbt.BlockTotalBytes != nil {
		block.BlockTotalBytes = cbt.BlockTotalBytes.Value
	}

	if cbt.BlockTotalBytesCompressed != nil {
		block.BlockTotalBytesCompressed = cbt.BlockTotalBytesCompressed.Value
	}

	if cbt.ExecutionPayloadBaseFeePerGas != nil {
		block.ExecutionBaseFeePerGas = cbt.ExecutionPayloadBaseFeePerGas.Value
	}

	if cbt.ExecutionPayloadGasUsed != nil {
		block.ExecutionGasUsed = cbt.ExecutionPayloadGasUsed.Value
	}

	if cbt.ExecutionPayloadGasLimit != nil {
		block.ExecutionGasLimit = cbt.ExecutionPayloadGasLimit.Value
	}

	if cbt.ExecutionPayloadBlobGasUsed != nil {
		block.ExecutionBlobGasUsed = cbt.ExecutionPayloadBlobGasUsed.Value
	}

	if cbt.ExecutionPayloadExcessBlobGas != nil {
		block.ExecutionExcessBlobGas = cbt.ExecutionPayloadExcessBlobGas.Value
	}

	if cbt.ExecutionPayloadTransactionsCount != nil {
		block.ExecutionTransactionsCount = cbt.ExecutionPayloadTransactionsCount.Value
	}

	if cbt.ExecutionPayloadTransactionsTotalBytes != nil {
		block.ExecutionTransactionsBytes = cbt.ExecutionPayloadTransactionsTotalBytes.Value
	}

	return block
}

// handleBeaconSlotProposerEntity handles GET /api/v1/{network}/beacon/slot/{slot}/proposer/entity
func (r *PublicRouter) handleBeaconSlotProposerEntity(w http.ResponseWriter, req *http.Request) {
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
	grpcReq := &cbtproto.ListFctBlockProposerEntityRequest{
		// Set slot filter to get data for specific slot
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
	}

	// Apply pagination from query parameters
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
	}).Debug("REST v1: BeaconSlotProposerEntity")

	// Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctBlockProposerEntity(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
			"slot":    slot,
		}).Error("Failed to query fct_block_proposer_entity")
		r.WriteJSONResponseError(w, req, http.StatusInternalServerError, "Failed to retrieve proposer entity data")

		return
	}

	// Transform CBT types to Public API types
	items := make([]*apiv1.ProposerEntity, 0, len(grpcResp.FctBlockProposerEntity))

	for _, cbtItem := range grpcResp.FctBlockProposerEntity {
		apiItem := transformCBTToAPIProposerEntity(cbtItem)
		items = append(items, apiItem)
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)
	appliedFilters["slot"] = slotStr

	response := &apiv1.ListBeaconSlotProposerEntityResponse{
		Entities: items,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	}

	// Set content type header (cache headers are handled by middleware)
	w.Header().Set("Content-Type", "application/json")

	// Write JSON response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode response")
	}
}

// transformCBTToAPIProposerEntity transforms CBT proposer entity to public API types
func transformCBTToAPIProposerEntity(cbt *cbtproto.FctBlockProposerEntity) *apiv1.ProposerEntity {
	entity := &apiv1.ProposerEntity{}

	// Handle nullable entity field
	if cbt.Entity != nil && cbt.Entity.Value != "" {
		entity.Entity = cbt.Entity.Value
	} else {
		entity.Entity = "unknown"
	}

	return entity
}
