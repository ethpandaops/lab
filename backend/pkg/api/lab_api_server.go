package api

import (
	"context"
	"net/http"
	"strings"

	apipb "github.com/ethpandaops/lab/backend/pkg/api/proto"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	beaconslotspb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/proto"
)

// StandardHTTPHeaders defines common HTTP headers that can be set on responses
var StandardHTTPHeaders = map[string]string{
	"Cache-Control":          "max-age=30, s-maxage=30, public",
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

// SetHTTPHeaders is a helper function to set HTTP headers in the gRPC context
func SetHTTPHeaders(ctx context.Context, headers map[string]string) error {
	pairs := []string{}
	for k, v := range headers {
		pairs = append(pairs, k, v)
	}
	return grpc.SetHeader(ctx, metadata.Pairs(pairs...))
}

// GetRecentLocallyBuiltBlocks retrieves recent locally built blocks for a network
func (s *LabAPIServerImpl) GetRecentLocallyBuiltBlocks(ctx context.Context, req *apipb.GetRecentLocallyBuiltBlocksRequest) (*apipb.GetRecentLocallyBuiltBlocksResponse, error) {
	// Forward the request to the beacon slots service
	resp, err := s.beaconSlotsClient.GetRecentLocallyBuiltBlocks(ctx, &beaconslotspb.GetRecentLocallyBuiltBlocksRequest{
		Network: req.Network,
	})
	if err != nil {
		return nil, err
	}

	// Set HTTP headers for this endpoint
	if err := SetHTTPHeaders(ctx, map[string]string{
		"Cache-Control": StandardHTTPHeaders["Cache-Control-Short"],
	}); err != nil {
		// If there's an error, continue without headers
	}

	// Convert the response to the API response format
	return &apipb.GetRecentLocallyBuiltBlocksResponse{
		SlotBlocks: resp.SlotBlocks,
	}, nil
}

// RegisterHTTPHeadersMiddleware registers a middleware for handling custom headers in gRPC-Gateway
func RegisterHTTPHeadersMiddleware() func(ctx context.Context, w http.ResponseWriter, resp proto.Message) error {
	return func(ctx context.Context, w http.ResponseWriter, resp proto.Message) error {
		// Check if there are metadata headers to forward to the HTTP response
		md, ok := runtime.ServerMetadataFromContext(ctx)
		if !ok {
			return nil
		}

		// Set Content-Type to application/json by default for REST API responses
		// This will override any Content-Type set by the gRPC gateway
		w.Header().Set("Content-Type", "application/json")

		// Transfer headers from gRPC metadata to HTTP response
		// Skip any grpc-specific metadata or headers that should be handled specially
		for k, vs := range md.HeaderMD {
			// Skip certain headers that are handled by the gateway or shouldn't be exposed
			if k == "content-type" ||
				strings.HasPrefix(k, "grpc-") {
				continue
			}

			// For regular headers, use the first value to replace any existing header
			if len(vs) > 0 {
				w.Header().Set(k, vs[0])
			}
		}

		return nil
	}
}
