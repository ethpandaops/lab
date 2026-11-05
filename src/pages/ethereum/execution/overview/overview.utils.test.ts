import { describe, expect, it } from 'vitest';
import { getChunkIndex, getChunkLabel, periodTps, timedRows } from './overview.utils';

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

describe('timedRows', () => {
  it('drops a row dated before the first Ethereum block instead of stretching the axis back to 1970', () => {
    // mainnet fct_execution_gas_used_daily had a 1970-01-01 row for the genesis block (timestamp 0)
    const { times } = timedRows(
      [{ day_start_date: '1970-01-01' }, { day_start_date: '2015-07-30' }, { day_start_date: '2015-07-31' }],
      86_400
    );
    expect(times).toEqual([Date.UTC(2015, 6, 30) / 1000, Date.UTC(2015, 6, 31) / 1000]);
  });

  it('breaks the line at a gap with one empty point, not one per missing bucket', () => {
    const hour = 3600;
    const start = Date.UTC(2026, 10, 1) / 1000;
    const { times, byTime } = timedRows(
      [
        { hour_start_date_time: start + 10 * hour },
        { hour_start_date_time: start },
        { hour_start_date_time: start + hour },
      ],
      hour
    );
    expect(times).toEqual([start, start + hour, start + 2 * hour, start + 10 * hour]);
    expect(byTime.has(start + 2 * hour)).toBe(false);
  });
});
