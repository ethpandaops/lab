package rest

import (
	"net/http"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	configpb "github.com/ethpandaops/lab/backend/pkg/server/proto/config"
)

// handleConfig handles GET /api/v1/config
func (r *PublicRouter) handleConfig(w http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	// Call the config service to get the complete configuration
	grpcResp, err := r.configClient.GetConfig(ctx, &configpb.GetConfigRequest{})
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	r.WriteJSONResponseOK(w, req, &apiv1.GetConfigResponse{
		Config: convertConfigToAPIProto(grpcResp.Config),
	})
}
