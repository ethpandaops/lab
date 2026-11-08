import { describe, expect, it } from 'vitest';
import { countDelta, layerCounts, onChainRows, rangeStartDay, rankPlaces, shareDelta } from './network-census';

describe('rangeStartDay', () => {
  it('counts the last day as the first of the range', () => {
    expect(rangeStartDay('2026-11-07', 7, '2026-02-23')).toBe('2026-11-01');
  });

  it('starts all history at the first day, or later at the floor', () => {
    expect(rangeStartDay('2026-11-07', null, '2026-02-23')).toBe('2026-02-23');
    expect(rangeStartDay('2026-11-07', null, '2025-07-25', '2026-07-15')).toBe('2026-07-15');
    expect(rangeStartDay('2026-11-07', 365, '2025-07-25', '2026-07-15')).toBe('2026-07-15');
  });

  it('never starts after the last day', () => {
    expect(rangeStartDay('2026-07-10', null, '2025-07-25', '2026-07-15')).toBe('2026-07-10');
  });
});

describe('rankPlaces', () => {
  const end = [
    { day_start_date: '2026-11-07', place: 'DE', client: 'lighthouse', peer_count: 30 },
    { day_start_date: '2026-11-07', place: 'DE', client: 'prysm', peer_count: 20 },
    { day_start_date: '2026-11-07', place: 'US', client: 'lighthouse', peer_count: 40 },
    { day_start_date: '2026-11-07', place: 'other', client: 'lighthouse', peer_count: 10 },
  ];
  const start = [{ day_start_date: '2026-02-23', place: 'DE', client: 'lighthouse', peer_count: 25 }];

  it('ranks places summed over clients, leaving out the rollup but counting it in shares', () => {
    const ranked = rankPlaces(end, start, row => row.place, 'other');
    expect(ranked.map(row => [row.key, row.peers, row.share, row.startPeers])).toEqual([
      ['DE', 50, 50, 25],
      ['US', 40, 40, null],
    ]);
  });
});

describe('deltas', () => {
  it('signs changes and keeps them neutral', () => {
    expect(countDelta(200, 150)).toEqual({ value: '−25.0%', type: 'neutral' });
    expect(countDelta(100, 104)).toEqual({ value: '+4.0%', type: 'neutral' });
    expect(countDelta(null, 10)).toBeUndefined();
    expect(shareDelta({ part: 50, whole: 100 }, { part: 60, whole: 200 })).toEqual({
      value: '−20.0 pts',
      type: 'neutral',
    });
  });
});

describe('layerCounts', () => {
  it('sums other agents as Other and skips peers without one', () => {
    const counts = layerCounts(
      [
        { client: 'prysm', n: 3 },
        { client: 'lighthouse', n: 5 },
        { client: 'lighthouse', n: 1 },
        { client: 'rust-libp2p', n: 2 },
        { client: 'unknown', n: 9 },
        { client: '', n: 4 },
      ],
      'consensus',
      row => row.n
    );
    expect(counts).toEqual({
      clients: [
        { client: 'lighthouse', count: 6 },
        { client: 'prysm', count: 3 },
      ],
      other: 2,
      whole: 11,
    });
  });
});

describe('onChainRows', () => {
  it('keeps the fork ID hash most nodes advertise each day', () => {
    const rows = [
      { day_start_date: '2026-11-06', fork_id_hash: '0xaa', node_count: 10 },
      { day_start_date: '2026-11-06', fork_id_hash: '0xaa', node_count: 5 },
      { day_start_date: '2026-11-06', fork_id_hash: '0xbb', node_count: 12 },
      { day_start_date: '2026-11-07', fork_id_hash: '0xbb', node_count: 3 },
      { day_start_date: '2026-11-07', fork_id_hash: '0xcc', node_count: 30 },
    ];
    expect(onChainRows(rows)).toEqual([rows[0], rows[1], rows[4]]);
  });
});
