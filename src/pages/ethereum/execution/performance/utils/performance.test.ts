import { describe, expect, it } from 'vitest';
import type { FctEngineNewPayloadByElClient } from '@/api/types.gen';
import {
  chainDemand,
  clientPerformance,
  clientThroughput,
  fitFromSums,
  gasCeiling,
  histogramQuantile,
  mgasPerSecond,
  normalizeClient,
  rangeBounds,
  rangeDays,
  rollupBlocks,
  sensitivityCuts,
} from './performance';

describe('fitFromSums', () => {
  it('matches least squares on the points the sums came from', () => {
    // y = 10 + 2x with residuals +1, -1, -1, +1 at x = 0, 10, 20, 30, which have no slope: the fit is y = 10 + 2x,
    // with R² = 1 - 4 / 2004
    const points: [number, number][] = [
      [0, 11],
      [10, 29],
      [20, 49],
      [30, 71],
    ];
    const sum = (f: (p: [number, number]) => number): number => points.reduce((s, p) => s + f(p), 0);
    const fit = fitFromSums(
      points.length,
      sum(([x]) => x),
      sum(([x]) => x * x),
      sum(([, y]) => y),
      sum(([, y]) => y * y),
      sum(([x, y]) => x * y)
    );
    expect(fit.slope).toBeCloseTo(2, 10);
    expect(fit.intercept).toBeCloseTo(10, 10);
    expect(fit.r2).toBeCloseTo(1 - 4 / 2004, 6);
  });
});

describe('histogramQuantile', () => {
  it('interpolates inside the 1.04^k bucket holding the quantile', () => {
    // 10 blocks in bucket 100 and 30 in bucket 110: the median is the 20th block, 10 blocks into bucket 110
    const buckets = [
      { client: 'geth', bucket_index: 110, block_count: 30 },
      { client: 'geth', bucket_index: 100, block_count: 10 },
    ];
    const lower = 1.04 ** 110;
    expect(histogramQuantile(buckets, 0.5)).toBeCloseTo(lower + (lower * 0.04 * 10) / 30, 6);
    // The 10th block is the last of bucket 100, so P25 is that bucket's upper edge
    expect(histogramQuantile(buckets, 0.25)).toBeCloseTo(1.04 ** 101, 6);
  });
});

describe('sensitivityCuts', () => {
  it('takes the buckets up to the 20th percentile and from the 80th, or either side of one bucket holding both', () => {
    const cuts = sensitivityCuts([
      // compute: 10% of blocks at 20, 30% at 40, 40% at 50, 20% at 70 → 20th percentile in 40, 80th in 50
      { resource: 'compute', share_bucket_pct: 20, block_count: 10 },
      { resource: 'compute', share_bucket_pct: 40, block_count: 30 },
      { resource: 'compute', share_bucket_pct: 50, block_count: 40 },
      { resource: 'compute', share_bucket_pct: 70, block_count: 20 },
      // state access: 74% of blocks at 20, so both fifths fall there
      { resource: 'address_access', share_bucket_pct: 10, block_count: 7 },
      { resource: 'address_access', share_bucket_pct: 20, block_count: 74 },
      { resource: 'address_access', share_bucket_pct: 30, block_count: 19 },
      // memory: every block under 10%, so nothing is lighter
      { resource: 'memory', share_bucket_pct: 0, block_count: 100 },
    ]);
    expect(cuts.get('gas_compute')).toEqual({ low: 40, high: 50 });
    expect(cuts.get('gas_address_access')).toEqual({ low: 10, high: 30 });
    expect(cuts.has('gas_memory')).toBe(false);
  });
});

describe('rollupBlocks and clientPerformance', () => {
  // Reth versions a and b on the same slot fold into one block weighted 1:3; geth has its own blocks
  const block = (
    slot: number,
    client: string,
    gasM: number,
    p50: number,
    version = 'a',
    obs = 1
  ): FctEngineNewPayloadByElClient => ({
    slot,
    meta_execution_implementation: client,
    meta_execution_version: version,
    gas_used: gasM * 1e6,
    median_duration_ms: p50,
    avg_duration_ms: p50,
    p95_duration_ms: p50 * 2,
    observation_count: obs,
  });

  it('folds versions per block and derives throughput and cost model from sums', () => {
    const rollup = rollupBlocks(
      [
        block(1, 'Reth', 20, 40, 'a', 1),
        block(1, 'Reth', 20, 80, 'b', 3),
        block(2, 'Reth', 40, 100),
        block(1, 'go-ethereum', 20, 50),
      ],
      [],
      []
    );
    const reth = clientPerformance(rollup).find(c => c.client === 'reth')!;
    // Slot 1 folds to 70 ms: (40·1 + 80·3) / 4
    expect(reth.blockCount).toBe(2);
    expect(reth.throughput).toBeCloseTo(mgasPerSecond(60e6, 170));
    // Two points (20, 70) and (40, 100): slope 1.5 ms per Mgas, overhead 40 ms
    expect(reth.fitP50.slope).toBeCloseTo(1.5);
    expect(reth.fitP50.intercept).toBeCloseTo(40);
    expect(rollup.gasBuckets.filter(r => r.client === 'reth').map(r => r.gas_bucket_mgas)).toEqual([20, 40]);
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
    expect(result[0]?.throughput).toBeCloseTo(1000);
    expect(result[1]?.throughput).toBeCloseTo(150_000 / 350);
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
