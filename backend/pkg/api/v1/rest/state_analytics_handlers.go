package rest

import (
	"context"
	"net/http"
	"strconv"

	state_analytics_pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"github.com/gorilla/mux"
	"google.golang.org/grpc/metadata"
)

// handleStateLatestBlockDelta returns state changes for the most recent block
func (r *PublicRouter) handleStateLatestBlockDelta(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	network := vars["network"]

	// Add network to gRPC metadata
	ctx := metadata.NewOutgoingContext(req.Context(), metadata.Pairs("network", network))

	// Call gRPC service
	resp, err := r.stateAnalyticsClient.GetLatestBlockDelta(ctx, &state_analytics_pb.GetLatestBlockDeltaRequest{})
	if err != nil {
		r.HandleGRPCError(w, req, err)
		return
	}

	r.WriteJSONResponseOK(w, req, resp)
}

// handleStateTopAdders returns contracts that created the most new storage slots
func (r *PublicRouter) handleStateTopAdders(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	network := vars["network"]

	// Parse query parameters
	queryParams := req.URL.Query()
	period := parseStatePeriod(queryParams.Get("period"))
	limit := parseLimit(queryParams.Get("limit"), 25)

	// Add network to gRPC metadata
	ctx := metadata.NewOutgoingContext(req.Context(), metadata.Pairs("network", network))

	// Call gRPC service
	resp, err := r.stateAnalyticsClient.GetTopStateAdders(ctx, &state_analytics_pb.GetTopStateAddersRequest{
		Period: period,
		Limit:  limit,
	})
	if err != nil {
		r.HandleGRPCError(w, req, err)
		return
	}

	r.WriteJSONResponseOK(w, req, resp)
}

// handleStateTopRemovers returns contracts that cleared the most storage slots
func (r *PublicRouter) handleStateTopRemovers(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	network := vars["network"]

	// Parse query parameters
	queryParams := req.URL.Query()
	period := parseStateRemoverPeriod(queryParams.Get("period"))
	limit := parseLimit(queryParams.Get("limit"), 25)

	// Add network to gRPC metadata
	ctx := metadata.NewOutgoingContext(req.Context(), metadata.Pairs("network", network))

	// Call gRPC service
	resp, err := r.stateAnalyticsClient.GetTopStateRemovers(ctx, &state_analytics_pb.GetTopStateRemoversRequest{
		Period: period,
		Limit:  limit,
	})
	if err != nil {
		r.HandleGRPCError(w, req, err)
		return
	}

	r.WriteJSONResponseOK(w, req, resp)
}

// handleStateGrowthChart returns time-series data of state growth
func (r *PublicRouter) handleStateGrowthChart(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	network := vars["network"]

	// Parse query parameters
	queryParams := req.URL.Query()
	period := parseChartPeriod(queryParams.Get("period"))
	granularity := parseGranularity(queryParams.Get("granularity"))

	// Add network to gRPC metadata
	ctx := metadata.NewOutgoingContext(req.Context(), metadata.Pairs("network", network))

	// Call gRPC service
	resp, err := r.stateAnalyticsClient.GetStateGrowthChart(ctx, &state_analytics_pb.GetStateGrowthChartRequest{
		Period:      period,
		Granularity: granularity,
	})
	if err != nil {
		r.HandleGRPCError(w, req, err)
		return
	}

	r.WriteJSONResponseOK(w, req, resp)
}

// handleContractStateActivity returns detailed state activity for a specific contract
func (r *PublicRouter) handleContractStateActivity(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	network := vars["network"]
	address := vars["address"]

	// Parse query parameters
	queryParams := req.URL.Query()
	limit := parseLimit(queryParams.Get("limit"), 100)

	// Add network to gRPC metadata
	ctx := metadata.NewOutgoingContext(req.Context(), metadata.Pairs("network", network))

	// Call gRPC service
	resp, err := r.stateAnalyticsClient.GetContractStateActivity(ctx, &state_analytics_pb.GetContractStateActivityRequest{
		Address: address,
		Limit:   limit,
	})
	if err != nil {
		r.HandleGRPCError(w, req, err)
		return
	}

	r.WriteJSONResponseOK(w, req, resp)
}

// parseStatePeriod parses period query parameter for top adders
func parseStatePeriod(value string) state_analytics_pb.GetTopStateAddersRequest_Period {
	switch value {
	case "24h", "PERIOD_24H":
		return state_analytics_pb.GetTopStateAddersRequest_PERIOD_24H
	case "7d", "PERIOD_7D":
		return state_analytics_pb.GetTopStateAddersRequest_PERIOD_7D
	case "30d", "PERIOD_30D":
		return state_analytics_pb.GetTopStateAddersRequest_PERIOD_30D
	default:
		return state_analytics_pb.GetTopStateAddersRequest_PERIOD_24H
	}
}

// parseStateRemoverPeriod parses period query parameter for top removers
func parseStateRemoverPeriod(value string) state_analytics_pb.GetTopStateRemoversRequest_Period {
	switch value {
	case "24h", "PERIOD_24H":
		return state_analytics_pb.GetTopStateRemoversRequest_PERIOD_24H
	case "7d", "PERIOD_7D":
		return state_analytics_pb.GetTopStateRemoversRequest_PERIOD_7D
	case "30d", "PERIOD_30D":
		return state_analytics_pb.GetTopStateRemoversRequest_PERIOD_30D
	default:
		return state_analytics_pb.GetTopStateRemoversRequest_PERIOD_24H
	}
}

// parseChartPeriod parses period query parameter for chart data
func parseChartPeriod(value string) state_analytics_pb.GetStateGrowthChartRequest_Period {
	switch value {
	case "24h", "PERIOD_24H":
		return state_analytics_pb.GetStateGrowthChartRequest_PERIOD_24H
	case "7d", "PERIOD_7D":
		return state_analytics_pb.GetStateGrowthChartRequest_PERIOD_7D
	case "30d", "PERIOD_30D":
		return state_analytics_pb.GetStateGrowthChartRequest_PERIOD_30D
	case "90d", "PERIOD_90D":
		return state_analytics_pb.GetStateGrowthChartRequest_PERIOD_90D
	default:
		return state_analytics_pb.GetStateGrowthChartRequest_PERIOD_24H
	}
}

// parseGranularity parses granularity query parameter
func parseGranularity(value string) state_analytics_pb.GetStateGrowthChartRequest_Granularity {
	switch value {
	case "block", "GRANULARITY_BLOCK":
		return state_analytics_pb.GetStateGrowthChartRequest_GRANULARITY_BLOCK
	case "hour", "GRANULARITY_HOUR":
		return state_analytics_pb.GetStateGrowthChartRequest_GRANULARITY_HOUR
	case "day", "GRANULARITY_DAY":
		return state_analytics_pb.GetStateGrowthChartRequest_GRANULARITY_DAY
	default:
		// Default to hour for most use cases
		return state_analytics_pb.GetStateGrowthChartRequest_GRANULARITY_HOUR
	}
}

// parseLimit parses limit query parameter with default value
func parseLimit(value string, defaultLimit uint32) uint32 {
	if value == "" {
		return defaultLimit
	}

	limit, err := strconv.ParseUint(value, 10, 32)
	if err != nil {
		return defaultLimit
	}

	return uint32(limit)
}

// networkFromContext extracts network from gRPC metadata
func networkFromContext(ctx context.Context) string {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return ""
	}

	networks := md.Get("network")
	if len(networks) == 0 {
		return ""
	}

	return networks[0]
}

// handleContractStateComposition returns current state size for all contracts (Paradigm diagram data)
func (r *PublicRouter) handleContractStateComposition(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	network := vars["network"]

	// Parse query parameters
	queryParams := req.URL.Query()
	limit := parseLimit(queryParams.Get("limit"), 10000)
	minSizeBytes := parseUint64(queryParams.Get("min_size_bytes"), 0)
	includeLabels := queryParams.Get("include_labels") == "true"

	// Add network to gRPC metadata
	ctx := metadata.NewOutgoingContext(req.Context(), metadata.Pairs("network", network))

	// Call gRPC service
	resp, err := r.stateAnalyticsClient.GetContractStateComposition(ctx, &state_analytics_pb.GetContractStateCompositionRequest{
		Limit:         limit,
		MinSizeBytes:  minSizeBytes,
		IncludeLabels: includeLabels,
	})
	if err != nil {
		r.HandleGRPCError(w, req, err)
		return
	}

	r.WriteJSONResponseOK(w, req, resp)
}

// handleHierarchicalState returns state organized hierarchically by category -> protocol -> contract
func (r *PublicRouter) handleHierarchicalState(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	network := vars["network"]

	// Parse query parameters
	queryParams := req.URL.Query()
	maxDepth := parseLimit(queryParams.Get("max_depth"), 3)
	contractsPerProtocol := parseLimit(queryParams.Get("contracts_per_protocol"), 20)

	// Add network to gRPC metadata
	ctx := metadata.NewOutgoingContext(req.Context(), metadata.Pairs("network", network))

	// Call gRPC service
	resp, err := r.stateAnalyticsClient.GetHierarchicalState(ctx, &state_analytics_pb.GetHierarchicalStateRequest{
		MaxDepth:             maxDepth,
		ContractsPerProtocol: contractsPerProtocol,
	})
	if err != nil {
		r.HandleGRPCError(w, req, err)
		return
	}

	r.WriteJSONResponseOK(w, req, resp)
}

// parseUint64 parses uint64 query parameter with default value
func parseUint64(value string, defaultValue uint64) uint64 {
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.ParseUint(value, 10, 64)
	if err != nil {
		return defaultValue
	}

	return parsed
}
