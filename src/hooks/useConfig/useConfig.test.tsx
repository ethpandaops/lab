import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, server, waitFor } from '@/test-utils';
import { configHandlers } from '@/test-utils/handlers';
import { getConfigQueryKey } from '@/lab-api/@tanstack/react-query.gen';
import { useConfig } from './useConfig';
import type { Config } from './useConfig.types';

const CONFIG_URL = '/api/v1/config';

describe('useConfig', () => {
  const mockConfig: Config = {
    networks: [
      {
        name: 'mainnet',
        display_name: 'Mainnet',
        chain_id: 1,
        genesis_time: 1606824000,
        genesis_delay: 0,
        forks: {
          consensus: {
            electra: {
              epoch: 12345,
              min_client_versions: {
                lighthouse: '5.0.0',
              },
            },
          },
        },
      },
      {
        name: 'sepolia',
        display_name: 'Sepolia',
        chain_id: 11155111,
        genesis_time: 1655733600,
        genesis_delay: 0,
        forks: {
          consensus: {},
        },
      },
    ],
    features: [
      {
        path: '/ethereum/live',
        disabled_networks: [],
      },
      {
        path: '/ethereum/data-availability/custody',
        disabled_networks: ['mainnet'],
      },
    ],
  };

  /** Serves `config` and returns the number of requests the server has answered so far. */
  const serveConfig = (config: Config = mockConfig): (() => number) => {
    let requests = 0;
    server.use(
      http.get(CONFIG_URL, () => {
        requests += 1;
        return HttpResponse.json(config);
      })
    );
    return () => requests;
  };

  describe('successful data fetching', () => {
    it('should fetch and return config data', async () => {
      serveConfig();

      const { result } = renderHook(() => useConfig());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockConfig);
      expect(result.current.data?.networks).toHaveLength(2);
      expect(result.current.data?.features).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });

    it('should return networks array', async () => {
      serveConfig();

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.networks).toEqual(mockConfig.networks);
      expect(result.current.data?.networks[0].name).toBe('mainnet');
      expect(result.current.data?.networks[1].name).toBe('sepolia');
    });

    it('should return features array', async () => {
      serveConfig();

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.features).toEqual(mockConfig.features);
      expect(result.current.data?.features[0].path).toBe('/ethereum/live');
      expect(result.current.data?.features[0].disabled_networks).toEqual([]);
    });

    it('should fetch from correct endpoint', async () => {
      const paths: string[] = [];
      server.use(
        http.get('*', ({ request }) => {
          paths.push(new URL(request.url).pathname);
          return HttpResponse.json(mockConfig);
        })
      );

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paths).toEqual(['/api/v1/config']);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      server.use(
        http.get(
          CONFIG_URL,
          () =>
            new HttpResponse('failed to encode response\n', {
              status: 500,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
        )
      );

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // The generated client throws lab-backend's response body
      expect(result.current.error).toBe('failed to encode response\n');
      expect(result.current.data).toBeUndefined();
    });

    it('should reject a configuration that does not match the spec', async () => {
      server.use(http.get(CONFIG_URL, () => HttpResponse.json({ ...mockConfig, networks: [{ name: 'mainnet' }] })));

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should handle network errors', async () => {
      server.use(http.get(CONFIG_URL, () => HttpResponse.error()));

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(TypeError);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle invalid JSON', async () => {
      server.use(
        http.get(CONFIG_URL, () => new HttpResponse('{', { headers: { 'Content-Type': 'application/json' } }))
      );

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(SyntaxError);
    });
  });

  describe('loading states', () => {
    it('should start with loading state', () => {
      server.use(configHandlers.pending);

      const { result } = renderHook(() => useConfig());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPending).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should transition from loading to success', async () => {
      serveConfig();

      const { result } = renderHook(() => useConfig());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPending).toBe(false);
    });

    it('should transition from loading to error', async () => {
      server.use(configHandlers.failure);

      const { result } = renderHook(() => useConfig());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('caching behavior', () => {
    it('should cache data and not refetch on remount', async () => {
      const requests = serveConfig();

      const { result, unmount, client } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requests()).toBe(1);

      unmount();

      // Remount with the same client - should use cached data
      const { result: result2 } = renderHook(() => useConfig(), { client });

      // Should immediately have data from cache
      expect(result2.current.data).toEqual(mockConfig);
      // Should not fetch again
      expect(requests()).toBe(1);
    });

    it('should share data between multiple instances', async () => {
      const requests = serveConfig();

      const { result: result1, client } = renderHook(() => useConfig());
      const { result: result2 } = renderHook(() => useConfig(), { client });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should only fetch once
      expect(requests()).toBe(1);

      // Both should have same data
      expect(result1.current.data).toEqual(mockConfig);
      expect(result2.current.data).toEqual(mockConfig);
    });
  });

  describe('query configuration', () => {
    it('should use correct query key', async () => {
      serveConfig();

      const { result, client } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check if data is cached under the correct key
      expect(client.getQueryData(getConfigQueryKey())).toEqual(mockConfig);
    });

    it('should have infinite staleTime', async () => {
      serveConfig();

      const { result, client } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Data should never be stale
      const queryState = client.getQueryState(getConfigQueryKey());
      expect(queryState?.isInvalidated).toBe(false);
    });
  });

  describe('data structure', () => {
    it('should handle empty networks array', async () => {
      serveConfig({ networks: [], features: [] });

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.networks).toEqual([]);
      expect(result.current.data?.features).toEqual([]);
    });

    it('should handle network with complete fork data', async () => {
      serveConfig({
        networks: [
          {
            name: 'mainnet',
            display_name: 'Mainnet',
            chain_id: 1,
            genesis_time: 1606824000,
            genesis_delay: 604800,
            forks: {
              consensus: {
                electra: {
                  epoch: 12345,
                  min_client_versions: {
                    lighthouse: '5.0.0',
                    prysm: '5.0.0',
                    teku: '24.0.0',
                  },
                },
                fusaka: {
                  epoch: 67890,
                  min_client_versions: {
                    lighthouse: '6.0.0',
                  },
                },
              },
            },
          },
        ],
        features: [],
      });

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const network = result.current.data?.networks[0];
      expect(network?.forks.consensus?.electra).toBeDefined();
      expect(network?.forks.consensus?.electra?.epoch).toBe(12345);
      expect(network?.forks.consensus?.fusaka).toBeDefined();
      expect(network?.forks.consensus?.fusaka?.epoch).toBe(67890);
    });

    it('should handle features with different disabled network configurations', async () => {
      serveConfig();

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const features = result.current.data?.features;
      expect(features?.find(f => f.path === '/ethereum/live')?.disabled_networks).toEqual([]);
      expect(features?.find(f => f.path === '/ethereum/data-availability/custody')?.disabled_networks).toEqual([
        'mainnet',
      ]);
    });
  });

  describe('refetch behavior', () => {
    it('should allow manual refetch', async () => {
      const requests = serveConfig();

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requests()).toBe(1);

      // Manually refetch
      await result.current.refetch();

      expect(requests()).toBe(2);
    });

    it('should handle failed refetch with cached data', async () => {
      // First fetch succeeds
      serveConfig();

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const cachedData = result.current.data;

      // Second fetch fails
      server.use(configHandlers.failure);

      await result.current.refetch();

      // Should still have cached data
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.data).toEqual(cachedData);
    });
  });
});
