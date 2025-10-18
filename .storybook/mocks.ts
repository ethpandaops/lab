import { http, HttpResponse } from 'msw';
import type { Config } from '../src/hooks/useConfig';
import type { Bounds } from '../src/hooks/useBounds';

// Mock config data for Storybook
const mockConfig: Config = {
  networks: [
    {
      name: 'mainnet',
      display_name: 'Mainnet',
      enabled: true,
      status: 'active',
    },
    {
      name: 'holesky',
      display_name: 'Holesky',
      enabled: true,
      status: 'active',
    },
    {
      name: 'sepolia',
      display_name: 'Sepolia',
      enabled: true,
      status: 'active',
    },
    {
      name: 'devnet-1',
      display_name: 'Devnet 1',
      enabled: false,
      status: 'inactive',
    },
  ],
  experiments: {
    'state-expiry': {
      name: 'State Expiry',
      enabled: true,
      networks: ['mainnet', 'holesky'],
      description: 'Ethereum state expiry experiment',
    },
    'blob-scaling': {
      name: 'Blob Scaling',
      enabled: true,
      networks: ['mainnet', 'sepolia', 'holesky'],
      description: 'EIP-4844 blob scaling improvements',
    },
  },
};

// Mock bounds data for Storybook
const mockBounds: Bounds = {
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
export const handlers = {
  config: http.get('*/config', () => {
    return HttpResponse.json(mockConfig);
  }),
  bounds: http.get('*/bounds', () => {
    return HttpResponse.json(mockBounds);
  }),
};
