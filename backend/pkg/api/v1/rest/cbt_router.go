package rest

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	xatu_cbt_pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
)

// CBTRouter handles REST API v1 requests for CBT endpoints.
type CBTRouter struct {
	log           logrus.FieldLogger
	xatuCBTClient xatu_cbt_pb.XatuCBTClient
}

// NewCBTRouter creates a new CBT REST router for API v1.
func NewCBTRouter(
	log logrus.FieldLogger,
	xatuCBTClient xatu_cbt_pb.XatuCBTClient,
) *CBTRouter {
	return &CBTRouter{
		log:           log.WithField("component", "cbt_rest_router_v1"),
		xatuCBTClient: xatuCBTClient,
	}
}

// RegisterRoutes registers all CBT REST v1 endpoints on the provided router.
func (r *CBTRouter) RegisterRoutes(router *mux.Router) {
	v1 := router.PathPrefix("/api/v1").Subrouter()
	v1.HandleFunc("/{network}/nodes", r.handleListNodes).Methods("GET", "OPTIONS")
}

// handleListNodes handles GET /api/v1/{network}/nodes with full filtering
func (r *CBTRouter) handleListNodes(w http.ResponseWriter, req *http.Request) {
	var (
		ctx     = req.Context()
		vars    = mux.Vars(req)
		network = vars["network"]
	)

	// Handle CORS preflight.
	if req.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)

		return
	}

	if network == "" {
		r.writeError(w, http.StatusBadRequest, "Network parameter is required")

		return
	}

	// Build upstream gRPC request with all filtering capabilities.
	grpcReq := &cbtproto.ListIntXatuNodes24HRequest{}

	// Parse query parameters and map to upstream proto fields.
	queryParams := req.URL.Query()

	// String filters - map to upstream StringFilter.
	if v := queryParams.Get("meta_client_name"); v != "" {
		grpcReq.MetaClientName = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("username"); v != "" {
		grpcReq.Username = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("node_id"); v != "" {
		grpcReq.NodeId = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("classification"); v != "" {
		grpcReq.Classification = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_client_version"); v != "" {
		grpcReq.MetaClientVersion = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_client_implementation"); v != "" {
		grpcReq.MetaClientImplementation = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_client_geo_city"); v != "" {
		grpcReq.MetaClientGeoCity = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_client_geo_country"); v != "" {
		grpcReq.MetaClientGeoCountry = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_client_geo_country_code"); v != "" {
		grpcReq.MetaClientGeoCountryCode = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_client_geo_continent_code"); v != "" {
		grpcReq.MetaClientGeoContinentCode = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_consensus_version"); v != "" {
		grpcReq.MetaConsensusVersion = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
	}

	if v := queryParams.Get("meta_consensus_implementation"); v != "" {
		grpcReq.MetaConsensusImplementation = &cbtproto.StringFilter{
			Filter: &cbtproto.StringFilter_Eq{Eq: v},
		}
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

	r.log.WithFields(logrus.Fields{
		"network":    network,
		"filters":    len(queryParams),
		"page_size":  grpcReq.PageSize,
		"page_token": grpcReq.PageToken,
	}).Debug("REST v1: ListNodes")

	// Set network in gRPC metadata
	ctxWithMeta := metadata.NewOutgoingContext(
		ctx,
		metadata.New(map[string]string{"network": network}),
	)

	// Call the gRPC service with upstream types directly
	upstreamResp, err := r.xatuCBTClient.ListIntXatuNodes24H(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithField("network", network).Error("Failed to list nodes")
		r.handleError(w, err)

		return
	}

	// Transform upstream response to v1 API response
	nodes := make([]*apiv1.Node, 0, len(upstreamResp.IntXatuNodes__24H))

	for _, n := range upstreamResp.IntXatuNodes__24H {
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

	response := &apiv1.ListNodesResponse{
		Nodes: nodes,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: upstreamResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			TimeRange:      "24h",
			AppliedFilters: appliedFilters,
		},
	}

	// Set headers
	w.Header().Set("Content-Type", "application/json")

	// Shorter cache for filtered results
	if len(appliedFilters) > 0 {
		w.Header().Set("Cache-Control", "max-age=5, s-maxage=5, public")
	} else {
		w.Header().Set("Cache-Control", "max-age=10, s-maxage=10, public")
	}

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode response")
	}
}

// handleError converts errors to appropriate HTTP responses
func (r *CBTRouter) handleError(w http.ResponseWriter, err error) {
	// Check for specific error types
	if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "not configured") {
		r.writeError(w, http.StatusNotFound, err.Error())

		return
	}

	if strings.Contains(err.Error(), "required") {
		r.writeError(w, http.StatusBadRequest, err.Error())

		return
	}

	if strings.Contains(err.Error(), "invalid") {
		r.writeError(w, http.StatusBadRequest, err.Error())

		return
	}

	// Default to internal server error
	r.writeError(w, http.StatusInternalServerError, "Internal server error")
}

// writeError writes a JSON error response using v1 API proto
func (r *CBTRouter) writeError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := &apiv1.ErrorResponse{
		Error:   http.StatusText(statusCode),
		Message: message,
		Code:    int32(statusCode), //nolint:gosec // statusCode is from HTTP constants
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode error response")
	}
}

// parseTimeParam parses time parameter from various formats
func parseTimeParam(value string) (int64, error) {
	// Try parsing as Unix timestamp
	if timestamp, err := strconv.ParseInt(value, 10, 64); err == nil {
		return timestamp, nil
	}

	// Try parsing as RFC3339
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return t.Unix(), nil
	}

	// Try parsing as date only (YYYY-MM-DD)
	if t, err := time.Parse("2006-01-02", value); err == nil {
		return t.Unix(), nil
	}

	// Try parsing relative time (e.g., "24h", "7d")
	if strings.HasSuffix(value, "h") {
		if hours, err := strconv.Atoi(strings.TrimSuffix(value, "h")); err == nil {
			return time.Now().Add(-time.Duration(hours) * time.Hour).Unix(), nil
		}
	}

	if strings.HasSuffix(value, "d") {
		if days, err := strconv.Atoi(strings.TrimSuffix(value, "d")); err == nil {
			return time.Now().Add(-time.Duration(days) * 24 * time.Hour).Unix(), nil
		}
	}

	return 0, fmt.Errorf("invalid time format: %s", value)
}

// formatUnixTime formats Unix timestamp to string
func formatUnixTime(timestamp uint32) string {
	if timestamp == 0 {
		return ""
	}

	return time.Unix(int64(timestamp), 0).Format(time.RFC3339)
}
