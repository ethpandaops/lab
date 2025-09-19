package srv

import (
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/wallclock"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
)

// NetworkDataAdapter implements wallclock.NetworkDataProvider using cartographoor and xatu_cbt config
type NetworkDataAdapter struct {
	cartographoorService *cartographoor.Service
	xatuCBTConfig        *xatu_cbt.Config
}

// NewNetworkDataAdapter creates a new NetworkDataAdapter
func NewNetworkDataAdapter(cartographoorService *cartographoor.Service, xatuCBTConfig *xatu_cbt.Config) *NetworkDataAdapter {
	return &NetworkDataAdapter{
		cartographoorService: cartographoorService,
		xatuCBTConfig:        xatuCBTConfig,
	}
}

// GetNetworkGenesis returns the genesis time for a network from xatu_cbt config override or cartographoor
func (a *NetworkDataAdapter) GetNetworkGenesis(networkName string) (time.Time, error) {
	// First check if we have an override in xatu_cbt config
	if a.xatuCBTConfig != nil && a.xatuCBTConfig.NetworkConfigs != nil {
		if netConfig, ok := a.xatuCBTConfig.NetworkConfigs[networkName]; ok && netConfig.GenesisTime != nil {
			genesisTime, err := time.Parse(time.RFC3339, *netConfig.GenesisTime)
			if err != nil {
				return time.Time{}, fmt.Errorf("failed to parse genesis time for %s: %w", networkName, err)
			}

			return genesisTime, nil
		}
	}

	// Fall back to cartographoor
	if a.cartographoorService == nil {
		return time.Time{}, wallclock.ErrNoDataSource
	}

	networkInfo := a.cartographoorService.GetNetwork(networkName)
	if networkInfo == nil {
		return time.Time{}, wallclock.ErrNetworkNotFound
	}

	if networkInfo.GenesisConfig == nil {
		return time.Time{}, wallclock.ErrGenesisNotAvailable
	}

	return time.Unix(networkInfo.GenesisConfig.GenesisTime, 0), nil
}
