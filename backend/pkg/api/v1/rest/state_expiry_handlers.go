package rest

import (
	"net/http"
	"strconv"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/emptypb"
)

// handleStateExpiryAccessHistory handles GET /api/v1/{network}/state-expiry/access/history
// This endpoint returns address access data chunked by 10000 blocks for state expiry analysis.
func (r *PublicRouter) handleStateExpiryAccessHistory(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// 1. Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// 2. Parse query parameters
	queryParams := req.URL.Query()

	// 3. Build CBT request - no special filters needed for this endpoint
	grpcReq := &cbtproto.ListFctAddressAccessChunked10000Request{}

	// Apply pagination from query parameters
	if v := queryParams.Get(QueryParamPageSize); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			if pageSize > 10000 {
				pageSize = 10000 // Cap at maximum
			}

			grpcReq.PageSize = int32(pageSize)
		}
	} else {
		// Default page size
		grpcReq.PageSize = 10000
	}

	if v := queryParams.Get(QueryParamPageToken); v != "" {
		grpcReq.PageToken = v
	}

	// Apply ordering if specified
	if v := queryParams.Get(QueryParamOrderBy); v != "" {
		grpcReq.OrderBy = v
	} else {
		// Default to ascending order by chunk_start_block_number
		grpcReq.OrderBy = "chunk_start_block_number asc"
	}

	r.log.WithFields(logrus.Fields{
		"network":    network,
		"page_size":  grpcReq.PageSize,
		"page_token": grpcReq.PageToken,
	}).Debug("REST v1: StateExpiryAccessHistory")

	// 4. Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctAddressAccessChunked10000(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
		}).Error("Failed to query address access chunked data")
		r.HandleGRPCError(w, req, err)

		return
	}

	// 5. TRANSFORM CBT types → Public API types
	items := make([]*apiv1.StateExpiryAccessHistory, 0, len(grpcResp.FctAddressAccessChunked_10000))

	for _, cbtItem := range grpcResp.FctAddressAccessChunked_10000 {
		apiItem := transformCBTToAPIStateExpiryAccessHistory(cbtItem)
		items = append(items, apiItem)
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)

	for k, v := range queryParams {
		if v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	// 6. Write response using the standard helper
	r.WriteJSONResponseOK(w, req, &apiv1.StateExpiryAccessHistoryResponse{
		Items: items,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
			OrderBy:        grpcReq.OrderBy,
		},
	})
}

// transformCBTToAPIStateExpiryAccessHistory transforms CBT types to public API types.
// This is the ONLY place where transformation happens for state expiry access history.
func transformCBTToAPIStateExpiryAccessHistory(cbt *cbtproto.FctAddressAccessChunked10000) *apiv1.StateExpiryAccessHistory {
	return &apiv1.StateExpiryAccessHistory{
		ChunkStartBlockNumber: cbt.ChunkStartBlockNumber,
		FirstAccessedAccounts: cbt.FirstAccessedAccounts,
		LastAccessedAccounts:  cbt.LastAccessedAccounts,
	}
}

// handleStateExpiryStorageHistory handles GET /api/v1/{network}/state-expiry/storage/history
// This endpoint returns storage slot data chunked by 10000 blocks for state expiry analysis.
func (r *PublicRouter) handleStateExpiryStorageHistory(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// 1. Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// 2. Parse query parameters
	queryParams := req.URL.Query()

	// 3. Build CBT request - no special filters needed for this endpoint
	grpcReq := &cbtproto.ListFctAddressStorageSlotChunked10000Request{}

	// Apply pagination from query parameters
	if v := queryParams.Get(QueryParamPageSize); v != "" {
		if pageSize, err := strconv.ParseInt(v, 10, 32); err == nil {
			if pageSize > 10000 {
				pageSize = 10000 // Cap at maximum
			}

			grpcReq.PageSize = int32(pageSize)
		}
	} else {
		// Default page size
		grpcReq.PageSize = 10000
	}

	if v := queryParams.Get(QueryParamPageToken); v != "" {
		grpcReq.PageToken = v
	}

	// Apply ordering if specified
	if v := queryParams.Get(QueryParamOrderBy); v != "" {
		grpcReq.OrderBy = v
	} else {
		// Default to ascending order by chunk_start_block_number
		grpcReq.OrderBy = "chunk_start_block_number asc"
	}

	r.log.WithFields(logrus.Fields{
		"network":    network,
		"page_size":  grpcReq.PageSize,
		"page_token": grpcReq.PageToken,
	}).Debug("REST v1: StateExpiryStorageHistory")

	// 4. Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service
	grpcResp, err := r.xatuCBTClient.ListFctAddressStorageSlotChunked10000(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
		}).Error("Failed to query storage slot chunked data")
		r.HandleGRPCError(w, req, err)

		return
	}

	// 5. TRANSFORM CBT types → Public API types
	items := make([]*apiv1.StateExpiryStorageHistory, 0, len(grpcResp.FctAddressStorageSlotChunked_10000))

	for _, cbtItem := range grpcResp.FctAddressStorageSlotChunked_10000 {
		apiItem := transformCBTToAPIStateExpiryStorageHistory(cbtItem)
		items = append(items, apiItem)
	}

	// Build applied filters map for metadata
	appliedFilters := make(map[string]string)

	for k, v := range queryParams {
		if v[0] != "" && k != QueryParamPageSize && k != QueryParamPageToken && k != QueryParamOrderBy {
			appliedFilters[k] = v[0]
		}
	}

	// 6. Write response using the standard helper
	r.WriteJSONResponseOK(w, req, &apiv1.StateExpiryStorageHistoryResponse{
		Items: items,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: grpcResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
			OrderBy:        grpcReq.OrderBy,
		},
	})
}

// transformCBTToAPIStateExpiryStorageHistory transforms CBT types to public API types.
// This is the ONLY place where transformation happens for state expiry storage history.
func transformCBTToAPIStateExpiryStorageHistory(cbt *cbtproto.FctAddressStorageSlotChunked10000) *apiv1.StateExpiryStorageHistory {
	return &apiv1.StateExpiryStorageHistory{
		ChunkStartBlockNumber: cbt.ChunkStartBlockNumber,
		FirstAccessedSlots:    cbt.FirstAccessedSlots,
		LastAccessedSlots:     cbt.LastAccessedSlots,
	}
}

// handleStateExpiryAccessTotal handles GET /api/v1/{network}/state-expiry/access/total
// This endpoint returns the latest total address access statistics for state expiry analysis.
func (r *PublicRouter) handleStateExpiryAccessTotal(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// 1. Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
	}).Debug("REST v1: StateExpiryAccessTotal")

	// 2. Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service to get the latest totals (no specific timestamp)
	grpcReq := &cbtproto.GetFctAddressAccessTotalRequest{}

	grpcResp, err := r.xatuCBTClient.GetFctAddressAccessTotal(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
		}).Error("Failed to query address access total")
		r.HandleGRPCError(w, req, err)

		return
	}

	// 3. TRANSFORM CBT types → Public API types
	apiItem := transformCBTToAPIStateExpiryAccessTotal(grpcResp.Item)

	// Build applied filters map for metadata (empty for this endpoint)
	appliedFilters := make(map[string]string)

	// 4. Write response using the standard helper
	r.WriteJSONResponseOK(w, req, &apiv1.StateExpiryAccessTotalResponse{
		Item: apiItem,
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	})
}

// transformCBTToAPIStateExpiryAccessTotal transforms CBT types to public API types.
// This is the ONLY place where transformation happens for state expiry access totals.
func transformCBTToAPIStateExpiryAccessTotal(cbt *cbtproto.FctAddressAccessTotal) *apiv1.StateExpiryAccessTotal {
	return &apiv1.StateExpiryAccessTotal{
		TotalAccounts:    cbt.TotalAccounts,
		ExpiredAccounts:  cbt.ExpiredAccounts,
		TotalContracts:   cbt.TotalContractAccounts,
		ExpiredContracts: cbt.ExpiredContracts,
	}
}

// handleStateExpiryStorageExpiredTop handles GET /api/v1/{network}/state-expiry/storage/expired/top
// This endpoint returns the top 100 contracts ranked by expired storage slots for state expiry analysis.
func (r *PublicRouter) handleStateExpiryStorageExpiredTop(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// 1. Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
	}).Debug("REST v1: StateExpiryStorageExpiredTop")

	// 2. Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the service to get the top 100 contracts - no filters needed
	grpcReq := &cbtproto.ListFctAddressStorageSlotExpiredTop100ByContractRequest{}

	grpcResp, err := r.xatuCBTClient.ListFctAddressStorageSlotExpiredTop100ByContract(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
		}).Error("Failed to query expired storage slot top 100")
		r.HandleGRPCError(w, req, err)

		return
	}

	// 3. TRANSFORM CBT types → Public API types
	items := make([]*apiv1.StateExpiryStorageExpiredTop, 0, len(grpcResp.FctAddressStorageSlotExpiredTop_100ByContract))

	for _, cbtItem := range grpcResp.FctAddressStorageSlotExpiredTop_100ByContract {
		apiItem := transformCBTToAPIStateExpiryStorageExpiredTop(cbtItem)
		items = append(items, apiItem)
	}

	// Build applied filters map for metadata (empty for this endpoint)
	appliedFilters := make(map[string]string)

	// 4. Write response using the standard helper
	r.WriteJSONResponseOK(w, req, &apiv1.StateExpiryStorageExpiredTopResponse{
		Items: items,
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	})
}

// transformCBTToAPIStateExpiryStorageExpiredTop transforms CBT types to public API types.
// This is the ONLY place where transformation happens for state expiry expired storage top 100.
func transformCBTToAPIStateExpiryStorageExpiredTop(cbt *cbtproto.FctAddressStorageSlotExpiredTop100ByContract) *apiv1.StateExpiryStorageExpiredTop {
	return &apiv1.StateExpiryStorageExpiredTop{
		Rank:            cbt.Rank,
		ContractAddress: cbt.ContractAddress,
		ExpiredSlots:    cbt.ExpiredSlots,
	}
}

// handleStateExpiryStorageTop handles GET /api/v1/{network}/state-expiry/storage/top
// This endpoint returns the top 100 contracts ranked by total storage slots for state expiry analysis.
func (r *PublicRouter) handleStateExpiryStorageTop(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// 1. Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
	}).Debug("REST v1: StateExpiryStorageTop")

	// 2. Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the service to get the top 100 contracts - no filters needed
	grpcReq := &cbtproto.ListFctAddressStorageSlotTop100ByContractRequest{}

	grpcResp, err := r.xatuCBTClient.ListFctAddressStorageSlotTop100ByContract(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
		}).Error("Failed to query storage slot top 100")
		r.HandleGRPCError(w, req, err)

		return
	}

	// 3. TRANSFORM CBT types → Public API types
	items := make([]*apiv1.StateExpiryStorageTop, 0, len(grpcResp.FctAddressStorageSlotTop_100ByContract))

	for _, cbtItem := range grpcResp.FctAddressStorageSlotTop_100ByContract {
		apiItem := transformCBTToAPIStateExpiryStorageTop(cbtItem)
		items = append(items, apiItem)
	}

	// Build applied filters map for metadata (empty for this endpoint)
	appliedFilters := make(map[string]string)

	// 4. Write response using the standard helper
	r.WriteJSONResponseOK(w, req, &apiv1.StateExpiryStorageTopResponse{
		Items: items,
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	})
}

// transformCBTToAPIStateExpiryStorageTop transforms CBT types to public API types.
// This is the ONLY place where transformation happens for state expiry storage top 100.
func transformCBTToAPIStateExpiryStorageTop(cbt *cbtproto.FctAddressStorageSlotTop100ByContract) *apiv1.StateExpiryStorageTop {
	return &apiv1.StateExpiryStorageTop{
		Rank:              cbt.Rank,
		ContractAddress:   cbt.ContractAddress,
		TotalStorageSlots: cbt.TotalStorageSlots,
	}
}

// handleStateExpiryStorageTotal handles GET /api/v1/{network}/state-expiry/storage/total
// This endpoint returns the latest storage slot totals for state expiry analysis.
func (r *PublicRouter) handleStateExpiryStorageTotal(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// 1. Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
	}).Debug("REST v1: StateExpiryStorageTotal")

	// 2. Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the service to get the latest storage slot totals
	// Using Get method to retrieve the most recent record
	grpcReq := &cbtproto.GetFctAddressStorageSlotTotalRequest{}

	grpcResp, err := r.xatuCBTClient.GetFctAddressStorageSlotTotal(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
		}).Error("Failed to query storage slot totals")
		r.HandleGRPCError(w, req, err)

		return
	}

	// 3. TRANSFORM CBT types → Public API types
	apiItem := transformCBTToAPIStateExpiryStorageTotal(grpcResp.Item)

	// Build applied filters map for metadata (empty for this endpoint)
	appliedFilters := make(map[string]string)

	// 4. Write response using the standard helper
	r.WriteJSONResponseOK(w, req, &apiv1.StateExpiryStorageTotalResponse{
		Item: apiItem,
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	})
}

// transformCBTToAPIStateExpiryStorageTotal transforms CBT types to public API types.
// This is the ONLY place where transformation happens for state expiry storage totals.
func transformCBTToAPIStateExpiryStorageTotal(cbt *cbtproto.FctAddressStorageSlotTotal) *apiv1.StateExpiryStorageTotal {
	return &apiv1.StateExpiryStorageTotal{
		TotalStorageSlots:   cbt.TotalStorageSlots,
		ExpiredStorageSlots: cbt.ExpiredStorageSlots,
	}
}

// handleStateExpiryBlock handles GET /api/v1/{network}/state-expiry/expiry/block
// This endpoint returns the execution layer block number from approximately 1 year ago,
// which is used as the boundary for state expiry calculations.
func (r *PublicRouter) handleStateExpiryBlock(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// 1. Validate network
	if network == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Network parameter is required")

		return
	}

	r.log.WithFields(logrus.Fields{
		"network": network,
	}).Debug("REST v1: StateExpiryBlock")

	// 2. Set network in gRPC metadata and call service
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the special gRPC service method with an empty request
	grpcResp, err := r.xatuCBTClient.ListFctBlockForStateExpiry(ctxWithMeta, &emptypb.Empty{})
	if err != nil {
		r.log.WithError(err).WithFields(logrus.Fields{
			"network": network,
		}).Error("Failed to query state expiry block")
		r.HandleGRPCError(w, req, err)

		return
	}

	// 3. TRANSFORM CBT types → Public API types
	// We expect exactly one block from the service
	var apiItem *apiv1.StateExpiryBlock
	if len(grpcResp.FctBlock) > 0 {
		apiItem = transformCBTToAPIStateExpiryBlock(grpcResp.FctBlock[0])
	} else {
		// No block found in the time range
		r.WriteJSONResponseError(w, req, http.StatusNotFound, "No block found for state expiry time range")

		return
	}

	// Build applied filters map for metadata (empty for this endpoint)
	appliedFilters := make(map[string]string)

	// 4. Write response using the standard helper
	r.WriteJSONResponseOK(w, req, &apiv1.StateExpiryBlockResponse{
		Item: apiItem,
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	})
}

// transformCBTToAPIStateExpiryBlock transforms CBT types to public API types.
// This is the ONLY place where transformation happens for state expiry block.
func transformCBTToAPIStateExpiryBlock(cbt *cbtproto.FctBlock) *apiv1.StateExpiryBlock {
	return &apiv1.StateExpiryBlock{
		BlockNumber: cbt.ExecutionPayloadBlockNumber,
	}
}
