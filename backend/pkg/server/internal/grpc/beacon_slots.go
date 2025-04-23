package grpc

import (
	"context"

	"github.com/sirupsen/logrus"

	grpc_go "google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	beacon_slots_service "github.com/ethpandaops/lab/backend/pkg/server/internal/service/beacon_slots"
	beacon_slots "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
)

const BeaconSlotsHandlerName = "grpc/beacon_slots"

// BeaconSlotsHandler implements the gRPC service for beacon slot data.
type BeaconSlotsHandler struct {
	beacon_slots.UnimplementedBeaconSlotsServer

	log     logrus.FieldLogger
	service *beacon_slots_service.BeaconSlots
}

// NewBeaconSlotsHandler creates a new BeaconSlotsHandler.
func NewBeaconSlotsHandler(log logrus.FieldLogger, svc *beacon_slots_service.BeaconSlots) *BeaconSlotsHandler {
	return &BeaconSlotsHandler{
		log:     log.WithField("handler", BeaconSlotsHandlerName),
		service: svc,
	}
}

// Name returns the name of the gRPC service handler.
func (h *BeaconSlotsHandler) Name() string {
	return BeaconSlotsHandlerName
}

// Start registers the handler with the gRPC server. Required by grpc.Service interface.
func (h *BeaconSlotsHandler) Start(ctx context.Context, grpcServer *grpc_go.Server) error {
	beacon_slots.RegisterBeaconSlotsServer(grpcServer, h)

	h.log.Info("BeaconSlots gRPC handler registered")

	return nil
}

// GetRecentLocallyBuiltBlocks implements the BeaconSlotsServer interface.
func (h *BeaconSlotsHandler) GetRecentLocallyBuiltBlocks(ctx context.Context, req *beacon_slots.GetRecentLocallyBuiltBlocksRequest) (*beacon_slots.GetRecentLocallyBuiltBlocksResponse, error) {
	blocks, err := h.service.FetchRecentLocallyBuiltBlocks(ctx, req.Network)
	if err != nil {
		h.log.WithError(err).Error("Failed to get recent locally built blocks")
		return nil, status.Error(codes.Internal, "failed to get recent locally built blocks")
	}

	return &beacon_slots.GetRecentLocallyBuiltBlocksResponse{SlotBlocks: blocks}, nil
}
