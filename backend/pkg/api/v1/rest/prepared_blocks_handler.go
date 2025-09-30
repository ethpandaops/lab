package rest

import (
	"net/http"
	"strconv"
	"time"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"google.golang.org/grpc/metadata"
)

// handleListPreparedBlocks handles GET /api/v1/{network}/prepared/blocks
func (r *PublicRouter) handleListPreparedBlocks(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Parse query parameters
	queryParams := req.URL.Query()

	// Build gRPC request
	grpcReq := &cbtproto.ListFctPreparedBlockRequest{}

	// Apply filters from query parameters
	if err := r.buildPreparedBlockFilters(queryParams, grpcReq); err != nil {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, err.Error())

		return
	}

	// Pagination
	pageSize := int32(100) // Default page size

	if v := queryParams.Get("page_size"); v != "" {
		if ps, err := strconv.ParseInt(v, 10, 32); err == nil {
			pageSize = int32(ps)
			if pageSize > 10000 {
				pageSize = 10000 // Cap at 10000
			}
		}
	}

	grpcReq.PageSize = pageSize

	if v := queryParams.Get("page_token"); v != "" {
		grpcReq.PageToken = v
	}

	// Order by
	if v := queryParams.Get("order_by"); v != "" {
		grpcReq.OrderBy = v
	}

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctPreparedBlock(ctxWithMeta, grpcReq)
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to public API types
	preparedBlocks := make([]*apiv1.PreparedBlock, 0, len(grpcResp.FctPreparedBlock))

	for _, vb := range grpcResp.FctPreparedBlock {
		block := &apiv1.PreparedBlock{
			Slot:          vb.Slot,
			SlotStartTime: time.Unix(int64(vb.SlotStartDateTime), 0).UTC().Format(time.RFC3339),
			EventTime:     time.Unix(int64(vb.EventDateTime), 0).UTC().Format(time.RFC3339),
			Client: &apiv1.ClientInfo{
				Name:           vb.MetaClientName,
				Version:        vb.MetaClientVersion,
				Implementation: vb.MetaClientImplementation,
			},
			Consensus: &apiv1.ConsensusInfo{
				Implementation: vb.MetaConsensusImplementation,
				Version:        vb.MetaConsensusVersion,
			},
			Geo: &apiv1.GeoInfo{
				City:        vb.MetaClientGeoCity,
				Country:     vb.MetaClientGeoCountry,
				CountryCode: vb.MetaClientGeoCountryCode,
			},
			BlockMetrics: &apiv1.BlockMetrics{
				Version: vb.BlockVersion,
			},
			ExecutionMetrics: &apiv1.ExecutionPayloadMetrics{
				BlockNumber: vb.ExecutionPayloadBlockNumber,
			},
			LastUpdated: time.Unix(int64(vb.UpdatedDateTime), 0).UTC().Format(time.RFC3339),
		}

		// Handle nullable fields for BlockMetrics
		if vb.BlockTotalBytes != nil {
			block.BlockMetrics.TotalBytes = vb.BlockTotalBytes.GetValue()
		}

		if vb.BlockTotalBytesCompressed != nil {
			block.BlockMetrics.TotalBytesCompressed = vb.BlockTotalBytesCompressed.GetValue()
		}

		// Handle nullable fields for ExecutionMetrics
		if vb.ExecutionPayloadValue != nil {
			block.ExecutionMetrics.ValueWei = vb.ExecutionPayloadValue.GetValue()
		}

		if vb.ConsensusPayloadValue != nil {
			block.ExecutionMetrics.ConsensusValueWei = vb.ConsensusPayloadValue.GetValue()
		}

		if vb.ExecutionPayloadGasLimit != nil {
			block.ExecutionMetrics.GasLimit = vb.ExecutionPayloadGasLimit.GetValue()
		}

		if vb.ExecutionPayloadGasUsed != nil {
			block.ExecutionMetrics.GasUsed = vb.ExecutionPayloadGasUsed.GetValue()
		}

		if vb.ExecutionPayloadTransactionsCount != nil {
			block.ExecutionMetrics.TransactionsCount = vb.ExecutionPayloadTransactionsCount.GetValue()
		}

		if vb.ExecutionPayloadTransactionsTotalBytes != nil {
			block.ExecutionMetrics.TransactionsTotalBytes = vb.ExecutionPayloadTransactionsTotalBytes.GetValue()
		}

		preparedBlocks = append(preparedBlocks, block)
	}

	// Build filter metadata
	filters := &apiv1.PreparedBlockFilterMetadata{
		Network:        network,
		AppliedFilters: make(map[string]string),
		OrderBy:        grpcReq.OrderBy,
	}

	// Populate applied filters
	if v := queryParams.Get("slot"); v != "" {
		slot, _ := strconv.ParseUint(v, 10, 32)
		filters.Slot = uint32(slot)
		filters.AppliedFilters["slot"] = v
	}

	if v := queryParams.Get("client_name"); v != "" {
		filters.ClientName = v
		filters.AppliedFilters["client_name"] = v
	}

	if v := queryParams.Get("from"); v != "" {
		filters.AppliedFilters["from"] = v
	}

	if v := queryParams.Get("to"); v != "" {
		filters.AppliedFilters["to"] = v
	}

	// Build response
	response := &apiv1.ListPreparedBlocksResponse{
		PreparedBlocks: preparedBlocks,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      pageSize,
			PageToken:     grpcReq.PageToken,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: filters,
	}

	// Write response
	r.WriteJSONResponseOK(w, req, response)
}

// handlePreparedBlockBySlot handles GET /api/v1/{network}/prepared/blocks/{slot}
func (r *PublicRouter) handlePreparedBlockBySlot(w http.ResponseWriter, req *http.Request) {
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

	// Build gRPC request with specific slot filter
	grpcReq := &cbtproto.ListFctPreparedBlockRequest{
		Slot: &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
		},
		PageSize: 100, // Get all prepared blocks for this slot
	}

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctPreparedBlock(ctxWithMeta, grpcReq)
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Transform CBT types to public API types
	preparedBlocks := make([]*apiv1.PreparedBlock, 0, len(grpcResp.FctPreparedBlock))

	for _, vb := range grpcResp.FctPreparedBlock {
		block := &apiv1.PreparedBlock{
			Slot:          vb.Slot,
			SlotStartTime: time.Unix(int64(vb.SlotStartDateTime), 0).UTC().Format(time.RFC3339),
			EventTime:     time.Unix(int64(vb.EventDateTime), 0).UTC().Format(time.RFC3339),
			Client: &apiv1.ClientInfo{
				Name:           vb.MetaClientName,
				Version:        vb.MetaClientVersion,
				Implementation: vb.MetaClientImplementation,
			},
			Consensus: &apiv1.ConsensusInfo{
				Implementation: vb.MetaConsensusImplementation,
				Version:        vb.MetaConsensusVersion,
			},
			Geo: &apiv1.GeoInfo{
				City:        vb.MetaClientGeoCity,
				Country:     vb.MetaClientGeoCountry,
				CountryCode: vb.MetaClientGeoCountryCode,
			},
			BlockMetrics: &apiv1.BlockMetrics{
				Version: vb.BlockVersion,
			},
			ExecutionMetrics: &apiv1.ExecutionPayloadMetrics{
				BlockNumber: vb.ExecutionPayloadBlockNumber,
			},
			LastUpdated: time.Unix(int64(vb.UpdatedDateTime), 0).UTC().Format(time.RFC3339),
		}

		// Handle nullable fields for BlockMetrics
		if vb.BlockTotalBytes != nil {
			block.BlockMetrics.TotalBytes = vb.BlockTotalBytes.GetValue()
		}

		if vb.BlockTotalBytesCompressed != nil {
			block.BlockMetrics.TotalBytesCompressed = vb.BlockTotalBytesCompressed.GetValue()
		}

		// Handle nullable fields for ExecutionMetrics
		if vb.ExecutionPayloadValue != nil {
			block.ExecutionMetrics.ValueWei = vb.ExecutionPayloadValue.GetValue()
		}

		if vb.ConsensusPayloadValue != nil {
			block.ExecutionMetrics.ConsensusValueWei = vb.ConsensusPayloadValue.GetValue()
		}

		if vb.ExecutionPayloadGasLimit != nil {
			block.ExecutionMetrics.GasLimit = vb.ExecutionPayloadGasLimit.GetValue()
		}

		if vb.ExecutionPayloadGasUsed != nil {
			block.ExecutionMetrics.GasUsed = vb.ExecutionPayloadGasUsed.GetValue()
		}

		if vb.ExecutionPayloadTransactionsCount != nil {
			block.ExecutionMetrics.TransactionsCount = vb.ExecutionPayloadTransactionsCount.GetValue()
		}

		if vb.ExecutionPayloadTransactionsTotalBytes != nil {
			block.ExecutionMetrics.TransactionsTotalBytes = vb.ExecutionPayloadTransactionsTotalBytes.GetValue()
		}

		preparedBlocks = append(preparedBlocks, block)
	}

	// Build filter metadata
	filters := &apiv1.PreparedBlockFilterMetadata{
		Network: network,
		Slot:    uint32(slot),
		AppliedFilters: map[string]string{
			"slot": slotStr,
		},
	}

	// Build response
	response := &apiv1.ListPreparedBlocksResponse{
		PreparedBlocks: preparedBlocks,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      100,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: filters,
	}

	// Write response
	r.WriteJSONResponseOK(w, req, response)
}

// buildPreparedBlockFilters builds gRPC filters from query parameters
func (r *PublicRouter) buildPreparedBlockFilters(queryParams map[string][]string, grpcReq *cbtproto.ListFctPreparedBlockRequest) error {
	// Slot filters
	if v := queryParams["slot"]; len(v) > 0 && v[0] != "" {
		// Check if multiple slots are provided
		if len(v) > 1 {
			// Use IN filter for multiple slots
			var slots []uint32

			for _, slotStr := range v {
				if slotStr != "" {
					slot, err := strconv.ParseUint(slotStr, 10, 32)
					if err != nil {
						return err
					}

					slots = append(slots, uint32(slot))
				}
			}

			if len(slots) > 0 {
				grpcReq.Slot = &cbtproto.UInt32Filter{
					Filter: &cbtproto.UInt32Filter_In{
						In: &cbtproto.UInt32List{
							Values: slots,
						},
					},
				}
			}
		} else {
			// Single slot - use EQ filter
			slot, err := strconv.ParseUint(v[0], 10, 32)
			if err != nil {
				return err
			}

			grpcReq.Slot = &cbtproto.UInt32Filter{
				Filter: &cbtproto.UInt32Filter_Eq{Eq: uint32(slot)},
			}
		}
	} else if v := queryParams["slot_gte"]; len(v) > 0 && v[0] != "" {
		slot, err := strconv.ParseUint(v[0], 10, 32)
		if err != nil {
			return err
		}

		grpcReq.Slot = &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Gte{Gte: uint32(slot)},
		}
	} else if v := queryParams["slot_lte"]; len(v) > 0 && v[0] != "" {
		slot, err := strconv.ParseUint(v[0], 10, 32)
		if err != nil {
			return err
		}

		grpcReq.Slot = &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Lte{Lte: uint32(slot)},
		}
	}

	// Client filters
	if v := queryParams["client_name"]; len(v) > 0 && v[0] != "" {
		grpcReq.MetaClientName = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v[0]},
		}
	}

	if v := queryParams["client_implementation"]; len(v) > 0 && v[0] != "" {
		grpcReq.MetaClientImplementation = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v[0]},
		}
	}

	if v := queryParams["consensus_implementation"]; len(v) > 0 && v[0] != "" {
		grpcReq.MetaConsensusImplementation = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v[0]},
		}
	}

	// Time filters
	if v := queryParams["from"]; len(v) > 0 && v[0] != "" {
		t, err := time.Parse(time.RFC3339, v[0])
		if err != nil {
			return err
		}

		grpcReq.SlotStartDateTime = &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Gte{Gte: uint32(t.Unix())}, //nolint:gosec // timestamp conversion
		}
	}

	if v := queryParams["to"]; len(v) > 0 && v[0] != "" {
		t, err := time.Parse(time.RFC3339, v[0])
		if err != nil {
			return err
		}

		grpcReq.SlotStartDateTime = &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Lte{Lte: uint32(t.Unix())}, //nolint:gosec // timestamp conversion
		}
	}

	return nil
}
