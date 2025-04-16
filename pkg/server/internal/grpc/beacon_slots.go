package grpc

import (
	"context"

	"github.com/sirupsen/logrus"

	grpc_go "google.golang.org/grpc"

	beacon_slots_service "github.com/ethpandaops/lab/pkg/server/internal/service/beacon_slots"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
)

const BeaconSlotsHandlerName = "grpc/beacon_slots"

// BeaconSlotsHandler implements the gRPC service for beacon slot data.
type BeaconSlotsHandler struct {
	pb.UnimplementedBeaconSlotsServer

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
	pb.RegisterBeaconSlotsServer(grpcServer, h)

	h.log.Info("BeaconSlots gRPC handler registered")

	return nil
}
