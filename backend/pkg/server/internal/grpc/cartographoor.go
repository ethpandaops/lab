package grpc

import (
	"context"
	"sort"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	"github.com/ethpandaops/lab/backend/pkg/server/proto/networks"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// CartographoorService provides gRPC API for network discovery
type CartographoorService struct {
	networks.UnimplementedNetworksServiceServer
	log        logrus.FieldLogger
	service    *cartographoor.Service
	xatuCBTSvc *xatu_cbt.XatuCBT
}

// NewCartographoorService creates a new CartographoorService
func NewCartographoorService(
	log logrus.FieldLogger,
	svc *cartographoor.Service,
	xatuCBTSvc *xatu_cbt.XatuCBT,
) *CartographoorService {
	return &CartographoorService{
		log:        log.WithField("grpc", "cartographoor"),
		service:    svc,
		xatuCBTSvc: xatuCBTSvc,
	}
}

// Start starts the gRPC service
func (c *CartographoorService) Start(ctx context.Context, server *grpc.Server) error {
	c.log.Info("Starting Cartographoor gRPC service")

	networks.RegisterNetworksServiceServer(server, c)

	return nil
}

// Name returns the service name
func (c *CartographoorService) Name() string {
	return "cartographoor"
}

// ListNetworks returns a list of available networks
func (c *CartographoorService) ListNetworks(
	ctx context.Context,
	req *networks.ListNetworksRequest,
) (*networks.ListNetworksResponse, error) {
	c.log.Debug("ListNetworks called")

	// Get all networks from cartographoor service.
	networksData := c.service.GetNetworksData()
	if networksData == nil || networksData.Networks == nil {
		return nil, status.Error(codes.Internal, "no network data available")
	}

	// Filter and collect networks.
	protoNetworks := make([]*networks.Network, 0, len(networksData.Networks))
	for _, network := range networksData.Networks {
		// Apply active filter if requested.
		if req.ActiveOnly && network.Status != "active" {
			continue
		}

		// Only include networks that are enabled in xatu_cbt config
		if c.xatuCBTSvc != nil {
			if !c.xatuCBTSvc.IsNetworkEnabled(network.Name) {
				continue
			}
		}

		protoNetworks = append(protoNetworks, network)
	}

	// Sort networks by name for consistent output.
	sort.Slice(protoNetworks, func(i, j int) bool {
		return protoNetworks[i].Name < protoNetworks[j].Name
	})

	// Build filter metadata.
	appliedFilters := []string{}
	if req.ActiveOnly {
		appliedFilters = append(appliedFilters, "active_only")
	}

	return &networks.ListNetworksResponse{
		Networks: protoNetworks,
		Filters: &networks.FilterMetadata{
			AppliedFilters: appliedFilters,
			TotalCount:     int32(len(networksData.Networks)), //nolint:gosec // safe after bounds check
			FilteredCount:  int32(len(protoNetworks)),         //nolint:gosec // safe after bounds check
		},
	}, nil
}

// GetNetwork returns detailed information about a specific network
func (c *CartographoorService) GetNetwork(
	ctx context.Context,
	req *networks.GetNetworkRequest,
) (*networks.GetNetworkResponse, error) {
	c.log.Debug("GetNetwork called")

	if req.NetworkName == "" {
		return nil, status.Error(codes.InvalidArgument, "network_name is required")
	}

	networkInfo := c.service.GetNetwork(req.NetworkName)
	if networkInfo == nil {
		return nil, status.Errorf(codes.NotFound, "network '%s' not found", req.NetworkName)
	}

	return &networks.GetNetworkResponse{
		Network: networkInfo,
	}, nil
}
