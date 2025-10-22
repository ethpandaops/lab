import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBounds, useTableBounds, useTablesBounds } from './useBounds';
import type { Bounds } from './useBounds.types';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import { type ReactNode } from 'react';
import { NetworkContext } from '@/contexts/NetworkContext';

// Mock fetch globally
global.fetch = vi.fn();

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
  let queryClient: QueryClient;

  const mockBounds: Bounds = {
    fct_block: { min: 1000, max: 5000 },
    fct_attestation: { min: 2000, max: 6000 },
    fct_transaction: { min: 1500, max: 5500 },
    fct_validator: { min: 500, max: 4500 },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapper = (
    network: Network | null = mockNetwork
  ): (({ children }: { children: ReactNode }) => JSX.Element) => {
    const Wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <QueryClientProvider client={queryClient}>
        <NetworkContext.Provider
          value={{
            currentNetwork: network,
            setCurrentNetwork: vi.fn(),
            networks: network ? [network] : [],
            isLoading: false,
          }}
        >
          {children}
        </NetworkContext.Provider>
      </QueryClientProvider>
    );
    return Wrapper;
  };

  describe('useBounds - basic functionality', () => {
    it('should fetch and return bounds data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useBounds(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBounds);
      expect(result.current.error).toBeNull();
    });

    it('should fetch from correct endpoint with network name', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      renderHook(() => useBounds(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/mainnet/bounds');
    });

    it('should not fetch when network is null', () => {
      const { result } = renderHook(() => useBounds(), {
        wrapper: createWrapper(null),
      });

      expect(result.current.isPending).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch when network becomes available', async () => {
      // Initially no network
      let currentNetwork: Network | null = null;

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <QueryClientProvider client={queryClient}>
          <NetworkContext.Provider
            value={{
              currentNetwork,
              setCurrentNetwork: vi.fn(),
              networks: currentNetwork ? [currentNetwork] : [],
              isLoading: false,
            }}
          >
            {children}
          </NetworkContext.Provider>
        </QueryClientProvider>
      );

      const { rerender } = renderHook(() => useBounds(), {
        wrapper: DynamicWrapper,
      });

      rerender();

      expect(fetch).not.toHaveBeenCalled();

      // Network becomes available
      currentNetwork = mockNetwork;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      rerender();

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/v1/mainnet/bounds');
      });
    });
  });

  describe('useBounds - with selector', () => {
    it('should apply selector to transform data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(
        () =>
          useBounds({
            select: bounds => bounds.fct_block,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 1000, max: 5000 });
    });

    it('should allow selecting specific table', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(
        () =>
          useBounds({
            select: bounds => bounds.fct_attestation,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 2000, max: 6000 });
    });

    it('should allow complex selector transformations', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(
        () =>
          useBounds({
            select: bounds => Object.keys(bounds).length,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(4);
    });
  });

  describe('useBounds - error handling', () => {
    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      const { result } = renderHook(() => useBounds(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Failed to fetch bounds');
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBounds(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('useBounds - network changes', () => {
    it('should refetch when network changes', async () => {
      const sepoliaNetwork: Network = {
        ...mockNetwork,
        name: 'sepolia',
        display_name: 'Sepolia',
      };

      let currentNetwork: Network = mockNetwork;

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <QueryClientProvider client={queryClient}>
          <NetworkContext.Provider
            value={{
              currentNetwork,
              setCurrentNetwork: vi.fn(),
              networks: [mockNetwork, sepoliaNetwork],
              isLoading: false,
            }}
          >
            {children}
          </NetworkContext.Provider>
        </QueryClientProvider>
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { rerender } = renderHook(() => useBounds(), {
        wrapper: DynamicWrapper,
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/v1/mainnet/bounds');
      });

      // Change network
      currentNetwork = sepoliaNetwork;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      rerender();

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/v1/sepolia/bounds');
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('useTableBounds', () => {
    it('should return bounds for specific table', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTableBounds('fct_block'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 1000, max: 5000 });
    });

    it('should return undefined for non-existent table', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTableBounds('non_existent_table'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should work with different table names', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTableBounds('fct_attestation'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ min: 2000, max: 6000 });
    });

    it('should use cached bounds data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const wrapper = createWrapper();

      // First call
      const { result: result1 } = renderHook(() => useTableBounds('fct_block'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second call should use cached data
      const { result: result2 } = renderHook(() => useTableBounds('fct_attestation'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should only fetch once
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('useTablesBounds', () => {
    it('should return bounds for multiple tables', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: createWrapper(),
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: createWrapper(),
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation', 'fct_transaction']), {
        wrapper: createWrapper(),
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'non_existent_table', 'fct_attestation']), {
        wrapper: createWrapper(),
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds([]), {
        wrapper: createWrapper(),
      });

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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds(['fct_block']), {
        wrapper: createWrapper(),
      });

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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: createWrapper(),
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { result } = renderHook(() => useTablesBounds(['fct_block', 'fct_attestation']), {
        wrapper: createWrapper(),
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const { unmount } = renderHook(() => useBounds(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Remount with same network - should use cache
      renderHook(() => useBounds(), {
        wrapper: createWrapper(),
      });

      // Should not fetch again
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should share data between all three hook variants', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBounds,
      } as Response);

      const wrapper = createWrapper();

      const { result: result1 } = renderHook(() => useBounds(), { wrapper });
      const { result: result2 } = renderHook(() => useTableBounds('fct_block'), { wrapper });
      const { result: result3 } = renderHook(() => useTablesBounds(['fct_block']), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
        expect(result3.current.isSuccess).toBe(true);
      });

      // Should only fetch once for all three
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
