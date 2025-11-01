package grpc

import (
	"context"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/state_analytics"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// StateAnalytics implements the State Analytics gRPC service.
type StateAnalytics struct {
	pb.UnimplementedStateAnalyticsServer
	log     logrus.FieldLogger
	service *state_analytics.Service
}

// NewStateAnalytics creates a new StateAnalytics gRPC handler.
func NewStateAnalytics(
	log logrus.FieldLogger,
	svc *state_analytics.Service,
) *StateAnalytics {
	return &StateAnalytics{
		log:     log.WithField("component", "grpc/state_analytics"),
		service: svc,
	}
}

// Name returns the name of the service.
func (sa *StateAnalytics) Name() string {
	return "state_analytics"
}

// Start registers the service with the gRPC server.
func (sa *StateAnalytics) Start(ctx context.Context, grpcServer *grpc.Server) error {
	pb.RegisterStateAnalyticsServer(grpcServer, sa)

	sa.log.Info("StateAnalytics gRPC service started")

	return nil
}

// GetLatestBlockDelta returns state changes for the most recent block.
func (sa *StateAnalytics) GetLatestBlockDelta(
	ctx context.Context,
	req *pb.GetLatestBlockDeltaRequest,
) (*pb.GetLatestBlockDeltaResponse, error) {
	return sa.service.GetLatestBlockDelta(ctx, req)
}

// GetTopStateAdders returns contracts that created the most new storage slots.
func (sa *StateAnalytics) GetTopStateAdders(
	ctx context.Context,
	req *pb.GetTopStateAddersRequest,
) (*pb.GetTopStateAddersResponse, error) {
	return sa.service.GetTopStateAdders(ctx, req)
}

// GetTopStateRemovers returns contracts that cleared the most storage slots.
func (sa *StateAnalytics) GetTopStateRemovers(
	ctx context.Context,
	req *pb.GetTopStateRemoversRequest,
) (*pb.GetTopStateRemoversResponse, error) {
	return sa.service.GetTopStateRemovers(ctx, req)
}

// GetStateGrowthChart returns time-series data of state growth.
func (sa *StateAnalytics) GetStateGrowthChart(
	ctx context.Context,
	req *pb.GetStateGrowthChartRequest,
) (*pb.GetStateGrowthChartResponse, error) {
	return sa.service.GetStateGrowthChart(ctx, req)
}

// GetContractStateActivity returns detailed state activity for a specific contract.
func (sa *StateAnalytics) GetContractStateActivity(
	ctx context.Context,
	req *pb.GetContractStateActivityRequest,
) (*pb.GetContractStateActivityResponse, error) {
	// TODO: Implement this method
	return nil, nil
}

// GetContractStateComposition returns current state size for all contracts (Paradigm diagram data).
func (sa *StateAnalytics) GetContractStateComposition(
	ctx context.Context,
	req *pb.GetContractStateCompositionRequest,
) (*pb.GetContractStateCompositionResponse, error) {
	return sa.service.GetContractStateComposition(ctx, req)
}

// GetHierarchicalState returns state organized hierarchically by category -> protocol -> contract.
func (sa *StateAnalytics) GetHierarchicalState(
	ctx context.Context,
	req *pb.GetHierarchicalStateRequest,
) (*pb.GetHierarchicalStateResponse, error) {
	return sa.service.GetHierarchicalState(ctx, req)
}

// GetStateGrowthByCategory returns time-series state growth data categorized by contract type.
func (sa *StateAnalytics) GetStateGrowthByCategory(
	ctx context.Context,
	req *pb.GetStateGrowthByCategoryRequest,
) (*pb.GetStateGrowthByCategoryResponse, error) {
	return sa.service.GetStateGrowthByCategory(ctx, req)
}
