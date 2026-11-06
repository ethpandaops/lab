import { describe, expect, it } from 'vitest';
import { activityEnd, rollupPeriods, weekSpan } from './range';

const DAY = 86_400;
const utc = (y: number, m: number, d: number, h = 0, min = 0, s = 0): number => Date.UTC(y, m - 1, d, h, min, s) / 1000;

describe('rollupPeriods', () => {
  it('reads whole weeks weekly and the days before and after them daily', () => {
    // Thursday Oct 1 to Thursday Nov 5
    expect(rollupPeriods(utc(2026, 10, 1), utc(2026, 11, 5), true)).toEqual({
      weeks: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'],
      days: [
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
      ],
    });
  });

  it('needs no days when the range is whole weeks', () => {
    // Monday Oct 5 to Sunday Nov 1
    expect(rollupPeriods(utc(2026, 10, 5), utc(2026, 11, 1), true).days).toEqual([]);
  });

  it('lists every day at daily grain', () => {
    expect(rollupPeriods(utc(2026, 11, 1), utc(2026, 11, 3), false)).toEqual({
      weeks: [],
      days: ['2026-11-01', '2026-11-02', '2026-11-03'],
    });
  });
});

describe('weekSpan', () => {
  it('cuts a week to the days inside the range', () => {
    expect(weekSpan(utc(2026, 11, 2), utc(2026, 10, 1), utc(2026, 11, 5))).toEqual([
      utc(2026, 11, 2),
      utc(2026, 11, 5),
    ]);
    expect(weekSpan(utc(2026, 9, 28), utc(2026, 10, 1), utc(2026, 11, 5))).toEqual([
      utc(2026, 10, 1),
      utc(2026, 10, 4),
    ]);
    expect(weekSpan(utc(2026, 10, 5), utc(2026, 10, 1), utc(2026, 11, 5))).toEqual([
      utc(2026, 10, 5),
      utc(2026, 10, 11),
    ]);
  });
});

describe('activityEnd', () => {
  const now = utc(2026, 11, 6, 2, 56, 20) * 1000;

  it('runs to now, rounded up to the minute, when the range ends on the last complete day', () => {
    expect(activityEnd(utc(2026, 11, 5), now)).toBe(utc(2026, 11, 6, 2, 57));
  });

  it('keeps an earlier end', () => {
    expect(activityEnd(utc(2026, 10, 31), now)).toBe(utc(2026, 10, 31) + DAY);
  });
});
