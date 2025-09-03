package xatu_cbt

import (
	"context"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
)

// ListNetworks returns the list of available networks
func (x *XatuCBT) ListNetworks(ctx context.Context, req *pb.ListNetworksRequest) (*pb.ListNetworksResponse, error) {
	x.mu.RLock()
	defer x.mu.RUnlock()

	networks := make([]*pb.NetworkInfo, 0, len(x.networks))
	for _, network := range x.networks {
		networks = append(networks, &pb.NetworkInfo{
			Name:    network.Name,
			Enabled: network.Enabled,
		})
	}

	return &pb.ListNetworksResponse{
		Networks: networks,
	}, nil
}
