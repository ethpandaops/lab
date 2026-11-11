import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { client } from '@/lab-api/client.gen';
import { getConfigQueryKey } from '@/lab-api/@tanstack/react-query.gen';
import { createQueryClient } from '@/utils/query-client';
import { useConfig } from './useConfig';
import type { Config } from './useConfig.types';
import { type ReactNode } from 'react';

// Mock fetch globally
global.fetch = vi.fn();

/** A JSON response, as the API sends it. */
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A plain-text error, as the API sends it. */
const text = (body: string, status: number): Response =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

describe('useConfig', () => {
  let queryClient: QueryClient;

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

  // jsdom's fetch needs absolute URLs
  beforeAll(() => client.setConfig({ baseUrl: 'http://localhost' }));

  beforeEach(() => {
    queryClient = createQueryClient({ retry: false });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapper = (): (({ children }: { children: ReactNode }) => JSX.Element) => {
    const Wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  describe('successful data fetching', () => {
    it('should fetch and return config data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

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
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.networks).toEqual(mockConfig.networks);
      expect(result.current.data?.networks[0].name).toBe('mainnet');
      expect(result.current.data?.networks[1].name).toBe('sepolia');
    });

    it('should return features array', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.features).toEqual(mockConfig.features);
      expect(result.current.data?.features[0].path).toBe('/ethereum/live');
      expect(result.current.data?.features[0].disabled_networks).toEqual([]);
    });

    it('should fetch from correct endpoint', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect((vi.mocked(fetch).mock.calls[0][0] as Request).url).toBe('http://localhost/api/v1/config');
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(text('failed to encode response\n', 500));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe('failed to encode response\n');
      expect(result.current.data).toBeUndefined();
    });

    it('should reject a configuration that does not match the spec', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json({ ...mockConfig, networks: [{ name: 'mainnet' }] }));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toHaveProperty('message', 'Network error');
    });

    it('should handle invalid JSON', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('{not json', { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(SyntaxError);
    });
  });

  describe('loading states', () => {
    it('should start with loading state', () => {
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve - stay loading
          })
      );

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPending).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should transition from loading to success', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPending).toBe(false);
    });

    it('should transition from loading to error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(text('Server Error', 500));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

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
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result, unmount } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledTimes(1);

      unmount();

      // Remount - should use cached data
      const { result: result2 } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      // Should immediately have data from cache
      expect(result2.current.data).toEqual(mockConfig);
      // Should not fetch again
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should share data between multiple instances', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const wrapper = createWrapper();
      const { result: result1 } = renderHook(() => useConfig(), { wrapper });
      const { result: result2 } = renderHook(() => useConfig(), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should only fetch once
      expect(fetch).toHaveBeenCalledTimes(1);

      // Both should have same data
      expect(result1.current.data).toEqual(mockConfig);
      expect(result2.current.data).toEqual(mockConfig);
    });
  });

  describe('query configuration', () => {
    it('should use correct query key', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check if data is cached under the correct key
      const cachedData = queryClient.getQueryData(getConfigQueryKey());
      expect(cachedData).toEqual(mockConfig);
    });

    it('should have infinite staleTime', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Data should never be stale
      const queryState = queryClient.getQueryState(getConfigQueryKey());
      expect(queryState?.isInvalidated).toBe(false);
    });
  });

  describe('data structure', () => {
    it('should handle empty networks array', async () => {
      const emptyConfig: Config = {
        networks: [],
        features: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce(json(emptyConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.networks).toEqual([]);
      expect(result.current.data?.features).toEqual([]);
    });

    it('should handle network with complete fork data', async () => {
      const configWithForks: Config = {
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
      };

      vi.mocked(fetch).mockResolvedValueOnce(json(configWithForks));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

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
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

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
      vi.mocked(fetch).mockImplementation(async () => json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledTimes(1);

      // Manually refetch
      await result.current.refetch();

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle failed refetch with cached data', async () => {
      // First fetch succeeds
      vi.mocked(fetch).mockResolvedValueOnce(json(mockConfig));

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const cachedData = result.current.data;

      // Second fetch fails
      vi.mocked(fetch).mockResolvedValueOnce(text('Server Error', 500));

      await result.current.refetch();

      // Should still have cached data
      expect(result.current.data).toEqual(cachedData);
    });
  });
});
