import { describe, expect, it } from 'vitest';
import { getChunkIndex, getChunkLabel, periodTps } from './overview.utils';

describe('getChunkIndex', () => {
  it('puts a round gas limit target in the band that starts at it', () => {
    expect(getChunkLabel(getChunkIndex(60_000_000))).toBe('60–74M');
    expect(getChunkLabel(getChunkIndex(59_000_000))).toBe('45–59M');
    expect(getChunkLabel(getChunkIndex(36_000_000))).toBe('36–44M');
    expect(getChunkLabel(getChunkIndex(30_000_000))).toBe('30–35M');
    expect(getChunkLabel(getChunkIndex(29_000_000))).toBe('<30M');
    expect(getChunkLabel(getChunkIndex(75_000_000))).toBe('≥75M');
  });
});

describe('periodTps', () => {
  it('divides total transactions by total seconds rather than averaging per-block ratios', () => {
    // mainnet fct_execution_tps_daily 2021-06-01: avg_tps 37.9 (mean of per-block ratios)
    const tps = periodTps({ avg_tps: 37.9053, total_transactions: 1_274_161, total_seconds: 86_392 });
    expect(tps).toBeCloseTo(14.75, 2);
  });

  it('has no value for a period without elapsed time', () => {
    expect(periodTps({ total_transactions: 10, total_seconds: 0 })).toBeNull();
  });
});
