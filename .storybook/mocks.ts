import { http, HttpResponse } from 'msw';
import type { Config } from '../src/hooks/useConfig';

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
  bounds: {
    max_blob_count: 6,
    target_blob_count: 3,
  },
};

// MSW handlers for Storybook
export const handlers = {
  config: http.get('*/config', () => {
    return HttpResponse.json(mockConfig);
  }),
};
