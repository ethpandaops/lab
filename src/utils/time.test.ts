import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NOW_MS } from '@/test-utils/time';
import {
  getRelativeTime,
  formatTimestamp,
  formatTimeRange,
  completeBucketEnd,
  completeUtcDays,
  currentUtcDate,
  currentUtcWeek,
  wholeUtcWeeks,
} from './time';

describe('getRelativeTime', () => {
  const mockNow = NOW_MS;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
  });

  describe('past timestamps', () => {
    it('should format seconds ago (< 1 minute)', () => {
      const timestamp = mockNow / 1000 - 30;
      expect(getRelativeTime(timestamp)).toBe('30s ago');
    });

    it('should format exactly 1 second ago', () => {
      const timestamp = mockNow / 1000 - 1;
      expect(getRelativeTime(timestamp)).toBe('1s ago');
    });

    it('should format minutes and seconds ago (< 1 hour)', () => {
      const timestamp = mockNow / 1000 - 150; // 2m 30s
      expect(getRelativeTime(timestamp)).toBe('2m 30s ago');
    });

    it('should format minutes only when no remaining seconds', () => {
      const timestamp = mockNow / 1000 - 120; // 2m
      expect(getRelativeTime(timestamp)).toBe('2m ago');
    });

    it('should format hours and minutes ago (< 1 day)', () => {
      const timestamp = mockNow / 1000 - 7200; // 2h
      expect(getRelativeTime(timestamp)).toBe('2h ago');
    });

    it('should format hours and minutes with remainder', () => {
      const timestamp = mockNow / 1000 - 7320; // 2h 2m
      expect(getRelativeTime(timestamp)).toBe('2h 2m ago');
    });

    it('should format hours only when no remaining minutes', () => {
      const timestamp = mockNow / 1000 - 3600; // 1h
      expect(getRelativeTime(timestamp)).toBe('1h ago');
    });

    it('should format days and hours ago (>= 1 day)', () => {
      const timestamp = mockNow / 1000 - 86400; // 1d
      expect(getRelativeTime(timestamp)).toBe('1d ago');
    });

    it('should format days and hours with remainder', () => {
      const timestamp = mockNow / 1000 - 90000; // 1d 1h
      expect(getRelativeTime(timestamp)).toBe('1d 1h ago');
    });

    it('should format multiple days', () => {
      const timestamp = mockNow / 1000 - 259200; // 3d
      expect(getRelativeTime(timestamp)).toBe('3d ago');
    });

    it('should handle edge case at 59 seconds', () => {
      const timestamp = mockNow / 1000 - 59;
      expect(getRelativeTime(timestamp)).toBe('59s ago');
    });

    it('should handle edge case at 60 seconds (1 minute)', () => {
      const timestamp = mockNow / 1000 - 60;
      expect(getRelativeTime(timestamp)).toBe('1m ago');
    });

    it('should handle edge case at 3599 seconds (59m 59s)', () => {
      const timestamp = mockNow / 1000 - 3599;
      expect(getRelativeTime(timestamp)).toBe('59m 59s ago');
    });

    it('should handle edge case at 3600 seconds (1 hour)', () => {
      const timestamp = mockNow / 1000 - 3600;
      expect(getRelativeTime(timestamp)).toBe('1h ago');
    });
  });

  describe('future timestamps', () => {
    it('should format seconds in future (< 1 minute)', () => {
      const timestamp = mockNow / 1000 + 30;
      expect(getRelativeTime(timestamp)).toBe('in 30s');
    });

    it('should format exactly 1 second in future', () => {
      const timestamp = mockNow / 1000 + 1;
      expect(getRelativeTime(timestamp)).toBe('in 1s');
    });

    it('should format minutes and seconds in future (< 1 hour)', () => {
      const timestamp = mockNow / 1000 + 150; // 2m 30s
      expect(getRelativeTime(timestamp)).toBe('in 2m 30s');
    });

    it('should format minutes only when no remaining seconds', () => {
      const timestamp = mockNow / 1000 + 120; // 2m
      expect(getRelativeTime(timestamp)).toBe('in 2m');
    });

    it('should format hours and minutes in future (< 1 day)', () => {
      const timestamp = mockNow / 1000 + 7320; // 2h 2m
      expect(getRelativeTime(timestamp)).toBe('in 2h 2m');
    });

    it('should format hours only when no remaining minutes', () => {
      const timestamp = mockNow / 1000 + 3600; // 1h
      expect(getRelativeTime(timestamp)).toBe('in 1h');
    });

    it('should format days and hours in future (>= 1 day)', () => {
      const timestamp = mockNow / 1000 + 90000; // 1d 1h
      expect(getRelativeTime(timestamp)).toBe('in 1d 1h');
    });

    it('should format days only when no remaining hours', () => {
      const timestamp = mockNow / 1000 + 86400; // 1d
      expect(getRelativeTime(timestamp)).toBe('in 1d');
    });

    it('should format multiple days in future', () => {
      const timestamp = mockNow / 1000 + 259200; // 3d
      expect(getRelativeTime(timestamp)).toBe('in 3d');
    });
  });

  describe('edge cases', () => {
    it('should handle zero difference (now)', () => {
      const timestamp = mockNow / 1000;
      expect(getRelativeTime(timestamp)).toBe('0s ago');
    });

    it('should handle very small negative difference', () => {
      const timestamp = mockNow / 1000 - 0.5;
      expect(getRelativeTime(timestamp)).toBe('0s ago');
    });

    it('should handle very small positive difference', () => {
      const timestamp = mockNow / 1000 + 0.5;
      expect(getRelativeTime(timestamp)).toBe('in 0s');
    });

    it('should handle large past timestamp', () => {
      const timestamp = mockNow / 1000 - 604800; // 7 days
      expect(getRelativeTime(timestamp)).toBe('7d ago');
    });

    it('should handle large future timestamp', () => {
      const timestamp = mockNow / 1000 + 604800; // 7 days
      expect(getRelativeTime(timestamp)).toBe('in 7d');
    });
  });

  describe('null/undefined handling', () => {
    it('should return "Never" for null timestamp', () => {
      expect(getRelativeTime(null)).toBe('Never');
    });

    it('should return "Never" for undefined timestamp', () => {
      expect(getRelativeTime(undefined)).toBe('Never');
    });

    it('should return "Never" when no argument is provided', () => {
      expect(getRelativeTime()).toBe('Never');
    });
  });
});

describe('formatTimestamp', () => {
  it('should format timestamp with default options', () => {
    // Jan 15, 2021 12:00:00 GMT (midday to avoid timezone edge cases)
    const timestamp = 1610712000;
    const result = formatTimestamp(timestamp);
    // Result will vary by timezone, so just check it's a non-empty string with expected parts
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2021/);
  });

  it('should format timestamp with custom options', () => {
    const timestamp = 1610712000; // Jan 15, 2021 12:00:00 GMT
    const result = formatTimestamp(timestamp, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    // Result will vary by timezone and locale
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format timestamp with only date', () => {
    const timestamp = 1610712000; // Jan 15, 2021 12:00:00 GMT
    const result = formatTimestamp(timestamp, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(result).toMatch(/January/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2021/);
  });

  it('should format timestamp with only time', () => {
    const timestamp = 1610712000; // Jan 15, 2021 12:00:00 GMT
    const result = formatTimestamp(timestamp, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    expect(result).toBeTruthy();
    expect(result).toMatch(/:/);
  });

  it('should handle zero timestamp (epoch)', () => {
    const timestamp = 43200; // Jan 1, 1970 12:00:00 GMT (midday to avoid timezone edge cases)
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(/1970/);
  });

  it('should handle recent timestamp', () => {
    // Nov 1, 2023 12:00:00 GMT (midday to avoid timezone edge cases)
    const timestamp = 1698840000;
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(/Nov/);
    expect(result).toMatch(/2023/);
  });

  it('should handle timestamp with specific locale format', () => {
    const timestamp = 1610712000; // Jan 15, 2021 12:00:00 GMT (Friday)
    const result = formatTimestamp(timestamp, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(result).toMatch(/Friday/);
    expect(result).toMatch(/January/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2021/);
  });

  it('should format with short month name', () => {
    const timestamp = 1610712000; // Jan 15, 2021 12:00:00 GMT
    const result = formatTimestamp(timestamp, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    expect(result).toMatch(/Jan/);
  });

  it('should format with numeric month', () => {
    const timestamp = 1610712000; // Jan 15, 2021 12:00:00 GMT
    const result = formatTimestamp(timestamp, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
    expect(result).toMatch(/1/);
    expect(result).toMatch(/2021/);
  });

  it('should handle far future timestamp', () => {
    // Jan 15, 2030 12:00:00 GMT (midday to avoid timezone edge cases)
    const timestamp = 1894680000;
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(/2030/);
  });

  it('should handle mid-year timestamp', () => {
    // Jul 15, 2023 12:30:45 GMT
    const timestamp = 1689426645;
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(/Jul/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2023/);
  });
});

describe('formatTimeRange', () => {
  it('names both ends of a range that spans days', () => {
    // Jan 10, 2021 12:00 GMT → Jan 20, 2021 12:00 GMT
    const result = formatTimeRange(1610280000, 1611144000);
    expect(result).toMatch(/Jan 10/);
    expect(result).toMatch(/Jan 20/);
  });

  it('states the shared date once for a range within one day', () => {
    // Jan 15, 2021 12:00 GMT → 12:30 GMT
    const result = formatTimeRange(1610712000, 1610713800);
    expect(result.match(/Jan/g)).toHaveLength(1);
  });
});

describe('completeBucketEnd', () => {
  // Thursday 2026-11-05 13:20:45 UTC
  const now = Date.UTC(2026, 10, 5, 13, 20, 45);

  it('ends at the start of the hour, UTC day and Monday-started week in progress', () => {
    expect(completeBucketEnd('hour', now)).toBe(Date.UTC(2026, 10, 5, 13) / 1000);
    expect(completeBucketEnd('day', now)).toBe(Date.UTC(2026, 10, 5) / 1000);
    expect(completeBucketEnd('week', now)).toBe(Date.UTC(2026, 10, 2) / 1000);
  });

  it('keeps a Sunday in the week that started the Monday before, and starts a new week on Monday', () => {
    expect(completeBucketEnd('week', Date.UTC(2026, 10, 8, 23, 59))).toBe(Date.UTC(2026, 10, 2) / 1000);
    expect(completeBucketEnd('week', Date.UTC(2026, 10, 9))).toBe(Date.UTC(2026, 10, 9) / 1000);
  });
});

describe('complete UTC days', () => {
  const now = Date.UTC(2026, 10, 5, 0, 30);

  it('names the day and week in progress', () => {
    expect(currentUtcDate(now)).toBe('2026-11-05');
    expect(currentUtcWeek(now)).toBe('2026-11-02');
  });

  it('lists the last N complete days ending yesterday, across a month boundary', () => {
    expect(completeUtcDays(3, now)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
    expect(completeUtcDays(5, now)[0]).toBe('2026-10-31');
    expect(completeUtcDays(0, now)).toEqual([]);
  });
});

describe('wholeUtcWeeks', () => {
  const utc = (month: number, day: number): number => Date.UTC(2026, month, day) / 1000;

  it('keeps the Monday-started weeks inside the window and leaves the days around them', () => {
    // Thursday Oct 1 to Thursday Nov 5
    expect(wholeUtcWeeks(utc(9, 1), utc(10, 5))).toEqual({
      from: utc(9, 5),
      to: utc(10, 2),
      weeks: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'],
    });
  });

  it('starts on a Monday start and ends on a Monday end', () => {
    expect(wholeUtcWeeks(utc(9, 5), utc(9, 19)).weeks).toEqual(['2026-10-05', '2026-10-12']);
  });

  it('gives the whole window to days when no week fits', () => {
    expect(wholeUtcWeeks(utc(9, 6), utc(9, 15))).toEqual({ from: utc(9, 15), to: utc(9, 15), weeks: [] });
  });
});
