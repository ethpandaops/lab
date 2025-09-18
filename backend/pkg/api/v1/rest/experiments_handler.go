package rest

import (
	"net/http"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	configpb "github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	"github.com/gorilla/mux"
)

// handleExperimentConfig handles GET /api/v1/experiments/{experimentId}/config
func (r *PublicRouter) handleExperimentConfig(w http.ResponseWriter, req *http.Request) {
	ctx := req.Context()
	vars := mux.Vars(req)
	experimentID := vars["experimentId"]

	// Validate experimentID
	if experimentID == "" {
		r.WriteJSONResponseError(w, req, http.StatusBadRequest, "Experiment id is required")

		return
	}

	// Call the config service to get the experiment configuration
	grpcResp, err := r.configClient.GetExperimentConfig(ctx, &configpb.GetExperimentConfigRequest{
		ExperimentId: experimentID,
	})
	if err != nil {
		r.HandleGRPCError(w, req, err)

		return
	}

	// Convert the internal config proto to public API proto
	dataAvailability := make(map[string]*apiv1.ExperimentDataAvailability)
	for network, availability := range grpcResp.Experiment.DataAvailability {
		dataAvailability[network] = &apiv1.ExperimentDataAvailability{
			AvailableFromTimestamp:  availability.AvailableFromTimestamp,
			AvailableUntilTimestamp: availability.AvailableUntilTimestamp,
			MinSlot:                 availability.MinSlot,
			MaxSlot:                 availability.MaxSlot,
			SafeSlot:                availability.SafeSlot,
			HeadSlot:                availability.HeadSlot,
			HasData:                 availability.HasData,
		}
	}

	// Write response
	r.WriteJSONResponseOK(w, req, &apiv1.GetExperimentConfigResponse{
		Experiment: &apiv1.ExperimentConfig{
			Id:               grpcResp.Experiment.Id,
			Enabled:          grpcResp.Experiment.Enabled,
			Networks:         grpcResp.Experiment.Networks,
			DataAvailability: dataAvailability,
		},
	})
}
