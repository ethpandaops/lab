import { describe, expect, it } from 'vitest';
import type { HistoryRow } from '../hooks/useNodeHistory';
import { spreadByBucket, summarizeByNode } from './history';
import { expectedSlots, getBuckets, parseBucket, weightedMedian } from './time-buckets';

const HOUR = 3600;
const DAY = 86400;

function row(start: number, nodeId: string, p50: number, count = 300): HistoryRow {
  return { start, nodeId, username: '', client: 'lighthouse', count, p10: null, p50, p90: null, p95: null };
}

describe('getBuckets', () => {
  // 2026-10-30 05:30 UTC
  const now = Date.UTC(2026, 9, 30, 5, 30) / 1000;

  it('ends with the hour in progress and covers 24 hourly buckets', () => {
    const buckets = getBuckets('24h', now);
    expect(buckets).toHaveLength(24);
    expect(buckets[23]).toBe(Date.UTC(2026, 9, 30, 5) / 1000);
    expect(buckets[0]).toBe(Date.UTC(2026, 9, 29, 6) / 1000);
  });

  it('uses UTC days for 30d', () => {
    const buckets = getBuckets('30d', now);
    expect(buckets).toHaveLength(30);
    expect(buckets[29]).toBe(Date.UTC(2026, 9, 30) / 1000);
    expect(buckets[1] - buckets[0]).toBe(DAY);
  });

  it('starts all history at the earliest day with data', () => {
    const buckets = getBuckets('all', now, Date.UTC(2026, 9, 27, 13) / 1000);
    expect(buckets).toEqual([27, 28, 29, 30].map(day => Date.UTC(2026, 9, day) / 1000));
  });
});

describe('parseBucket', () => {
  it('reads hourly unix seconds and daily dates as UTC midnight', () => {
    expect(parseBucket(1793336400)).toBe(1793336400);
    expect(parseBucket('2026-10-30')).toBe(Date.UTC(2026, 9, 30) / 1000);
    expect(parseBucket('')).toBeNull();
  });
});

describe('expectedSlots', () => {
  it('counts only the slots elapsed in the bucket in progress', () => {
    const start = Date.UTC(2026, 9, 30, 5) / 1000;
    expect(expectedSlots(start, 'hourly', start + 120)).toBe(10);
    expect(expectedSlots(start, 'hourly', start + 2 * HOUR)).toBe(300);
    expect(expectedSlots(start, 'daily', start + 2 * DAY)).toBe(7200);
  });
});

describe('weightedMedian', () => {
  it('weights each value by the slots behind it', () => {
    // Unweighted, the median of these three would be 1800; the 300-slot hour dominates
    expect(
      weightedMedian([
        { value: 9000, weight: 10 },
        { value: 1700, weight: 300 },
        { value: 1800, weight: 10 },
      ])
    ).toBe(1700);
    expect(weightedMedian([{ value: 5, weight: 0 }])).toBeNull();
  });
});

describe('spreadByBucket', () => {
  it('spreads node medians per bucket and leaves empty buckets null', () => {
    const rows = [row(0, 'a', 1000), row(0, 'b', 2000), row(0, 'c', 3000), row(HOUR, 'a', 1500)];
    const [first, second, third] = spreadByBucket(rows, [0, HOUR, 2 * HOUR]);
    expect(first).toMatchObject({ p50: 2000, nodeCount: 3 });
    expect(first.p10).toBeCloseTo(1200);
    expect(first.p90).toBeCloseTo(2800);
    expect(second).toMatchObject({ p10: 1500, p50: 1500, p90: 1500, nodeCount: 1 });
    expect(third).toEqual({ p10: null, p50: null, p90: null, nodeCount: 0 });
  });
});

describe('summarizeByNode', () => {
  it('sums slots and takes the slot-weighted median per node', () => {
    const summaries = summarizeByNode([row(0, 'a', 1600, 300), row(HOUR, 'a', 4000, 20), row(0, 'b', 2000, 300)]);
    expect(summaries.get('a')).toEqual({ p50: 1600, count: 320 });
    expect(summaries.get('b')).toEqual({ p50: 2000, count: 300 });
  });
});
