package rest

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	configpb "github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	xatu_cbt_pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
)

const (
	// HTTP methods
	methodOptions = "OPTIONS"
)

// PublicRouter handles public REST API v1 requests for all Lab endpoints.
type PublicRouter struct {
	log           logrus.FieldLogger
	configClient  configpb.ConfigServiceClient
	xatuCBTClient xatu_cbt_pb.XatuCBTClient
}

// NewPublicRouter creates a new public REST router for API v1.
func NewPublicRouter(
	log logrus.FieldLogger,
	configClient configpb.ConfigServiceClient,
	xatuCBTClient xatu_cbt_pb.XatuCBTClient,
) *PublicRouter {
	return &PublicRouter{
		log:           log.WithField("component", "public_rest_router_v1"),
		configClient:  configClient,
		xatuCBTClient: xatuCBTClient,
	}
}

// RegisterRoutes registers all public REST v1 endpoints on the provided router.
func (r *PublicRouter) RegisterRoutes(router *mux.Router) {
	v1 := router.PathPrefix("/api/v1").Subrouter()
	v1.HandleFunc("/config", r.handleConfig).Methods("GET", methodOptions)
	v1.HandleFunc("/{network}/nodes", r.handleListNodes).Methods("GET", methodOptions)
}

// handleConfig handles GET /api/v1/config
func (r *PublicRouter) handleConfig(w http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	// Handle CORS preflight
	if req.Method == methodOptions {
		w.WriteHeader(http.StatusOK)

		return
	}

	r.log.Debug("REST v1: GetConfig")

	// Call the config service to get the complete configuration
	grpcResp, err := r.configClient.GetConfig(ctx, &configpb.GetConfigRequest{})
	if err != nil {
		r.log.WithError(err).Error("Failed to get config")
		r.handleError(w, err)

		return
	}

	// Convert the internal config proto to public API proto
	response := &apiv1.GetConfigResponse{
		Config: convertConfigToAPIProto(grpcResp.Config),
	}

	// Set headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Vary", "Accept-Encoding")
	// Network config data is relatively stable, cache for 5 minutes
	w.Header().Set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=120")

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode network config response")
	}
}

// handleListNodes handles GET /api/v1/{network}/nodes with full filtering
func (r *PublicRouter) handleListNodes(w http.ResponseWriter, req *http.Request) {
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
			r.writeError(w, http.StatusBadRequest, err.Error())

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
	upstreamResp, err := r.xatuCBTClient.ListFctNodeActiveLast24H(ctxWithMeta, grpcReq)
	if err != nil {
		r.log.WithError(err).WithField("network", network).Error("Failed to list nodes")
		r.handleError(w, err)

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

	response := &apiv1.ListNodesResponse{
		Nodes: nodes,
		Pagination: &apiv1.PaginationMetadata{
			PageSize:      grpcReq.PageSize,
			NextPageToken: upstreamResp.NextPageToken,
		},
		Filters: &apiv1.FilterMetadata{
			Network:        network,
			AppliedFilters: appliedFilters,
		},
	}

	// Set headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Vary", "Accept-Encoding")

	// Cache headers optimized for 1-minute data refresh cycle
	// max-age=30: Browser cache for 30 seconds (half the update interval)
	// s-maxage=45: CDN cache slightly longer to reduce origin load
	// stale-while-revalidate=30: Serve stale content while fetching updates
	w.Header().Set("Cache-Control", "public, max-age=30, s-maxage=45, stale-while-revalidate=30")

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		r.log.WithError(err).Error("Failed to encode response")
	}
}

// handleError converts errors to appropriate HTTP responses
func (r *PublicRouter) handleError(w http.ResponseWriter, err error) {
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
func (r *PublicRouter) writeError(w http.ResponseWriter, statusCode int, message string) {
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

// parseStringFilter parses Stripe-style bracket notation into StringFilter.
// Supports formats like: field[operator]=value or field=value (defaults to eq).
// Returns the filter, the base field name, and any error.
func parseStringFilter(key, value string) (*cbtproto.StringFilter, string, error) {
	// Empty value means no filter
	if value == "" {
		return nil, "", nil
	}

	// Check for bracket notation: field[operator]
	if idx := strings.Index(key, "["); idx > 0 {
		if end := strings.Index(key, "]"); end > idx {
			fieldName := key[:idx]
			operator := key[idx+1 : end]

			switch operator {
			case "eq":
				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_Eq{Eq: value},
				}, fieldName, nil

			case "ne":
				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_Ne{Ne: value},
				}, fieldName, nil

			case "contains":
				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_Contains{Contains: value},
				}, fieldName, nil

			case "starts_with":
				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_StartsWith{StartsWith: value},
				}, fieldName, nil

			case "ends_with":
				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_EndsWith{EndsWith: value},
				}, fieldName, nil

			case "like":
				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_Like{Like: value},
				}, fieldName, nil

			case "not_like":
				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_NotLike{NotLike: value},
				}, fieldName, nil

			case "in":
				values := strings.Split(value, ",")

				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_In{
						In: &cbtproto.StringList{Values: values},
					},
				}, fieldName, nil

			case "not_in":
				values := strings.Split(value, ",")

				return &cbtproto.StringFilter{
					Filter: &cbtproto.StringFilter_NotIn{
						NotIn: &cbtproto.StringList{Values: values},
					},
				}, fieldName, nil

			default:
				return nil, "", fmt.Errorf("unknown filter operator: %s", operator)
			}
		}
	}

	// No bracket notation = default to equality
	return &cbtproto.StringFilter{
		Filter: &cbtproto.StringFilter_Eq{Eq: value},
	}, key, nil
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

// convertConfigToAPIProto converts the internal config proto to public API proto
func convertConfigToAPIProto(config *configpb.FrontendConfig) *apiv1.FrontendConfig {
	if config == nil {
		return nil
	}

	result := &apiv1.FrontendConfig{}

	// Convert Ethereum config
	if config.Ethereum != nil {
		ethereum := &apiv1.EthereumConfig{
			Networks: make(map[string]*apiv1.NetworkConfig),
		}

		for name, network := range config.Ethereum.Networks {
			networkConfig := &apiv1.NetworkConfig{
				Name:        network.Name,
				Status:      network.Status,
				ChainId:     network.ChainId,
				Description: network.Description,
				GenesisTime: network.GenesisTime,
				LastUpdated: network.LastUpdated,
			}

			// Add service URLs if present
			if len(network.ServiceUrls) > 0 {
				networkConfig.ServiceUrls = network.ServiceUrls
			}

			// Add forks if present
			if network.Forks != nil && network.Forks.Consensus != nil && network.Forks.Consensus.Electra != nil {
				networkConfig.Forks = &apiv1.ForkConfig{
					Consensus: &apiv1.ConsensusForks{
						Electra: &apiv1.ForkInfo{
							Epoch:             network.Forks.Consensus.Electra.Epoch,
							MinClientVersions: network.Forks.Consensus.Electra.MinClientVersions,
						},
					},
				}
			}

			ethereum.Networks[name] = networkConfig
		}

		result.Ethereum = ethereum
	}

	// Convert Modules config
	if config.Modules != nil {
		modules := &apiv1.ModulesConfig{}

		// Beacon Chain Timings module
		if config.Modules.BeaconChainTimings != nil {
			bct := &apiv1.BeaconChainTimingsModule{
				Networks:   config.Modules.BeaconChainTimings.Networks,
				PathPrefix: config.Modules.BeaconChainTimings.PathPrefix,
			}

			if config.Modules.BeaconChainTimings.TimeWindows != nil {
				timeWindows := make([]*apiv1.TimeWindow, 0, len(config.Modules.BeaconChainTimings.TimeWindows))
				for _, tw := range config.Modules.BeaconChainTimings.TimeWindows {
					timeWindows = append(timeWindows, &apiv1.TimeWindow{
						File:  tw.File,
						Step:  tw.Step,
						Range: tw.Range,
						Label: tw.Label,
					})
				}

				bct.TimeWindows = timeWindows
			}

			modules.BeaconChainTimings = bct
		}

		// Xatu Public Contributors module
		if config.Modules.XatuPublicContributors != nil {
			xpc := &apiv1.XatuPublicContributorsModule{
				Networks:   config.Modules.XatuPublicContributors.Networks,
				PathPrefix: config.Modules.XatuPublicContributors.PathPrefix,
				Enabled:    config.Modules.XatuPublicContributors.Enabled,
			}

			if config.Modules.XatuPublicContributors.TimeWindows != nil {
				timeWindows := make([]*apiv1.TimeWindow, 0, len(config.Modules.XatuPublicContributors.TimeWindows))
				for _, tw := range config.Modules.XatuPublicContributors.TimeWindows {
					timeWindows = append(timeWindows, &apiv1.TimeWindow{
						File:  tw.File,
						Step:  tw.Step,
						Range: tw.Range,
						Label: tw.Label,
					})
				}

				xpc.TimeWindows = timeWindows
			}

			modules.XatuPublicContributors = xpc
		}

		// Beacon module
		if config.Modules.Beacon != nil {
			beacon := &apiv1.BeaconModule{
				Enabled:     config.Modules.Beacon.Enabled,
				Description: config.Modules.Beacon.Description,
				PathPrefix:  config.Modules.Beacon.PathPrefix,
			}

			if len(config.Modules.Beacon.Networks) > 0 {
				beaconNetworks := make(map[string]*apiv1.BeaconNetworkConfig)
				for name, netCfg := range config.Modules.Beacon.Networks {
					beaconNetworks[name] = &apiv1.BeaconNetworkConfig{
						HeadLagSlots: netCfg.HeadLagSlots,
						BacklogDays:  netCfg.BacklogDays,
					}
				}

				beacon.Networks = beaconNetworks
			}

			modules.Beacon = beacon
		}

		result.Modules = modules
	}

	return result
}
