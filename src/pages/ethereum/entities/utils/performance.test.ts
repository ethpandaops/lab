import { describe, expect, it } from 'vitest';

import { addCounts, compare, EMPTY_COUNTS, formatPeriod, metricById, metricValue, toCounts } from './performance';

const network = toCounts({
  total_duties: 100_000_000,
  attested_count: 99_500_000,
  head_correct_count: 99_000_000,
  target_correct_count: 99_400_000,
  block_count: 99_000,
  orphaned_block_count: 200,
  missed_slot_count: 800,
  mev_block_count: 90_000,
});

describe('compare', () => {
  it('reads a gap inside chance as level for a small entity, and the same gap as worse for a large one', () => {
    const attested = metricById('attested');
    // 99.4% against the network's 99.5%: 0.1 pts below
    const small = toCounts({ total_duties: 1_000, attested_count: 994 });
    const large = toCounts({ total_duties: 10_000_000, attested_count: 9_940_000 });
    expect(compare(attested, small, network).verdict).toBe('level');
    const result = compare(attested, large, network);
    expect(result.verdict).toBe('worse');
    expect(result.difference).toBeCloseTo(-0.1, 6);
  });

  it('marks a share too thin to compare when it expects fewer than five events', () => {
    // Network misses 0.8% of proposals: 300 proposals expect 2.4 misses
    const few = toCounts({ block_count: 300 });
    expect(compare(metricById('missed'), few, network).verdict).toBe('thin');
  });

  it('reads fewer misses than the network as better on a lower-is-better metric', () => {
    const own = toCounts({ block_count: 49_950, missed_slot_count: 50 });
    expect(compare(metricById('missed'), own, network).verdict).toBe('better');
  });

  it('never colours a metric where neither direction is better', () => {
    const own = toCounts({ block_count: 10_000, mev_block_count: 5_000 });
    expect(compare(metricById('mev'), own, network).verdict).toBe('apart');
  });
});

describe('toCounts', () => {
  it('weights inclusion distance and MEV value by the attestations and blocks behind them', () => {
    const combined = addCounts(
      addCounts(
        EMPTY_COUNTS,
        toCounts({ attested_count: 900, avg_inclusion_distance: 1, mev_block_count: 1, avg_mev_value_eth: 1 })
      ),
      toCounts({
        attested_count: 100,
        avg_inclusion_distance: 3,
        mev_block_count: 3,
        avg_mev_value_eth: 0.2,
        block_count: 4,
      })
    );
    expect(metricValue(metricById('inclusion'), combined)).toBeCloseTo(1.2, 9);
    expect(metricValue(metricById('mev-value'), combined)).toBeCloseTo(0.4, 9);
  });

  it('leaves rows without an average out of that average', () => {
    const combined = addCounts(
      toCounts({ attested_count: 100, avg_inclusion_distance: 2 }),
      toCounts({ attested_count: 900, avg_inclusion_distance: null })
    );
    expect(metricValue(metricById('inclusion'), combined)).toBe(2);
  });
});

describe('formatPeriod', () => {
  it('names the last day of a day period, not its exclusive end', () => {
    const start = Date.UTC(2026, 9, 5) / 1000;
    const end = Date.UTC(2026, 10, 4) / 1000;
    expect(formatPeriod(start, end)).toBe("Oct 5 '26 to Nov 3 '26");
  });

  it('shows hours for an hour period', () => {
    const end = Date.UTC(2026, 10, 4, 15) / 1000;
    expect(formatPeriod(end - 86_400, end)).toBe("Nov 3 '26 15:00 to Nov 4 '26 15:00 UTC");
  });
});
