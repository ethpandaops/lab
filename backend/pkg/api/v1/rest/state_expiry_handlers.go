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
		r.writeError(w, http.StatusBadRequest, "Network parameter is required")
		return
	}

	// 2. Parse query parameters
	queryParams := req.URL.Query()

	// 3. Build CBT request - no special filters needed for this endpoint
	grpcReq := &cbtproto.ListFctAddressAccessChunked10000Request{}

	// Apply pagination from query parameters
	if v := queryParams.Get("page_size"); v != "" {
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
	if v := queryParams.Get("page_token"); v != "" {
		grpcReq.PageToken = v
	}

	// Apply ordering if specified
	if v := queryParams.Get("order_by"); v != "" {
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
		r.handleGRPCError(w, err)
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
		if v[0] != "" && k != "page_size" && k != "page_token" && k != "order_by" {
			appliedFilters[k] = v[0]
		}
	}

	response := &apiv1.StateExpiryAccessHistoryResponse{
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
	}

	// 6. Set content type header (cache headers are handled by middleware)
	w.Header().Set("Content-Type", "application/json")

	// 7. Write JSON response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode response")
	}
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
