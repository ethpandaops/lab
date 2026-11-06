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
    const known = { ...day('2026-09-01', 1, 225, 200, 1), source_correct_count: 190, source_incorrect_count: 2 };
    // Before gossip data starts no source vote is known, so both counts are 0
    const beforeGossip = { ...day('2026-09-02', 1, 225, 225, 1), source_correct_count: 0, source_incorrect_count: 0 };
    const urls: URL[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        urls.push(url);
        const body = url.pathname.endsWith('fct_attestation_vote_correctness_by_validator_daily')
          ? { fct_attestation_vote_correctness_by_validator_daily: [known, beforeGossip] }
          : {};
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      })
    );

    const { result } = renderHook(() => useValidatorsData([1], 1788220800, 1788307200), { wrapper });

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(result.current.summary?.attestation.sourceCorrectRate).toBeCloseTo((190 / 192) * 100, 6);
    expect(result.current.validators[0].attestation.sourceCorrectRate).toBeCloseTo((190 / 192) * 100, 6);
    const [first, second] = result.current.attestationDaily;
    expect(first.sourceCorrectRate).toBeCloseTo((190 / 192) * 100, 6);
    // Unknown, not 100%
    expect(second.sourceCorrectRate).toBeNull();
    // Head and target still divide by attestations
    expect(result.current.summary?.attestation.headCorrectRate).toBe(100);
    // The rollup carries the wrong votes; nothing reads the per-slot table
    expect(urls.some(u => u.pathname.endsWith('fct_attestation_vote_correctness_by_validator'))).toBe(false);
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

  it('reads proposals to the range end and counts only those inside the weekly rollups', async () => {
    const monday = 1788134400; // 2026-08-31
    const sunday = monday + 6 * 86400;
    const rangeEnd = sunday + 3 * 86400;
    const urls: URL[] = [];
    const proposal = (ts: number): object => ({ validator_index: 1, slot_start_date_time: ts, status: 'canonical' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        urls.push(url);
        const body = url.pathname.endsWith('fct_block_proposer_by_validator')
          ? { fct_block_proposer_by_validator: [proposal(monday + 12), proposal(rangeEnd + 12)] }
          : {};
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      })
    );

    const { result } = renderHook(
      () => useValidatorsData([1], monday, sunday, { resolution: 'week', slotsEnd: rangeEnd + 86400 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    const read = urls.find(u => u.pathname.endsWith('fct_block_proposer_by_validator'));
    expect(read?.searchParams.get('slot_start_date_time_lt')).toBe(String(rangeEnd + 86400));
    expect(result.current.raw.blockProposal).toHaveLength(2);
    expect(result.current.summary?.blockProposal.totalProposals).toBe(1);
    expect(result.current.blockProposals).toHaveLength(1);
  });

  it('reads whole weeks weekly and adds up the days around them into partial weeks', async () => {
    const from = Date.UTC(2026, 9, 1) / 1000; // Thursday 2026-10-01
    const to = Date.UTC(2026, 10, 5) / 1000; // Thursday 2026-11-05, the range's last day
    const urls: URL[] = [];
    const balance = (date: string, start: number, end: number, min: number): object => ({
      day_start_date: date,
      validator_index: 1,
      start_balance: start,
      end_balance: end,
      min_balance: min,
      max_balance: end,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        urls.push(url);
        const table = url.pathname.split('/').pop() ?? '';
        const body: Record<string, object[]> = {
          fct_attestation_vote_correctness_by_validator_weekly: [
            { ...day('', 1, 1575, 1575, 1), day_start_date: undefined, week_start_date: '2026-10-26' },
          ],
          fct_attestation_vote_correctness_by_validator_daily: [
            { ...day('2026-11-02', 1, 225, 225, 1), source_correct_count: 220, source_incorrect_count: 5 },
            { ...day('2026-11-03', 1, 225, 125, 3), source_incorrect_count: 0 },
          ],
          fct_validator_balance_daily: [
            balance('2026-11-02', 32e9, 32.1e9, 31.9e9),
            balance('2026-11-03', 32.1e9, 32.2e9, 32.05e9),
          ],
        };
        return new Response(JSON.stringify({ [table]: body[table] ?? [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    const { result } = renderHook(() => useValidatorsData([1], from, to, { resolution: 'week' }), { wrapper });

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    const listed = (table: string, param: string): string | null | undefined =>
      urls.find(u => u.pathname.endsWith(table))?.searchParams.get(param);
    expect(listed('fct_attestation_vote_correctness_by_validator_weekly', 'week_start_date_in_values')).toBe(
      '2026-10-05,2026-10-12,2026-10-19,2026-10-26'
    );
    expect(listed('fct_attestation_vote_correctness_by_validator_daily', 'day_start_date_in_values')).toBe(
      '2026-10-01,2026-10-02,2026-10-03,2026-10-04,2026-11-02,2026-11-03,2026-11-04,2026-11-05'
    );
    // Every request names its days, weeks or times; none reads up to an open end
    for (const url of urls) {
      expect([...url.searchParams.keys()].some(k => k.endsWith('_ne'))).toBe(false);
      if (url.searchParams.has('slot_start_date_time_gte')) {
        expect(url.searchParams.get('slot_start_date_time_gte')).toBe(String(from));
        expect(url.searchParams.get('slot_start_date_time_lt')).toBe(String(to + 86400));
      }
    }

    // The days since Monday Nov 2 are one row under that Monday, after the last whole week
    const weeks = result.current.attestationDaily.map(p => p.timestamp).sort();
    expect(weeks).toEqual([Date.UTC(2026, 9, 26) / 1000, Date.UTC(2026, 10, 2) / 1000]);
    const partial = result.current.attestationDaily.find(p => p.timestamp === Date.UTC(2026, 10, 2) / 1000);
    expect(partial?.inclusionRate).toBeCloseTo((350 / 450) * 100, 6);
    // (1 × 225 + 3 × 125) / 350
    expect(partial?.avgInclusionDistance).toBeCloseTo(600 / 350, 6);
    expect(result.current.summary?.attestation.totalDuties).toBe(1575 + 450);
    // (220 + 125) correct of 350 known source votes
    expect(partial?.sourceCorrectRate).toBeCloseTo((345 / 350) * 100, 6);

    expect(result.current.raw.balance).toEqual([
      expect.objectContaining({
        day_start_date: '2026-11-02',
        start_balance: 32e9,
        end_balance: 32.2e9,
        min_balance: 31.9e9,
        max_balance: 32.2e9,
      }),
    ]);
    expect(result.current.validators[0].balance.endBalance).toBeCloseTo(32.2, 6);
  });
});
