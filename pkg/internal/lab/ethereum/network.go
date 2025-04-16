package ethereum

import (
	"context"
	"sync"
	"time"

	"github.com/ethpandaops/ethwallclock"
)

type Network struct {
	Name   string
	Config *NetworkConfig

	wallclock *ethwallclock.EthereumBeaconChain
	mu        sync.Mutex
}

func (n *Network) Start(ctx context.Context) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	n.wallclock = ethwallclock.NewEthereumBeaconChain(n.Config.Genesis, time.Second*12, 32)

	return nil
}

func (n *Network) Stop() error {
	n.mu.Lock()
	defer n.mu.Unlock()

	n.wallclock.Stop()

	return nil
}

func (n *Network) GetWallclock() *ethwallclock.EthereumBeaconChain {
	n.mu.Lock()
	defer n.mu.Unlock()

	return n.wallclock
}
