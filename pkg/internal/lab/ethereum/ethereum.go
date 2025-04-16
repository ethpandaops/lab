package ethereum

import "context"

type Client struct {
	networks map[string]*Network
}

func NewClient(config *Config) *Client {
	networks := make(map[string]*Network)

	for name, network := range config.Networks {
		networks[name] = &Network{
			Name:   name,
			Config: network,
		}
	}

	return &Client{
		networks: networks,
	}
}

func (c *Client) Networks() []*Network {
	networks := make([]*Network, 0, len(c.networks))
	for _, network := range c.networks {
		networks = append(networks, network)
	}

	return networks
}

func (c *Client) GetNetwork(name string) *Network {
	return c.networks[name]
}

func (c *Client) Start(ctx context.Context) error {
	for _, network := range c.networks {
		if err := network.Start(ctx); err != nil {
			return err
		}
	}

	return nil
}
