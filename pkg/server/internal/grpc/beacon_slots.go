package grpc

import (
	"context"

	"github.com/sirupsen/logrus" // Added logrus

	grpc_go "google.golang.org/grpc" // Added standard grpc import with alias
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	beacon_slots_service "github.com/ethpandaops/lab/pkg/server/internal/service/beacon_slots" // Aliased service import
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"                              // Align import with proto file location
)

const BeaconSlotsHandlerName = "grpc/beacon_slots"

// BeaconSlotsHandler implements the gRPC service for beacon slot data.
type BeaconSlotsHandler struct {
	pb.UnimplementedBeaconSlotsServiceServer // Embed for forward compatibility - Correct type

	log     logrus.FieldLogger                // Changed to logrus.FieldLogger
	service *beacon_slots_service.BeaconSlots // Changed to concrete service type
}

// NewBeaconSlotsHandler creates a new BeaconSlotsHandler.
func NewBeaconSlotsHandler(log logrus.FieldLogger, svc *beacon_slots_service.BeaconSlots) *BeaconSlotsHandler { // Changed params
	return &BeaconSlotsHandler{
		log:     log.WithField("handler", BeaconSlotsHandlerName), // Use WithField for logrus
		service: svc,
	}
}

// Name returns the name of the gRPC service handler.
func (h *BeaconSlotsHandler) Name() string {
	return BeaconSlotsHandlerName
}

// Start registers the handler with the gRPC server. Required by grpc.Service interface.
func (h *BeaconSlotsHandler) Start(ctx context.Context, grpcServer *grpc_go.Server) error { // Changed to grpc_go.Server
	pb.RegisterBeaconSlotsServiceServer(grpcServer, h)
	h.log.Info("BeaconSlots gRPC handler registered")
	return nil
}

// GetProcessorState retrieves the current processing state for a given network.
func (h *BeaconSlotsHandler) GetProcessorState(ctx context.Context, req *pb.GetProcessorStateRequest) (*pb.GetProcessorStateResponse, error) {
	if req == nil || req.Network == "" {
		return nil, status.Error(codes.InvalidArgument, "network parameter is required")
	}

	state, err := h.service.GetProcessorState(ctx, req.Network) // Pass network from request
	if err != nil {
		h.log.WithError(err).WithField("network", req.Network).Error("Failed to get processor state") // Use logrus methods
		// Convert potential service errors to gRPC status
		st, ok := status.FromError(err)
		if !ok {
			// Default to Internal if not a gRPC status error
			st = status.New(codes.Internal, "internal server error")
		}
		return nil, st.Err()
	}

	// Extract the state for the "forward" processor from the map
	forwardState, ok := state.Processors[beacon_slots_service.ForwardProcessorName] // Use aliased service name
	if !ok {
		h.log.WithField("network", req.Network).Warn("Forward processor state not found in BeaconSlotsState") // Use logrus methods
		// Return NotFound if the specific processor state isn't available
		return nil, status.Error(codes.NotFound, "forward processor state not found")
	}

	return &pb.GetProcessorStateResponse{State: forwardState}, nil
}

// GetSlotData retrieves the processed data for a specific slot.
func (h *BeaconSlotsHandler) GetSlotData(ctx context.Context, req *pb.GetSlotDataRequest) (*pb.GetSlotDataResponse, error) {
	if req == nil || req.Network == "" {
		return nil, status.Error(codes.InvalidArgument, "network parameter is required")
	}
	// Slot 0 is valid, so no check needed unless specific business logic requires > 0

	slotData, err := h.service.GetSlotData(ctx, req.Network, req.Slot) // Pass network and slot
	if err != nil {
		h.log.WithError(err).WithFields(logrus.Fields{"network": req.Network, "slot": req.Slot}).Error("Failed to get slot data") // Use logrus methods
		st, ok := status.FromError(err)
		if !ok {
			st = status.New(codes.Internal, "internal server error")
		}
		return nil, st.Err()
	}

	// Service returns nil data and nil error for NotFound
	if slotData == nil {
		return nil, status.Error(codes.NotFound, "slot data not found")
	}

	return &pb.GetSlotDataResponse{SlotData: slotData}, nil
}

// GetSlotRangeData retrieves processed data for a range of slots.
func (h *BeaconSlotsHandler) GetSlotRangeData(ctx context.Context, req *pb.GetSlotRangeDataRequest) (*pb.GetSlotRangeDataResponse, error) {
	if req == nil || req.Network == "" {
		return nil, status.Error(codes.InvalidArgument, "network parameter is required")
	}
	if req.StartSlot > req.EndSlot {
		return nil, status.Errorf(codes.InvalidArgument, "start_slot (%d) cannot be greater than end_slot (%d)", req.StartSlot, req.EndSlot)
	}

	// TODO: Consider adding a limit to the requested range (req.EndSlot - req.StartSlot)

	slotDataSlice, err := h.service.GetSlotRangeData(ctx, req.Network, req.StartSlot, req.EndSlot) // Pass network, start, end
	if err != nil {
		// The service layer might return the first error encountered during the range query.
		h.log.WithError(err).WithFields(logrus.Fields{ // Use logrus methods
			"network":    req.Network,
			"start_slot": req.StartSlot,
			"end_slot":   req.EndSlot,
		}).Error("Failed to get slot range data")
		st, ok := status.FromError(err)
		if !ok {
			st = status.New(codes.Internal, "internal server error")
		}
		// Return partial results along with the error status
		return &pb.GetSlotRangeDataResponse{SlotData: slotDataSlice}, st.Err()
	}

	// Service returns the slice directly
	return &pb.GetSlotRangeDataResponse{SlotData: slotDataSlice}, nil
}

// GetNodes retrieves the list of known nodes for a network.
func (h *BeaconSlotsHandler) GetNodes(ctx context.Context, req *pb.GetNodesRequest) (*pb.GetNodesResponse, error) {
	if req == nil || req.Network == "" {
		return nil, status.Error(codes.InvalidArgument, "network parameter is required")
	}

	nodes, err := h.service.GetNodes(ctx, req.Network) // Pass network
	if err != nil {
		h.log.WithError(err).WithField("network", req.Network).Error("Failed to get nodes") // Use logrus methods
		st, ok := status.FromError(err)
		if !ok {
			st = status.New(codes.Internal, "internal server error")
		}
		return nil, st.Err()
	}

	// Service returns the slice directly
	return &pb.GetNodesResponse{Nodes: nodes}, nil
}
