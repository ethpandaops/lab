import { describe, expect, it } from 'vitest';
import type { HistoryRow } from '@/pages/xatu/nodes/hooks/useNodeHistory';
import { behindStarts, medianByClient, summarizeByNode } from './history';
import { bucketFilter, getBuckets, parseBucket, weekStart, weightedMedian } from './time-buckets';

const HOUR = 3600;
const DAY = 86400;

function row(start: number, nodeId: string, p50: number, count = 300): HistoryRow {
  return { start, nodeId, username: '', client: 'lighthouse', count, p10: null, p50, p90: null, p95: null };
}

describe('getBuckets', () => {
  // 2026-10-30 05:30 UTC
  const now = Date.UTC(2026, 9, 30, 5, 30) / 1000;

  it('ends with the last complete hour and covers 24 hourly buckets', () => {
    const buckets = getBuckets('24h', now);
    expect(buckets).toHaveLength(24);
    expect(buckets[23]).toBe(Date.UTC(2026, 9, 30, 4) / 1000);
    expect(buckets[0]).toBe(Date.UTC(2026, 9, 29, 5) / 1000);
  });

  it('uses complete UTC days for 30d', () => {
    const buckets = getBuckets('30d', now);
    expect(buckets).toHaveLength(30);
    expect(buckets[29]).toBe(Date.UTC(2026, 9, 29) / 1000);
    const [first, second] = buckets;
    if (first === undefined || second === undefined) throw new Error('Expected at least two buckets');
    expect(second - first).toBe(DAY);
  });

  it('starts all history at the Monday of the earliest week with data and ends with the last complete week', () => {
    // Tuesday Oct 13; the week in progress starts Monday Oct 26
    const buckets = getBuckets('all', now, Date.UTC(2026, 9, 13, 13) / 1000);
    expect(buckets).toEqual([12, 19].map(day => Date.UTC(2026, 9, day) / 1000));
  });

  it('reads all history by day for tables without weekly rollups', () => {
    const buckets = getBuckets('all', now, Date.UTC(2026, 9, 27, 13) / 1000, 'daily');
    expect(buckets).toEqual([27, 28, 29].map(day => Date.UTC(2026, 9, day) / 1000));
  });
});

describe('weekStart', () => {
  it('returns the Monday starting the UTC week', () => {
    expect(weekStart(Date.UTC(2026, 9, 30, 5, 30) / 1000)).toBe(Date.UTC(2026, 9, 26) / 1000);
    expect(weekStart(Date.UTC(2026, 9, 26) / 1000)).toBe(Date.UTC(2026, 9, 26) / 1000);
  });
});

describe('bucketFilter', () => {
  it('reads every bucket but the one in progress for all history', () => {
    const weeks = [Date.UTC(2026, 9, 12) / 1000, Date.UTC(2026, 9, 19) / 1000];
    expect(bucketFilter('weekly', weeks, true)).toEqual({ week_start_date_ne: '2026-10-26' });
    expect(bucketFilter('daily', [Date.UTC(2026, 9, 29) / 1000], true)).toEqual({ day_start_date_ne: '2026-10-30' });
  });

  it('lists the days of a fixed range', () => {
    const days = [Date.UTC(2026, 9, 28) / 1000, Date.UTC(2026, 9, 29) / 1000];
    expect(bucketFilter('daily', days, false)).toEqual({ day_start_date_in_values: '2026-10-28,2026-10-29' });
  });
});

describe('parseBucket', () => {
  it('reads hourly unix seconds and daily dates as UTC midnight', () => {
    expect(parseBucket(1793336400)).toBe(1793336400);
    expect(parseBucket('2026-10-30')).toBe(Date.UTC(2026, 9, 30) / 1000);
    expect(parseBucket('')).toBeNull();
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

describe('summarizeByNode', () => {
  it('sums slots and takes the slot-weighted median per node', () => {
    const summaries = summarizeByNode([row(0, 'a', 1600, 300), row(HOUR, 'a', 4000, 20), row(0, 'b', 2000, 300)]);
    expect(summaries.get('a')).toEqual({ p50: 1600, count: 320 });
    expect(summaries.get('b')).toEqual({ p50: 2000, count: 300 });
  });
});

describe('behindStarts', () => {
  it('flags hours a node trails the network median by more than a slot, not hours the whole network is late', () => {
    // Hour 0: network ~1.7s, node catching up at 30s. Hour 1: the whole network is late (Holesky-style), node too.
    const rows = [
      row(0, 'a', 1600),
      row(0, 'b', 1700),
      row(0, 'c', 1800),
      row(0, 'sync', 30000, 20),
      row(HOUR, 'a', 40000),
      row(HOUR, 'b', 42000),
      row(HOUR, 'sync', 45000),
    ];
    // The network rollup's median of node medians per hour
    const medians = new Map([
      [0, 1750],
      [HOUR, 42000],
    ]);
    expect(
      behindStarts(
        rows.filter(r => r.nodeId === 'sync'),
        medians
      )
    ).toEqual(new Set([0]));
  });

  it('leaves a catching-up node out of its client median', () => {
    const rows = [
      row(0, 'a', 1600),
      row(0, 'b', 1800),
      { ...row(0, 'sync', 60000), client: 'grandine' },
      {
        ...row(0, 'g', 1900),
        client: 'grandine',
      },
    ];
    const grandine = medianByClient(rows, [0], new Map([[0, 1850]])).find(c => c.client === 'grandine')!;
    expect(grandine.p50).toEqual([1900]);
    expect(grandine.nodeCount).toBe(2);
  });
});
