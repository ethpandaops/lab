import { http, HttpResponse } from 'msw';
import type { Config } from '../src/hooks/useConfig';
import type { Bounds } from '../src/hooks/useBounds';
import { createCatchAllAssetHandler } from './assetHandlers';

// Mock config data for Storybook
export const mockConfig: Config = {
  networks: [
    {
      name: 'holesky',
      display_name: 'Holesky',
      chain_id: 17000,
      genesis_time: 1695902100,
      genesis_delay: 300,
      forks: {
        consensus: {
          electra: {
            epoch: 115968,
            min_client_versions: {
              grandine: '1.0.0',
              lighthouse: '7.0.0-beta.0',
              lodestar: '1.27.0',
              nimbus: '25.2.0',
              prysm: '5.3.0',
              teku: '25.2.0',
            },
          },
          fusaka: {
            epoch: 165120,
            min_client_versions: {
              grandine: '2.0.0.rc0',
              lighthouse: '8.0.0-rc.0',
              lodestar: '1.35.0-rc.1',
              nimbus: '25.9.2',
              prysm: '6.1.0',
              teku: '25.9.3',
              tysm: '0.43.0',
            },
          },
        },
      },
    },
    {
      name: 'hoodi',
      display_name: 'Hoodi',
      chain_id: 560048,
      genesis_time: 1742212800,
      genesis_delay: 600,
      forks: {
        consensus: {
          electra: {
            epoch: 2048,
            min_client_versions: {
              grandine: '1.0.0',
              lighthouse: '7.0.0-beta.0',
              lodestar: '1.27.0',
              nimbus: '25.2.0',
              prysm: '5.3.0',
              teku: '25.2.0',
            },
          },
          fusaka: {
            epoch: 50688,
            min_client_versions: {
              grandine: '2.0.0.rc0',
              lighthouse: '8.0.0-rc.0',
              lodestar: '1.35.0-rc.1',
              nimbus: '25.9.2',
              prysm: '6.1.0',
              teku: '25.9.3',
              tysm: '0.43.0',
            },
          },
        },
      },
    },
    {
      name: 'mainnet',
      display_name: 'Mainnet',
      chain_id: 1,
      genesis_time: 1606824000,
      genesis_delay: 604800,
      forks: {
        consensus: {
          electra: {
            epoch: 364032,
            min_client_versions: {
              grandine: '1.1.0',
              lighthouse: '7.0.0',
              lodestar: '1.29.0',
              nimbus: '25.4.1',
              prysm: '6.0.0',
              teku: '25.4.1',
            },
          },
        },
      },
    },
    {
      name: 'sepolia',
      display_name: 'Sepolia',
      chain_id: 11155111,
      genesis_time: 1655647200,
      genesis_delay: 86400,
      forks: {
        consensus: {
          electra: {
            epoch: 222464,
            min_client_versions: {
              grandine: '1.0.0',
              lighthouse: '7.0.0-beta.0',
              lodestar: '1.27.0',
              nimbus: '25.2.0',
              prysm: '5.3.0',
              teku: '25.2.0',
            },
          },
          fusaka: {
            epoch: 272640,
            min_client_versions: {
              grandine: '2.0.0.rc0',
              lighthouse: '8.0.0-rc.0',
              lodestar: '1.35.0-rc.1',
              nimbus: '25.9.2',
              prysm: '6.1.0',
              teku: '25.9.3',
              tysm: '0.43.0',
            },
          },
        },
      },
    },
  ],
  experiments: [
    {
      name: 'attestation-performance',
      enabled: true,
      networks: [],
    },
    {
      name: 'block-production',
      enabled: false,
      networks: [],
    },
    {
      name: 'slot-view',
      enabled: true,
      networks: ['mainnet'],
    },
  ],
};

// Mock bounds data for Storybook
export const mockBounds: Bounds = {
  fct_block: {
    min: 1000000,
    max: 2000000,
  },
  fct_attestation: {
    min: 5000000,
    max: 10000000,
  },
  fct_transaction: {
    min: 1000000,
    max: 2000000,
  },
};

// MSW handlers for Storybook
export const handlers = [
  // API handlers
  http.get('*/config', () => {
    return HttpResponse.json(mockConfig);
  }),
  http.get('*/bounds', () => {
    return HttpResponse.json(mockBounds);
  }),
  // Asset handlers for GitHub Pages (only active when STORYBOOK_BASE_PATH is set)
  ...createCatchAllAssetHandler(),
];
