import { describe, it, expect } from 'vitest';
import type { ThemeColors } from '@/hooks/useThemeColors';
import {
  buildProposalStatusChartConfig,
  buildReorgChartConfig,
  dailyWindowStartDate,
  trimDailyRecords,
} from './overview.utils';

describe('dailyWindowStartDate', () => {
  // 2026-07-13T12:00:00Z
  const now = Date.UTC(2026, 6, 13, 12, 0, 0);

  it('returns undefined for an unbounded ("all") window', () => {
    expect(dailyWindowStartDate(null, now)).toBeUndefined();
  });

  it('spans 30 complete days ending yesterday', () => {
    expect(dailyWindowStartDate(30, now)).toBe('2026-06-13');
  });

  it('spans 180 complete days ending yesterday', () => {
    expect(dailyWindowStartDate(180, now)).toBe('2026-01-14');
  });

  it('spans 365 complete days ending yesterday', () => {
    expect(dailyWindowStartDate(365, now)).toBe('2025-07-13');
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

describe('buildReorgChartConfig', () => {
  // The reorg table starts part-way through 2025-05-14 and is processed into 2025-05-16
  const bounds = { min: Date.UTC(2025, 4, 14, 1, 52) / 1000, max: Date.UTC(2025, 4, 16, 3) / 1000 };
  const keys = ['2025-05-13', '2025-05-14', '2025-05-15', '2025-05-16', '2025-05-17'];

  it('shows no data outside the bounds and 0 inside them where no reorg was recorded', () => {
    const { series } = buildReorgChartConfig(
      [
        { day_start_date: '2025-05-15', depth: 1, reorg_count: 4 },
        { day_start_date: '2025-05-15', depth: 2, reorg_count: 1 },
      ],
      keys,
      true,
      bounds
    );
    expect(series.map(s => [s.name, s.data])).toEqual([
      ['Depth 1', [null, 0, 4, 0, null]],
      ['Depth 2', [null, 0, 1, 0, null]],
    ]);
  });

  it('draws depth 1 when the window has no reorgs', () => {
    const hour = Date.UTC(2025, 4, 15, 10) / 1000;
    const { series } = buildReorgChartConfig([], [String(hour), String(hour + 3600)], false, bounds);
    expect(series.map(s => [s.name, s.data])).toEqual([['Depth 1', [0, 0]]]);
  });
});

describe('buildProposalStatusChartConfig', () => {
  const theme = { danger: 'red', warning: 'amber', muted: 'grey', success: 'green' } as unknown as ThemeColors;
  // The head table starts part-way through 2025-05-14; that day's orphaned blocks before it were never seen
  const headStart = Date.UTC(2025, 4, 14, 1, 52) / 1000;
  const keys = ['2025-05-13', '2025-05-14', '2025-05-15'];
  const day = (
    day_start_date: string,
    canonical: number,
    missed: number,
    orphaned: number
  ): { day_start_date: string; status: string; slot_count: number }[] => [
    { day_start_date, status: 'canonical', slot_count: canonical },
    { day_start_date, status: 'missed', slot_count: missed },
    { day_start_date, status: 'orphaned', slot_count: orphaned },
  ];
  const records = [...day('2025-05-13', 196, 4, 0), ...day('2025-05-14', 190, 6, 4), ...day('2025-05-15', 194, 2, 4)];
  const movingAvg = [
    { day_start_date: '2025-05-13', moving_avg_missed_rate: 1.5 },
    { day_start_date: '2025-05-14', moving_avg_missed_rate: 2.5 },
    { day_start_date: '2025-05-15', moving_avg_missed_rate: 3.5 },
  ];

  it('splits missed and orphaned only for buckets wholly after the head table starts', () => {
    const { series } = buildProposalStatusChartConfig(records, movingAvg, keys, true, headStart, theme);
    expect(series.map(s => [s.name, s.data, s.stack ?? null])).toEqual([
      ['Missed', [null, null, 1], 'known'],
      ['Orphaned', [null, null, 2], 'known'],
      ['Missed or orphaned', [2, 5, null], 'unknown'],
      ['Moving Avg', [1.5, 2.5, 3.5], null],
    ]);
  });

  it('splits nothing when the head table start is unknown, and drops series with no values', () => {
    const { series } = buildProposalStatusChartConfig(records, [], keys, true, undefined, theme);
    expect(series.map(s => [s.name, s.data])).toEqual([['Missed or orphaned', [2, 5, 3]]]);
  });
});
