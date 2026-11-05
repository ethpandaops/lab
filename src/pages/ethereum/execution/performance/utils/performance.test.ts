import { describe, expect, it } from 'vitest';
import {
  blockSlices,
  chainDemand,
  clientThroughput,
  gasCeiling,
  linearFit,
  mgasPerSecond,
  normalizeClient,
  rangeBounds,
  rangeDays,
} from './performance';

describe('linearFit', () => {
  it('recovers overhead and marginal cost from noisy-free points', () => {
    // 7 ms overhead + 1.5 ms per Mgas
    const points: [number, number][] = [5, 12, 30, 47, 60].map(g => [g, 7 + 1.5 * g]);
    const fit = linearFit(points);
    expect(fit.intercept).toBeCloseTo(7, 10);
    expect(fit.slope).toBeCloseTo(1.5, 10);
    expect(fit.r2).toBeCloseTo(1, 10);
  });
});

describe('gasCeiling', () => {
  it('is the block size whose fitted duration equals the budget', () => {
    expect(gasCeiling({ intercept: 10, slope: 2.5, r2: 1 }, 1000)).toBeCloseTo(396);
  });

  it('ignores a negative fitted overhead', () => {
    expect(gasCeiling({ intercept: -20, slope: 2, r2: 1 }, 500)).toBe(250);
  });
});

describe('mgasPerSecond', () => {
  it('converts gas over milliseconds to Mgas/s', () => {
    expect(mgasPerSecond(30_000_000, 50)).toBe(600);
    expect(mgasPerSecond(30_000_000, 0)).toBe(0);
  });
});

describe('chainDemand', () => {
  it('spreads gas used over 12 s per block', () => {
    expect(
      chainDemand([
        { total_gas_used: 9_000_000_000, block_count: 300 },
        { total_gas_used: 3_000_000_000, block_count: 100 },
      ])
    ).toBeCloseTo(2.5);
  });
});

describe('clientThroughput', () => {
  it('weights every hour and version by its observations', () => {
    const rows = [
      // geth: 3 obs of 30M gas in 50 ms, 1 obs of 60M gas in 200 ms → 150M gas / 350 ms
      { meta_execution_implementation: 'go-ethereum', observation_count: 3, avg_gas_used: 30e6, avg_duration_ms: 50 },
      { meta_execution_implementation: 'Geth', observation_count: 1, avg_gas_used: 60e6, avg_duration_ms: 200 },
      { meta_execution_implementation: 'Reth', observation_count: 2, avg_gas_used: 30e6, avg_duration_ms: 30 },
      { meta_execution_implementation: 'Besu', observation_count: 0, avg_gas_used: 30e6, avg_duration_ms: 10 },
    ];
    const result = clientThroughput(rows);
    expect(result.map(r => r.client)).toEqual(['reth', 'geth']);
    expect(result[0].throughput).toBeCloseTo(1000);
    expect(result[1].throughput).toBeCloseTo(150_000 / 350);
  });
});

describe('blockSlices', () => {
  const H = 3600;

  it('reads the whole range up to 6 hours', () => {
    expect(blockSlices(1000, 1000 + 6 * H)).toEqual([[1000, 1000 + 6 * H]]);
  });

  it('spreads 28 fifteen-minute slices evenly, the last ending at the range end', () => {
    const start = 1_700_000_000;
    const end = start + 7 * 24 * H;
    const slices = blockSlices(start, end);
    expect(slices).toHaveLength(28);
    expect(slices.every(([s, e]) => e - s === 900 && s >= start && e <= end)).toBe(true);
    expect(slices[0]).toEqual([start + 6 * H - 900, start + 6 * H]);
    expect(slices[27][1]).toBe(end);
  });
});

describe('rangeDays', () => {
  const day = Date.UTC(2026, 10, 2) / 1000;
  // Two days later, so `day` and the day after are complete
  const later = (day + 2 * 86400 + 3600) * 1000;

  it('widens an hour inside one day to that day', () => {
    expect(rangeDays(day + 5 * 3600, day + 6 * 3600, later)).toEqual({ start: day, end: day + 86400 });
  });

  it('takes both days a range crossing midnight touches, and no more when it ends at midnight', () => {
    expect(rangeDays(day - 3600, day + 3600, later)).toEqual({ start: day - 86400, end: day + 86400 });
    expect(rangeDays(day - 86400, day, later)).toEqual({ start: day - 86400, end: day });
  });

  it('leaves out the day in progress', () => {
    const now = (day + 13 * 3600) * 1000;
    expect(rangeDays(day - 86400 - 3600, day + 12 * 3600, now)).toEqual({ start: day - 2 * 86400, end: day });
    // A range inside the day in progress takes the last complete day
    expect(rangeDays(day + 11 * 3600, day + 12 * 3600, now)).toEqual({ start: day - 86400, end: day });
  });
});

describe('normalizeClient', () => {
  it('lowercases and folds go-ethereum into geth', () => {
    expect(normalizeClient('go-ethereum')).toBe('geth');
    expect(normalizeClient('Nethermind')).toBe('nethermind');
    expect(normalizeClient(undefined)).toBe('unknown');
  });
});

describe('rangeBounds', () => {
  // 2026-11-05 13:20 UTC
  const now = Date.UTC(2026, 10, 5, 13, 20);

  it('ends a fixed range at the last full hour', () => {
    expect(rangeBounds(3600, 0, now)).toEqual({
      start: Date.UTC(2026, 10, 5, 12) / 1000,
      end: Date.UTC(2026, 10, 5, 13) / 1000,
    });
  });

  it('runs All from the first data day to the last full day', () => {
    // First data at 2025-12-09 00:29:23 UTC
    expect(rangeBounds(null, Date.UTC(2025, 11, 9, 0, 29, 23) / 1000, now)).toEqual({
      start: Date.UTC(2025, 11, 9) / 1000,
      end: Date.UTC(2026, 10, 5) / 1000,
    });
  });
});
