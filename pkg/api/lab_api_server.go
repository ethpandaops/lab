package api

import (
	"context"

	apipb "github.com/ethpandaops/lab/pkg/api/proto"
)

// LabAPIServerImpl implements apipb.LabAPIServer
type LabAPIServerImpl struct {
	apipb.UnimplementedLabAPIServer
	// Add fields for server client, cache, etc.
}

// NewLabAPIServer creates a new LabAPIServerImpl
func NewLabAPIServer() *LabAPIServerImpl {
	return &LabAPIServerImpl{}
}

func (s *LabAPIServerImpl) GetStatus(ctx context.Context, req *apipb.GetStatusRequest) (*apipb.GetStatusResponse, error) {
	// TODO: Call Server service here (stubbed)
	return &apipb.GetStatusResponse{
		Status:  "ok",
		Version: "v1.0.0",
	}, nil
}

func (s *LabAPIServerImpl) GetSummary(ctx context.Context, req *apipb.GetSummaryRequest) (*apipb.GetSummaryResponse, error) {
	// TODO: Call Server service here (stubbed)
	return &apipb.GetSummaryResponse{
		Summary: "This is a sanitized summary.",
	}, nil
}
