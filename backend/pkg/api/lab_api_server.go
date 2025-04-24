package api

import (
	"context"

	"connectrpc.com/connect"
	apipb "github.com/ethpandaops/lab/backend/pkg/api/proto"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	beaconslotspb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	"google.golang.org/grpc"
	// Removed metadata and proto imports as they were only used by removed functions
)

// StandardHTTPHeaders defines common HTTP headers that can be set on responses
var StandardHTTPHeaders = map[string]string{
	"Cache-Control":          "max-age=30, s-maxage=30, public",
	"Cache-Control-Tiny":     "max-age=1, s-maxage=1, public",
	"Cache-Control-Short":    "max-age=10, s-maxage=10, public",
	"Cache-Control-Medium":   "max-age=60, s-maxage=60, public",
	"Cache-Control-Long":     "max-age=300, s-maxage=300, public",
	"Cache-Control-VeryLong": "max-age=3600, s-maxage=3600, public",
}

type LabAPIServerImpl struct {
	apipb.UnimplementedLabAPIServer

	cache   cache.Client
	storage storage.Client

	// gRPC clients
	beaconSlotsClient beaconslotspb.BeaconSlotsClient
}

func NewLabAPIServer(cacheClient cache.Client, storageClient storage.Client, beaconSlotsConn *grpc.ClientConn) *LabAPIServerImpl {
	return &LabAPIServerImpl{
		cache:             cacheClient,
		storage:           storageClient,
		beaconSlotsClient: beaconslotspb.NewBeaconSlotsClient(beaconSlotsConn),
	}
}

// GetRecentLocallyBuiltBlocks retrieves recent locally built blocks for a network
func (s *LabAPIServerImpl) GetRecentLocallyBuiltBlocks(ctx context.Context, req *connect.Request[apipb.GetRecentLocallyBuiltBlocksRequest]) (*connect.Response[apipb.GetRecentLocallyBuiltBlocksResponse], error) {
	// Forward the request to the beacon slots service
	resp, err := s.beaconSlotsClient.GetRecentLocallyBuiltBlocks(ctx, &beaconslotspb.GetRecentLocallyBuiltBlocksRequest{
		Network: req.Msg.Network, // Access message via req.Msg
	})
	if err != nil {
		return nil, err // Return error directly
	}

	// Convert the response to the API response format and wrap in connect.Response
	apiResponse := &apipb.GetRecentLocallyBuiltBlocksResponse{
		SlotBlocks: resp.SlotBlocks,
	}
	res := connect.NewResponse(apiResponse)

	// Example of setting a header
	res.Header().Set("Cache-Control", StandardHTTPHeaders["Cache-Control-Tiny"])

	return res, nil
}
