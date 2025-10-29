package rest

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	"github.com/ethpandaops/lab/backend/pkg/api/v1/rest/middleware"
	configpb "github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	state_analytics_pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	xatu_cbt_pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

// Common query parameter names used across REST API handlers
const (
	QueryParamPageSize  = "page_size"
	QueryParamPageToken = "page_token"
	QueryParamOrderBy   = "order_by"
)

// PublicRouter handles public REST API v1 requests for all Lab endpoints.
type PublicRouter struct {
	log                  logrus.FieldLogger
	configClient         configpb.ConfigServiceClient
	xatuCBTClient        xatu_cbt_pb.XatuCBTClient
	stateAnalyticsClient state_analytics_pb.StateAnalyticsClient
}

// NewPublicRouter creates a new public REST router for API v1.
func NewPublicRouter(
	log logrus.FieldLogger,
	configClient configpb.ConfigServiceClient,
	xatuCBTClient xatu_cbt_pb.XatuCBTClient,
	stateAnalyticsClient state_analytics_pb.StateAnalyticsClient,
) *PublicRouter {
	return &PublicRouter{
		log:                  log.WithField("component", "public_rest_router_v1"),
		configClient:         configClient,
		xatuCBTClient:        xatuCBTClient,
		stateAnalyticsClient: stateAnalyticsClient,
	}
}

// RegisterRoutes registers all public REST v1 endpoints on the provided router.
func (r *PublicRouter) RegisterRoutes(router *mux.Router) {
	v1 := router.PathPrefix("/api/v1").Subrouter()

	// Register all routes from the centralized configuration
	for _, route := range r.GetRoutes() {
		// Build middleware chain for this route
		chain := middleware.DefaultChain(r.log, route.Path)

		// Apply caching, then wrap with the middleware chain
		handler := middleware.WithCaching(route.Handler, route.Cache)
		handler = chain.Then(handler)

		v1.HandleFunc(route.Path, handler).Methods(route.Methods...)
	}
}

// HandleGRPCError properly converts gRPC errors to appropriate HTTP responses
func (r *PublicRouter) HandleGRPCError(w http.ResponseWriter, req *http.Request, err error) {
	handler := NewErrorHandler(r.log)
	handler.HandleGRPCError(w, req, err)
}

// WriteJSONResponse safely writes a JSON response, handling encoding errors properly.
func (r *PublicRouter) WriteJSONResponse(w http.ResponseWriter, req *http.Request, statusCode int, response interface{}) {
	// Buffer the response first to catch encoding errors.
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(response); err != nil {
		// Encoding failed - we haven't written anything yet, so we can send an error
		r.log.WithError(err).WithField("type", response).Error("Failed to encode response")
		r.HandleGRPCError(w, req, err)

		return
	}

	// Set headers only after successful encoding.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	// Write the buffered response
	if _, err := w.Write(buf.Bytes()); err != nil {
		// Headers sent at this point, client disconnected most likely.
		r.log.WithError(err).Debug("Failed to write response")
	}
}

// WriteJSONResponseOK is a convenience method for 200 OK responses.
func (r *PublicRouter) WriteJSONResponseOK(w http.ResponseWriter, req *http.Request, response interface{}) {
	r.WriteJSONResponse(w, req, http.StatusOK, response)
}

// WriteJSONResponseError safely writes an error response with proper encoding error handling.
func (r *PublicRouter) WriteJSONResponseError(w http.ResponseWriter, req *http.Request, statusCode int, message string) {
	// Get request ID from context for correlation
	requestID := middleware.GetRequestID(req.Context())

	response := &apiv1.ErrorResponse{
		Error:     http.StatusText(statusCode),
		Message:   message,
		Code:      int32(statusCode), //nolint:gosec // statusCode is from HTTP constants
		RequestId: requestID,
	}

	// Use the safe WriteJSONResponse method
	r.WriteJSONResponse(w, req, statusCode, response)
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

			// Add forks if present
			if network.Forks != nil && network.Forks.Consensus != nil {
				consensusForks := &apiv1.ConsensusForks{}
				hasForks := false

				// Add Electra fork if present
				if network.Forks.Consensus.Electra != nil {
					consensusForks.Electra = &apiv1.ForkInfo{
						Epoch:             network.Forks.Consensus.Electra.Epoch,
						MinClientVersions: network.Forks.Consensus.Electra.MinClientVersions,
					}
					hasForks = true
				}

				// Add Fusaka fork if present
				if network.Forks.Consensus.Fusaka != nil {
					consensusForks.Fusaka = &apiv1.ForkInfo{
						Epoch:             network.Forks.Consensus.Fusaka.Epoch,
						MinClientVersions: network.Forks.Consensus.Fusaka.MinClientVersions,
					}
					hasForks = true
				}

				if hasForks {
					networkConfig.Forks = &apiv1.ForkConfig{
						Consensus: consensusForks,
					}
				}
			}

			ethereum.Networks[name] = networkConfig
		}

		result.Ethereum = ethereum
	}

	// Convert Experiments config
	if config.Experiments != nil {
		expConfigs := make([]*apiv1.ExperimentConfig, 0, len(config.Experiments))
		for _, exp := range config.Experiments {
			expConfig := &apiv1.ExperimentConfig{
				Id:       exp.Id,
				Enabled:  exp.Enabled,
				Networks: exp.Networks,
			}

			// Include config if present
			if exp.Config != nil {
				expConfig.Config = exp.Config
			}

			// Include data availability if present
			if exp.DataAvailability != nil {
				expConfig.DataAvailability = make(map[string]*apiv1.ExperimentDataAvailability)
				for network, da := range exp.DataAvailability {
					expConfig.DataAvailability[network] = &apiv1.ExperimentDataAvailability{
						MinSlot: da.MinSlot,
						MaxSlot: da.MaxSlot,
					}
				}
			}

			expConfigs = append(expConfigs, expConfig)
		}

		result.Experiments = expConfigs
	}

	return result
}
