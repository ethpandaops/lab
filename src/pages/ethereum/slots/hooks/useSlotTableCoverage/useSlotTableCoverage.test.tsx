import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { NetworkContext } from '@/contexts/NetworkContext';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import type { Bounds } from '@/hooks/useBounds';
import { getBoundsQueryKey } from '@/lab-api/@tanstack/react-query.gen';
import { createQueryClient } from '@/utils/query-client';
import { useSlotTableCoverage } from './useSlotTableCoverage';

const network: Network = {
  name: 'mainnet',
  display_name: 'Mainnet',
  chain_id: 1,
  genesis_time: 1606824023,
  genesis_delay: 0,
  forks: { consensus: {} },
};

const bounds: Bounds = {
  fct_attestation_correctness: { min: 1000, max: 5000 },
  fct_attestation_correctness_head: { min: 1000, max: 6000 },
  fct_attestation_vote_by_block_root: { min: 800, max: 4000 },
  fct_attestation_liveness_by_entity: { min: 1000, max: 5000 },
  fct_block_mev: { min: 2000, max: 6000 },
};

const mainnetBounds = getBoundsQueryKey({ path: { network: 'mainnet' } });

function setup(slotTimestamp: number): {
  queryClient: QueryClient;
  result: { current: ReturnType<typeof useSlotTableCoverage> };
  rerender: (props: { slotTimestamp: number }) => void;
} {
  global.fetch = vi.fn(() => new Promise<Response>(() => {}));
  const queryClient = createQueryClient({ retry: false });
  queryClient.setQueryData(mainnetBounds, bounds);
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={queryClient}>
      <NetworkContext.Provider
        value={{ currentNetwork: network, setCurrentNetwork: vi.fn(), networks: [network], isLoading: false }}
      >
        {children}
      </NetworkContext.Provider>
    </QueryClientProvider>
  );
  const { result, rerender } = renderHook(props => useSlotTableCoverage(props.slotTimestamp), {
    wrapper,
    initialProps: { slotTimestamp },
  });
  return { queryClient, result, rerender };
}

describe('useSlotTableCoverage', () => {
  it('reads each settled table up to its own max and head after it', () => {
    const { result } = setup(4500);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settled).toEqual({
      fct_attestation_correctness: true,
      fct_attestation_vote_by_block_root: false,
      fct_attestation_liveness_by_entity: true,
    });
  });

  it('gives a table start only for slots before it', () => {
    const { result } = setup(1500);

    expect(result.current.dataStart('fct_block_mev')).toBe(2000);
    expect(result.current.dataStart('fct_attestation_correctness')).toBeUndefined();
    expect(result.current.dataStart('not_a_table')).toBeUndefined();
  });

  it('keeps the choice for a slot when the settled table catches up, and re-decides for the next slot', () => {
    const { queryClient, result, rerender } = setup(5500);
    expect(result.current.settled.fct_attestation_correctness).toBe(false);

    act(() => {
      queryClient.setQueryData(mainnetBounds, {
        ...bounds,
        fct_attestation_correctness: { min: 1000, max: 7000 },
      });
    });
    expect(result.current.settled.fct_attestation_correctness).toBe(false);

    rerender({ slotTimestamp: 5512 });
    expect(result.current.settled.fct_attestation_correctness).toBe(true);
  });
});
