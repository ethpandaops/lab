import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { JSX, ReactNode } from 'react';
import { client } from '@/api/client.gen';
import { NetworkContext } from '@/contexts/NetworkContext';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import { useValidatorsData } from './useValidatorsData';

const network: Network = {
  name: 'mainnet',
  display_name: 'Mainnet',
  chain_id: 1,
  genesis_time: 1606824000,
  genesis_delay: 0,
  forks: { consensus: {} },
};

const day = (date: string, validator: number, duties: number, attested: number, delay: number | null): object => ({
  day_start_date: date,
  validator_index: validator,
  total_duties: duties,
  attested_count: attested,
  missed_count: duties - attested,
  head_correct_count: attested,
  target_correct_count: attested,
  source_correct_count: attested,
  avg_inclusion_distance: delay,
});

const ATTESTATIONS = {
  fct_attestation_vote_correctness_by_validator_daily: [
    day('2026-09-01', 1, 225, 200, 1),
    day('2026-09-02', 1, 225, 10, 2),
    // Offline: duties but no attestations
    day('2026-09-03', 1, 225, 0, null),
    // No duties at all
    day('2026-09-01', 2, 0, 0, null),
  ],
};

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkContext.Provider
        value={{ currentNetwork: network, setCurrentNetwork: vi.fn(), networks: [network], isLoading: false }}
      >
        {children}
      </NetworkContext.Provider>
    </QueryClientProvider>
  );
}

describe('useValidatorsData', () => {
  // Node's fetch needs an absolute URL
  beforeAll(() => client.setConfig({ baseUrl: 'http://localhost' }));
  afterEach(() => vi.unstubAllGlobals());

  it('weights the inclusion delay by attestations and leaves rates with nothing to divide by empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        const body = request.url.includes('fct_attestation_vote_correctness_by_validator_daily') ? ATTESTATIONS : {};
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      })
    );

    const { result } = renderHook(() => useValidatorsData([1, 2], 1788220800, 1788393600), { wrapper });

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    const [one, two] = result.current.validators;
    // (1 × 200 + 2 × 10) / 210, where averaging the daily averages would give 1.5
    expect(one.attestation.avgInclusionDistance).toBeCloseTo(220 / 210, 6);
    expect(one.attestation.inclusionRate).toBeCloseTo((210 / 675) * 100, 6);
    expect(two.attestation.inclusionRate).toBeNull();
    expect(two.attestation.headCorrectRate).toBeNull();

    const offline = result.current.attestationDaily.find(
      p => p.validatorIndex === 1 && p.avgInclusionDistance === null
    );
    expect(offline?.inclusionRate).toBe(0);
    expect(offline?.headCorrectRate).toBeNull();
    expect(offline?.targetCorrectRate).toBeNull();
  });

  it('divides source by known source votes, leaving out attestations never seen on gossip', async () => {
    // 200 attestations: 190 with a correct source, 2 with a wrong one, 8 never seen on gossip
    const daily = { ...day('2026-09-01', 1, 225, 200, 1), source_correct_count: 190 };
    const wrong = [1, 2].map(n => ({ validator_index: 1, slot_start_date_time: 1788220800 + n * 12 }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        const body = url.pathname.endsWith('fct_attestation_vote_correctness_by_validator_daily')
          ? { fct_attestation_vote_correctness_by_validator_daily: [daily] }
          : url.pathname.endsWith('fct_attestation_vote_correctness_by_validator') &&
              url.searchParams.get('source_correct_eq') === 'false'
            ? { fct_attestation_vote_correctness_by_validator: wrong }
            : {};
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      })
    );

    const { result } = renderHook(() => useValidatorsData([1], 1788220800, 1788220800), { wrapper });

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(result.current.summary?.attestation.sourceCorrectRate).toBeCloseTo((190 / 192) * 100, 6);
    expect(result.current.validators[0].attestation.sourceCorrectRate).toBeCloseTo((190 / 192) * 100, 6);
    expect(result.current.attestationDaily[0].sourceCorrectRate).toBeCloseTo((190 / 192) * 100, 6);
    // Head and target still divide by attestations
    expect(result.current.summary?.attestation.headCorrectRate).toBe(100);
  });

  it('asks for 250 validators per request and follows page tokens', async () => {
    const urls: URL[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        urls.push(url);
        const body = url.pathname.endsWith('fct_validator_balance_daily')
          ? url.searchParams.get('page_token')
            ? { fct_validator_balance_daily: [{ day_start_date: '2026-09-01', validator_index: 2, end_balance: 1 }] }
            : {
                fct_validator_balance_daily: [{ day_start_date: '2026-09-01', validator_index: 1, end_balance: 1 }],
                next_page_token: 'next',
              }
          : {};
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      })
    );

    const indices = Array.from({ length: 300 }, (_, i) => i + 1);
    const { result } = renderHook(() => useValidatorsData(indices, 1788220800, 1788220800), { wrapper });

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    const sizes = urls
      .filter(u => u.pathname.endsWith('fct_attestation_vote_correctness_by_validator_daily'))
      .map(u => u.searchParams.get('validator_index_in_values')?.split(',').length);
    expect(sizes).toEqual([250, 50]);
    // Two chunks, each with a second page
    expect(urls.filter(u => u.pathname.endsWith('fct_validator_balance_daily'))).toHaveLength(4);
    expect(result.current.raw.balance).toHaveLength(4);
  });
});
