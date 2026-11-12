import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { type JSX, type ReactNode } from 'react';
import { renderHook, server, waitFor } from '@/test-utils';
import { NetworkContext } from '@/contexts/NetworkContext';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import { useBounds, useNetworksBounds, useTablesBounds } from './useBounds';
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

  it('should not fetch when network is null', () => {
    const paths = serveBounds();

    const { result } = renderHook(() => useBounds(), { wrapper: networkWrapper(null) });

    expect(result.current.isPending).toBe(true);
    expect(paths()).toEqual([]);
  });

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

  describe('useTablesBounds', () => {
    it('should return the tables it has bounds for, and their aggregate', async () => {
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
      expect(result.current.data?.aggregate).toEqual({
        minOfMins: 1000, // min(1000, 2000)
        maxOfMaxes: 6000, // max(5000, 6000)
        maxOfMins: 2000, // max(1000, 2000)
        minOfMaxes: 5000, // min(5000, 6000)
      });
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
