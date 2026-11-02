import { describe, it, expect } from 'vitest';
import { dailyWindowStartDate, rollUpHourlyToDaily, trimDailyRecords } from './overview.utils';

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

describe('rollUpHourlyToDaily', () => {
  it('sums slot counts per status within each UTC day', () => {
    const lastHourOfJul12 = Date.UTC(2026, 6, 12, 23) / 1000;
    const firstHourOfJul13 = Date.UTC(2026, 6, 13, 0) / 1000;
    const secondHourOfJul13 = Date.UTC(2026, 6, 13, 1) / 1000;
    const result = rollUpHourlyToDaily([
      { hour_start_date_time: lastHourOfJul12, status: 'delivered', slot_count: 290 },
      { hour_start_date_time: firstHourOfJul13, status: 'delivered', slot_count: 280 },
      { hour_start_date_time: firstHourOfJul13, status: 'absent', slot_count: 20 },
      { hour_start_date_time: secondHourOfJul13, status: 'delivered', slot_count: 299 },
    ]);
    expect(result).toEqual(
      expect.arrayContaining([
        { day_start_date: '2026-07-12', status: 'delivered', slot_count: 290 },
        { day_start_date: '2026-07-13', status: 'delivered', slot_count: 579 },
        { day_start_date: '2026-07-13', status: 'absent', slot_count: 20 },
      ])
    );
    expect(result).toHaveLength(3);
  });
});
