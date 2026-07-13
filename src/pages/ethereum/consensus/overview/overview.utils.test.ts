import { describe, it, expect } from 'vitest';
import { dailyWindowStartDate, trimDailyRecords } from './overview.utils';

describe('dailyWindowStartDate', () => {
  // 2026-07-13T12:00:00Z
  const now = Date.UTC(2026, 6, 13, 12, 0, 0);

  it('returns undefined for an unbounded ("all") window', () => {
    expect(dailyWindowStartDate(null, now)).toBeUndefined();
  });

  it('spans exactly 30 calendar days including today', () => {
    expect(dailyWindowStartDate(30, now)).toBe('2026-06-14');
  });

  it('spans exactly 180 calendar days including today', () => {
    expect(dailyWindowStartDate(180, now)).toBe('2026-01-15');
  });

  it('spans exactly 365 calendar days including today', () => {
    expect(dailyWindowStartDate(365, now)).toBe('2025-07-14');
  });
});

describe('trimDailyRecords', () => {
  const records = [
    { day_start_date: '2025-01-01', value: 1 },
    { day_start_date: '2026-01-14', value: 2 },
    { day_start_date: '2026-07-13', value: 3 },
  ];

  it('returns an empty array for nullish records', () => {
    expect(trimDailyRecords(undefined, '2026-01-01')).toEqual([]);
  });

  it('returns records unchanged when startDate is undefined (the "all" window)', () => {
    expect(trimDailyRecords(records, undefined)).toBe(records);
  });

  it('keeps only records on or after the cutoff (inclusive)', () => {
    expect(trimDailyRecords(records, '2026-01-14')).toEqual([
      { day_start_date: '2026-01-14', value: 2 },
      { day_start_date: '2026-07-13', value: 3 },
    ]);
  });

  it('treats a missing day_start_date as excluded', () => {
    const withMissing = [{ value: 9 }, ...records];
    expect(trimDailyRecords(withMissing, '2025-01-01')).toEqual(records);
  });
});
