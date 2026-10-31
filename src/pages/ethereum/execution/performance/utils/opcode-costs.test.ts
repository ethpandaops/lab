import { describe, expect, it } from 'vitest';
import type { FctOpcodeCostByElClientDaily, FctOpcodeCostByElClientVersion } from '@/api/types.gen';
import {
  OPCODE_GROUPS,
  buildOpcodeCostModel,
  isMispriced,
  medianWithInterval,
  repricingCandidates,
  type OpcodeCost,
} from './opcode-costs';

/** One day's rows for a client: every opcode at `ratio`, with overrides per opcode */
function day(
  date: string,
  client: string,
  overrides: Record<string, number>,
  blocks = 7000,
  versions = ['v1']
): FctOpcodeCostByElClientDaily[] {
  return OPCODE_GROUPS.map(g => ({
    day_start_date: date,
    meta_execution_implementation: client,
    opcode_group: g,
    block_count: blocks,
    gas_share: g === 'SLOAD' ? 0.2 : 0.01,
    gas_per_op: 3,
    price_ratio: overrides[g] ?? 1,
    ns_per_op: (overrides[g] ?? 1) * 10,
    meta_execution_versions: versions,
  }));
}

const cost = (ratio: number, lo: number, hi: number): OpcodeCost => ({
  ratio,
  lo,
  hi,
  nsPerOp: 0,
  nsLo: 0,
  nsHi: 0,
});

describe('isMispriced', () => {
  it('needs the interval to exclude 1 and the estimate to be at least 10% off', () => {
    expect(isMispriced(cost(1.5, 1.2, 1.8))).toBe(true);
    expect(isMispriced(cost(0.5, 0.3, 0.8))).toBe(true);
    // Interval straddles 1
    expect(isMispriced(cost(1.5, 0.9, 2))).toBe(false);
    // Excludes 1 but only 5% away
    expect(isMispriced(cost(1.05, 1.01, 1.09))).toBe(false);
  });
});

describe('medianWithInterval', () => {
  it('returns the median and an interval that contains it, the same on every call', () => {
    const values = [1, 1.2, 5, 1.1, 0.9, 1.3, 1.05];
    const a = medianWithInterval(values, 3);
    expect(a.value).toBe(1.1);
    expect(a.lo).toBeLessThanOrEqual(a.value);
    expect(a.hi).toBeGreaterThanOrEqual(a.value);
    // The one outlier day shouldn't drag the upper bound to it
    expect(a.hi).toBeLessThan(5);
    expect(medianWithInterval(values, 3)).toEqual(a);
  });
});

describe('buildOpcodeCostModel', () => {
  it('takes the median of daily fits and drops partial days', () => {
    const rows = [
      ...day('2026-10-20', 'go-ethereum', { STACK: 3 }),
      ...day('2026-10-21', 'go-ethereum', { STACK: 4 }),
      ...day('2026-10-22', 'go-ethereum', { STACK: 10 }),
      // Partial day, too few blocks
      ...day('2026-10-23', 'go-ethereum', { STACK: 100 }, 500),
    ];
    const model = buildOpcodeCostModel(rows, [])!;
    expect(model.clients.map(c => c.client)).toEqual(['geth']);
    const geth = model.clients[0];
    expect(geth.daily.map(d => d.day)).toEqual([
      Date.parse('2026-10-20T00:00:00Z') / 1000,
      Date.parse('2026-10-21T00:00:00Z') / 1000,
      Date.parse('2026-10-22T00:00:00Z') / 1000,
    ]);
    const stack = OPCODE_GROUPS.indexOf('STACK');
    expect(geth.ratios[stack].ratio).toBe(4);
    expect(geth.ratios[stack].nsPerOp).toBe(40);
    expect(model.days).toBe(3);
    expect(model.opcodes[stack].pricedFor).toBe('execution');
    expect(model.opcodes[OPCODE_GROUPS.indexOf('SSTORE')].pricedFor).toBe('state');
  });

  it('attaches release fits to their client', () => {
    const versions: FctOpcodeCostByElClientVersion[] = OPCODE_GROUPS.map(g => ({
      meta_execution_implementation: 'Reth',
      meta_execution_version: '2.9.0',
      opcode_group: g,
      first_seen_date_time: 100,
      last_seen_date_time: 200,
      block_count: 9000,
      hour_count: 30,
      price_ratio: 1.2,
      price_ratio_lower: 1.1,
      price_ratio_upper: 1.3,
      ns_per_op: 12,
      ns_per_op_lower: 11,
      ns_per_op_upper: 13,
    }));
    const model = buildOpcodeCostModel(day('2026-10-20', 'Reth', {}), versions)!;
    expect(model.clients[0].versions).toHaveLength(1);
    expect(model.clients[0].versions[0].ratios[0]).toEqual({
      ratio: 1.2,
      lo: 1.1,
      hi: 1.3,
      nsPerOp: 12,
      nsLo: 11,
      nsHi: 13,
    });
  });
});

describe('repricingCandidates', () => {
  it('ranks execution-priced opcodes slower than priced, skipping state-priced ones', () => {
    const rows = [
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
    ].flatMap((d, i) => day(d, 'Besu', { STACK: 3 + i * 0.01, SLOAD: 1.6 + i * 0.01, SSTORE: 5, MUL: 0.5 }));
    const model = buildOpcodeCostModel(rows, [])!;
    expect(repricingCandidates(model, 4).map(c => c.opcode.key)).toEqual(['STACK', 'SLOAD']);
  });
});
