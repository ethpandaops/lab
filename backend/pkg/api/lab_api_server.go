package api

import (
	"context"
	"fmt"
	"math"

	"connectrpc.com/connect" // Renamed import alias
	"github.com/ethpandaops/lab/backend/pkg/api/proto"
	apipb "github.com/ethpandaops/lab/backend/pkg/api/proto/protoconnect"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	beaconslotspb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
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
	apipb.LabAPIHandler

	log logrus.FieldLogger

	cache   cache.Client
	storage storage.Client

	// gRPC clients
	beaconSlotsClient beaconslotspb.BeaconSlotsClient
}

func NewLabAPIServer(cacheClient cache.Client, storageClient storage.Client, srvConn *grpc.ClientConn, log logrus.FieldLogger) *LabAPIServerImpl {
	return &LabAPIServerImpl{
		cache:             cacheClient,
		storage:           storageClient,
		beaconSlotsClient: beaconslotspb.NewBeaconSlotsClient(srvConn),
		log:               log,
	}
}

// GetRecentLocallyBuiltBlocks retrieves recent locally built blocks for a network
func (s *LabAPIServerImpl) GetRecentLocallyBuiltBlocks(ctx context.Context, req *connect.Request[proto.GetRecentLocallyBuiltBlocksRequest]) (*connect.Response[proto.GetRecentLocallyBuiltBlocksResponse], error) {
	// Forward the request to the beacon slots service
	resp, err := s.beaconSlotsClient.GetRecentLocallyBuiltBlocks(ctx, &beaconslotspb.GetRecentLocallyBuiltBlocksRequest{
		Network: req.Msg.Network, // Access message via req.Msg
	})
	if err != nil {
		return nil, err // Return error directly
	}

	// Convert the response to the API response format and wrap in connect.Response
	apiResponse := &proto.GetRecentLocallyBuiltBlocksResponse{
		SlotBlocks: resp.SlotBlocks,
	}
	res := connect.NewResponse(apiResponse)

	// Example of setting a header
	res.Header().Set("Cache-Control", StandardHTTPHeaders["Cache-Control-Tiny"])

	return res, nil
}

func (s *LabAPIServerImpl) GetSlotData(ctx context.Context, req *connect.Request[proto.GetSlotDataRequest]) (*connect.Response[proto.GetSlotDataResponse], error) {
	s.log.WithField("network", req.Msg.Network).WithField("slot", req.Msg.Slot).Debug("GetSlotData")

	// Check for potential overflow before converting uint64 slot to int64
	if req.Msg.Slot > math.MaxInt64 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("slot number %d exceeds maximum representable value", req.Msg.Slot))
	}

	// Forward the request to the beacon slots service
	resp, err := s.beaconSlotsClient.GetSlotData(ctx, &beaconslotspb.GetSlotDataRequest{
		Network: req.Msg.Network,
		Slot:    int64(req.Msg.Slot), //nolint:gosec // We check for overflow above
	})
	if err != nil {
		return nil, err
	}

	// Convert the response to the API response format and wrap in connect.Response
	apiResponse := &proto.GetSlotDataResponse{
		Data: resp.Data,
	}

	res := connect.NewResponse(apiResponse)

	// Example of setting a header
	res.Header().Set("Cache-Control", StandardHTTPHeaders["Cache-Control-VeryLong"])

	return res, nil
}
