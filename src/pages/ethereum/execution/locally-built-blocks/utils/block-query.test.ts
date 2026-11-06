import { describe, expect, it } from 'vitest';
import { nodeIdOf, preparedBlockFilters, preparedBlockOrder } from './block-query';

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
