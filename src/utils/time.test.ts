import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRelativeTime, formatTimestamp } from './time';

describe('getRelativeTime', () => {
  let mockNow: number;

  beforeEach(() => {
    // Mock Date.now() to return a consistent value
    mockNow = 1700000000000; // Nov 14, 2023 22:13:20 GMT
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    // Jan 1, 2021 00:00:00 GMT
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp);
    // Result will vary by timezone, so just check it's a non-empty string with expected parts
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/2021/);
  });

  it('should format timestamp with custom options', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    // Result will vary by timezone and locale
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format timestamp with only date', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(result).toMatch(/January/);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/2021/);
  });

  it('should format timestamp with only time', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    expect(result).toBeTruthy();
    expect(result).toMatch(/:/);
  });

  it('should handle zero timestamp (epoch)', () => {
    const timestamp = 0;
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(/1970/);
  });

  it('should handle recent timestamp', () => {
    // Nov 1, 2023
    const timestamp = 1698796800;
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(/Nov/);
    expect(result).toMatch(/2023/);
  });

  it('should handle timestamp with specific locale format', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(result).toMatch(/Friday/);
    expect(result).toMatch(/January/);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/2021/);
  });

  it('should format with short month name', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    expect(result).toMatch(/Jan/);
  });

  it('should format with numeric month', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
    expect(result).toMatch(/1/);
    expect(result).toMatch(/2021/);
  });

  it('should handle far future timestamp', () => {
    // Jan 1, 2030
    const timestamp = 1893456000;
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
