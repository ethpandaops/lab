import { describe, expect, it } from 'vitest';
import { dayShares, seriesDays } from './network-series';

type Row = { day_start_date: string; part: number; whole: number };

const rows: Row[] = [
  { day_start_date: '2026-04-02', part: 1, whole: 4 },
  { day_start_date: '2026-04-02', part: 3, whole: 16 },
  { day_start_date: '2026-03-31', part: 0, whole: 0 },
  { day_start_date: '2026-04-01', part: 5, whole: 5 },
];

describe('seriesDays', () => {
  it('sorts the days and drops those where the count is zero', () => {
    expect(seriesDays(rows)).toEqual(['2026-03-31', '2026-04-01', '2026-04-02']);
    expect(seriesDays(rows, row => row.whole)).toEqual(['2026-04-01', '2026-04-02']);
  });
});

describe('dayShares', () => {
  it('pools each day’s rows before dividing, and gives null on a day with no whole', () => {
    const shares = dayShares(
      rows,
      ['2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03'],
      row => row.part,
      row => row.whole
    );
    // 2026-04-02 pools to 4 of 20, not the mean of 25% and 18.75%
    expect(shares).toEqual([null, 100, 20, null]);
  });
});
