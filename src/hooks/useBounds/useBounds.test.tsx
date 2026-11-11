import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { type JSX, type ReactNode } from 'react';
import { renderHook, server, waitFor } from '@/test-utils';
import { NetworkContext } from '@/contexts/NetworkContext';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import { useBounds, useNetworksBounds, useTableBounds, useTablesBounds } from './useBounds';
import type { Bounds } from './useBounds.types';

const mockNetwork: Network = {
  name: 'mainnet',
  display_name: 'Mainnet',
  chain_id: 1,
  genesis_time: 1606824000,
  genesis_delay: 0,
  forks: {
    consensus: {},
  },
};

describe('useBounds', () => {
  const mockBounds: Bounds = {
    fct_block: { min: 1000, max: 5000 },
    fct_attestation: { min: 2000, max: 6000 },
    fct_transaction: { min: 1500, max: 5500 },
    fct_validator: { min: 500, max: 4500 },
  };

  /** Serves `mockBounds` for any network and returns the paths requested so far. */
  const serveBounds = (): (() => string[]) => {
    const paths: string[] = [];
    server.use(
      http.get('/api/v1/:network/bounds', ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(mockBounds);
      })
    );
    return () => paths;
  };

  const networkWrapper = (network: Network | null = mockNetwork) =>
    function Wrapper({ children }: { children: ReactNode }): JSX.Element {
      return (
        <NetworkContext
          value={{
            currentNetwork: network,
            setCurrentNetwork: vi.fn(),
            networks: network ? [network] : [],
            isLoading: false,
          }}
        >
          {children}
        </NetworkContext>
      );
    };

  describe('useBounds - basic functionality', () => {
    it('should fetch and return bounds data', async () => {
      serveBounds();

      const { result } = renderHook(() => useBounds(), { wrapper: networkWrapper() });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBounds);
      expect(result.current.error).toBeNull();
    });

    it('should fetch from correct endpoint with network name', async () => {
      const paths = serveBounds();

      renderHook(() => useBounds(), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(paths()).toEqual(['/api/v1/mainnet/bounds']);
      });
    });

    it('should not fetch when network is null', () => {
      const paths = serveBounds();

      const { result } = renderHook(() => useBounds(), { wrapper: networkWrapper(null) });

      expect(result.current.isPending).toBe(true);
      expect(paths()).toEqual([]);
    });

    it('should fetch when network becomes available', async () => {
      const paths = serveBounds();
      // Initially no network
      let currentNetwork: Network | null = null;

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <NetworkContext
          value={{
            currentNetwork,
            setCurrentNetwork: vi.fn(),
            networks: currentNetwork ? [currentNetwork] : [],
            isLoading: false,
          }}
        >
          {children}
        </NetworkContext>
      );

      const { rerender } = renderHook(() => useBounds(), { wrapper: DynamicWrapper });

      rerender();

      expect(paths()).toEqual([]);

      // Network becomes available
      currentNetwork = mockNetwork;

      rerender();

      await waitFor(() => {
        expect(paths()).toEqual(['/api/v1/mainnet/bounds']);
      });
    });
  });

  describe('useBounds - with selector', () => {
    it('should apply selector to transform data', async () => {
      serveBounds();

      const { result } = renderHook(() => useBounds({ select: bounds => bounds.fct_block }), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 1000, max: 5000 });
    });

    it('should allow selecting specific table', async () => {
      serveBounds();

      const { result } = renderHook(() => useBounds({ select: bounds => bounds.fct_attestation }), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 2000, max: 6000 });
    });

    it('should allow complex selector transformations', async () => {
      serveBounds();

      const { result } = renderHook(() => useBounds({ select: bounds => Object.keys(bounds).length }), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(4);
    });
  });

  describe('useBounds - error handling', () => {
    it('should handle fetch errors', async () => {
      server.use(
        http.get(
          '/api/v1/:network/bounds',
          () =>
            new HttpResponse('network not found or bounds unavailable\n', {
              status: 404,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
        )
      );

      const { result } = renderHook(() => useBounds(), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // The generated client throws lab-backend's response body
      expect(result.current.error).toBe('network not found or bounds unavailable\n');
    });

    it('should handle network errors', async () => {
      server.use(http.get('/api/v1/:network/bounds', () => HttpResponse.error()));

      const { result } = renderHook(() => useBounds(), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(TypeError);
    });
  });

  describe('useBounds - network changes', () => {
    it('should refetch when network changes', async () => {
      const paths = serveBounds();
      const sepoliaNetwork: Network = {
        ...mockNetwork,
        name: 'sepolia',
        display_name: 'Sepolia',
      };

      let currentNetwork: Network = mockNetwork;

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <NetworkContext
          value={{
            currentNetwork,
            setCurrentNetwork: vi.fn(),
            networks: [mockNetwork, sepoliaNetwork],
            isLoading: false,
          }}
        >
          {children}
        </NetworkContext>
      );

      const { rerender } = renderHook(() => useBounds(), { wrapper: DynamicWrapper });

      await waitFor(() => {
        expect(paths()).toEqual(['/api/v1/mainnet/bounds']);
      });

      // Change network
      currentNetwork = sepoliaNetwork;

      rerender();

      await waitFor(() => {
        expect(paths()).toEqual(['/api/v1/mainnet/bounds', '/api/v1/sepolia/bounds']);
      });
    });
  });

  describe('useTableBounds', () => {
    it('should return bounds for specific table', async () => {
      serveBounds();

      const { result } = renderHook(() => useTableBounds('fct_block'), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 1000, max: 5000 });
    });

    it('should return undefined for non-existent table', async () => {
      serveBounds();

      const { result } = renderHook(() => useTableBounds('non_existent_table'), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should work with different table names', async () => {
      serveBounds();

      const { result } = renderHook(() => useTableBounds('fct_attestation'), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 2000, max: 6000 });
    });

    it('should use cached bounds data', async () => {
      const paths = serveBounds();
      const wrapper = networkWrapper();

      // First call
      const { result: result1, client } = renderHook(() => useTableBounds('fct_block'), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second call should use cached data
      const { result: result2 } = renderHook(() => useTableBounds('fct_attestation'), { wrapper, client });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should only fetch once
      expect(paths()).toHaveLength(1);
    });
  });

  describe('useTablesBounds', () => {
    it('should return bounds for multiple tables', async () => {
      serveBounds();

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.tables).toEqual({
        fct_block: { min: 1000, max: 5000 },
        fct_attestation: { min: 2000, max: 6000 },
      });
    });

    it('should calculate aggregate bounds correctly', async () => {
      serveBounds();

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.aggregate).toEqual({
        minOfMins: 1000, // min(1000, 2000)
        maxOfMaxes: 6000, // max(5000, 6000)
        maxOfMins: 2000, // max(1000, 2000)
        minOfMaxes: 5000, // min(5000, 6000)
      });
    });

    it('should handle three tables correctly', async () => {
      serveBounds();

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation', 'fct_transaction']), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(Object.keys(result.current.data?.tables || {}).length).toBe(3);
      expect(result.current.data?.aggregate).toEqual({
        minOfMins: 1000, // min(1000, 2000, 1500)
        maxOfMaxes: 6000, // max(5000, 6000, 5500)
        maxOfMins: 2000, // max(1000, 2000, 1500)
        minOfMaxes: 5000, // min(5000, 6000, 5500)
      });
    });

    it('should skip non-existent tables', async () => {
      serveBounds();

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'non_existent_table', 'fct_attestation']), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.tables).toEqual({
        fct_block: { min: 1000, max: 5000 },
        fct_attestation: { min: 2000, max: 6000 },
      });

      expect(result.current.data?.tables).not.toHaveProperty('non_existent_table');
    });

    it('should handle empty table list', async () => {
      serveBounds();

      const { result } = renderHook(() => useTablesBounds([]), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.tables).toEqual({});
      expect(result.current.data?.aggregate).toEqual({
        minOfMins: undefined,
        maxOfMaxes: undefined,
        maxOfMins: undefined,
        minOfMaxes: undefined,
      });
    });

    it('should handle single table', async () => {
      serveBounds();

      const { result } = renderHook(() => useTablesBounds(['fct_block']), { wrapper: networkWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.aggregate).toEqual({
        minOfMins: 1000,
        maxOfMaxes: 5000,
        maxOfMins: 1000,
        minOfMaxes: 5000,
      });
    });

    it('should calculate intersection range correctly', async () => {
      // Table A: [1000, 5000]
      // Table B: [2000, 6000]
      // Intersection: [2000, 5000] (maxOfMins to minOfMaxes)
      serveBounds();

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { maxOfMins, minOfMaxes } = result.current.data!.aggregate;
      expect(maxOfMins).toBe(2000); // Intersection start
      expect(minOfMaxes).toBe(5000); // Intersection end
    });

    it('should calculate union range correctly', async () => {
      // Table A: [1000, 5000]
      // Table B: [2000, 6000]
      // Union: [1000, 6000] (minOfMins to maxOfMaxes)
      serveBounds();

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: networkWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { minOfMins, maxOfMaxes } = result.current.data!.aggregate;
      expect(minOfMins).toBe(1000); // Union start
      expect(maxOfMaxes).toBe(6000); // Union end
    });
  });

  describe('caching behavior', () => {
    it('should cache data per network', async () => {
      const paths = serveBounds();
      const wrapper = networkWrapper();

      const { unmount, client } = renderHook(() => useBounds(), { wrapper });

      await waitFor(() => {
        expect(paths()).toHaveLength(1);
      });

      unmount();

      // Remount with same network - should use cache
      const { result } = renderHook(() => useBounds(), { wrapper, client });

      // Should not fetch again
      expect(result.current.data).toEqual(mockBounds);
      expect(paths()).toHaveLength(1);
    });

    it('should share data between all three hook variants', async () => {
      const paths = serveBounds();
      const wrapper = networkWrapper();

      const { result: result1, client } = renderHook(() => useBounds(), { wrapper });
      const { result: result2 } = renderHook(() => useTableBounds('fct_block'), { wrapper, client });
      const { result: result3 } = renderHook(() => useTablesBounds(['fct_block']), { wrapper, client });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
        expect(result3.current.isSuccess).toBe(true);
      });

      // Should only fetch once for all three
      expect(paths()).toHaveLength(1);
    });
  });

  describe('useNetworksBounds', () => {
    it("should fetch each network's bounds by name, sharing the current network's with useBounds", async () => {
      const sepoliaBounds: Bounds = { fct_block: { min: 10, max: 20 } };
      const paths: string[] = [];
      server.use(
        http.get('/api/v1/:network/bounds', ({ request, params }) => {
          paths.push(new URL(request.url).pathname);
          return HttpResponse.json(params.network === 'sepolia' ? sepoliaBounds : mockBounds);
        })
      );
      const wrapper = networkWrapper();

      const { result: current, client } = renderHook(() => useBounds(), { wrapper });

      await waitFor(() => {
        expect(current.current.isSuccess).toBe(true);
      });

      const { result } = renderHook(() => useNetworksBounds(['mainnet', 'sepolia']), { wrapper, client });

      await waitFor(() => {
        expect(result.current.sepolia?.isSuccess).toBe(true);
      });

      expect(result.current.mainnet?.data).toEqual(mockBounds);
      expect(result.current.sepolia?.data).toEqual(sepoliaBounds);
      expect(paths).toEqual(['/api/v1/mainnet/bounds', '/api/v1/sepolia/bounds']);
    });
  });
});
