import { describe, expect, it, vi } from 'vitest';
import { fctPreparedBlockServiceList } from '@/api/sdk.gen';
import { fetchNewestPreparedBlocks, nodeIdOf, preparedBlockFilters, preparedBlockOrder } from './block-query';

vi.mock('@/api/sdk.gen', () => ({
  fctPreparedBlockServiceList: vi.fn(async () => ({ data: { fct_prepared_block: [] } })),
}));

const GENESIS = 1_606_824_023;

describe('preparedBlockFilters', () => {
  it('uses the time window when no slot range is set', () => {
    expect(preparedBlockFilters({}, 1_700_000_000, GENESIS)).toEqual({ slot_start_date_time_gte: 1_700_000_000 });
  });

  it('replaces the window with the slot range and converts units', () => {
    expect(
      preparedBlockFilters(
        { slotFrom: 100, slotTo: 110, gasMin: 30, gasMax: 0.5, sizeMin: 64, txsMin: 0, el: 'geth', node: 'a-geth-001' },
        1_700_000_000,
        GENESIS
      )
    ).toEqual({
      slot_start_date_time_gte: GENESIS + 100 * 12,
      slot_start_date_time_lte: GENESIS + 110 * 12,
      execution_payload_gas_used_gte: 30_000_000,
      execution_payload_gas_used_lte: 500_000,
      block_total_bytes_gte: 65_536,
      execution_payload_transactions_count_gte: 0,
      meta_client_name_like: '%-geth-%',
      meta_client_name_ends_with: '/a-geth-001',
    });
  });
});

describe('preparedBlockOrder', () => {
  it('breaks ties on slot and node so pages do not overlap', () => {
    expect(preparedBlockOrder('slot', 'asc')).toBe('slot_start_date_time asc, meta_client_name asc');
    expect(preparedBlockOrder('gas', 'desc')).toBe(
      'execution_payload_gas_used desc, slot_start_date_time desc, meta_client_name asc'
    );
    expect(preparedBlockOrder('node', 'asc')).toBe('meta_client_name asc, slot_start_date_time desc');
  });
});

describe('nodeIdOf', () => {
  it('takes the last segment of the node name', () => {
    expect(nodeIdOf('ethpandaops/mainnet/utility-mainnet-teku-erigon-003')).toBe('utility-mainnet-teku-erigon-003');
    expect(nodeIdOf(undefined)).toBeUndefined();
  });
});

describe('fetchNewestPreparedBlocks', () => {
  it('reads widening windows inside the slot range, never the open range', async () => {
    const list = vi.mocked(fctPreparedBlockServiceList);
    list.mockClear();
    const end = GENESIS + 110 * 12;
    await fetchNewestPreparedBlocks(
      {
        slot_start_date_time_gte: end - 2 * 3600,
        slot_start_date_time_lte: end,
        meta_consensus_implementation_eq: 'teku',
      },
      25,
      undefined
    );
    const queries = list.mock.calls.map(([options]) => options?.query);
    expect(queries).toEqual([
      expect.objectContaining({ slot_start_date_time_gte: end + 1 - 3600, slot_start_date_time_lt: end + 1 }),
      expect.objectContaining({ slot_start_date_time_gte: end - 2 * 3600, slot_start_date_time_lt: end + 1 }),
    ]);
    for (const query of queries) {
      expect(query).not.toHaveProperty('slot_start_date_time_lte');
      expect(query).toMatchObject({
        meta_consensus_implementation_eq: 'teku',
        order_by: 'slot_start_date_time desc, meta_client_name asc',
        page_size: 26,
      });
    }
  });
});
