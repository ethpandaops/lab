import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  formatDiscordTimestamp,
  getAllDiscordFormats,
  DISCORD_STYLE_LABELS,
  type DiscordTimestampStyle,
} from './discord-timestamp';

describe('discord-timestamp utilities', () => {
  // Fix the current time for consistent testing
  const mockNow = 1618932030; // April 20, 2021, 4:20:30 PM UTC
  const mockDate = new Date(mockNow * 1000);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDiscordTimestamp', () => {
    const timestamp = mockNow; // Same as "now" for these tests

    it('should format short time (t)', () => {
      const result = formatDiscordTimestamp(timestamp, 't');
      expect(result).toMatch(/\d{1,2}:\d{2}\s?[AP]M/i);
    });

    it('should format long time (T)', () => {
      const result = formatDiscordTimestamp(timestamp, 'T');
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}\s?[AP]M/i);
    });

    it('should format short date (d)', () => {
      const result = formatDiscordTimestamp(timestamp, 'd');
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should format long date (D)', () => {
      const result = formatDiscordTimestamp(timestamp, 'D');
      expect(result).toContain('2021');
      expect(result).toContain('April');
      expect(result).toContain('20');
    });

    it('should format short date/time (f)', () => {
      const result = formatDiscordTimestamp(timestamp, 'f');
      expect(result).toContain('2021');
      expect(result).toContain('April');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should format long date/time (F)', () => {
      const result = formatDiscordTimestamp(timestamp, 'F');
      expect(result).toContain('2021');
      expect(result).toContain('April');
      expect(result).toContain('20');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    describe('relative time (R)', () => {
      it('should return "now" for current time', () => {
        const result = formatDiscordTimestamp(mockNow, 'R');
        expect(result).toBe('now');
      });

      it('should format seconds ago', () => {
        const thirtySecondsAgo = mockNow - 30;
        const result = formatDiscordTimestamp(thirtySecondsAgo, 'R');
        expect(result).toBe('30 seconds ago');
      });

      it('should format one second ago', () => {
        const oneSecondAgo = mockNow - 1;
        const result = formatDiscordTimestamp(oneSecondAgo, 'R');
        expect(result).toBe('1 second ago');
      });

      it('should format minutes ago', () => {
        const fiveMinutesAgo = mockNow - 300;
        const result = formatDiscordTimestamp(fiveMinutesAgo, 'R');
        expect(result).toBe('5 minutes ago');
      });

      it('should format one minute ago', () => {
        const oneMinuteAgo = mockNow - 60;
        const result = formatDiscordTimestamp(oneMinuteAgo, 'R');
        expect(result).toBe('1 minute ago');
      });

      it('should format hours ago', () => {
        const twoHoursAgo = mockNow - 7200;
        const result = formatDiscordTimestamp(twoHoursAgo, 'R');
        expect(result).toBe('2 hours ago');
      });

      it('should format one hour ago', () => {
        const oneHourAgo = mockNow - 3600;
        const result = formatDiscordTimestamp(oneHourAgo, 'R');
        expect(result).toBe('1 hour ago');
      });

      it('should format days ago', () => {
        const threeDaysAgo = mockNow - 259200;
        const result = formatDiscordTimestamp(threeDaysAgo, 'R');
        expect(result).toBe('3 days ago');
      });

      it('should format one day ago', () => {
        const oneDayAgo = mockNow - 86400;
        const result = formatDiscordTimestamp(oneDayAgo, 'R');
        expect(result).toBe('1 day ago');
      });

      it('should format months ago', () => {
        const twoMonthsAgo = mockNow - 5184000; // 60 days
        const result = formatDiscordTimestamp(twoMonthsAgo, 'R');
        expect(result).toBe('2 months ago');
      });

      it('should format one month ago', () => {
        const oneMonthAgo = mockNow - 2592000; // 30 days
        const result = formatDiscordTimestamp(oneMonthAgo, 'R');
        expect(result).toBe('1 month ago');
      });

      it('should format years ago', () => {
        const twoYearsAgo = mockNow - 63072000; // ~2 years
        const result = formatDiscordTimestamp(twoYearsAgo, 'R');
        expect(result).toBe('2 years ago');
      });

      it('should format one year ago', () => {
        const oneYearAgo = mockNow - 31536000; // 365 days
        const result = formatDiscordTimestamp(oneYearAgo, 'R');
        expect(result).toBe('1 year ago');
      });

      // Future timestamps
      it('should format future seconds', () => {
        const inThirtySeconds = mockNow + 30;
        const result = formatDiscordTimestamp(inThirtySeconds, 'R');
        expect(result).toBe('in 30 seconds');
      });

      it('should format future minutes', () => {
        const inFiveMinutes = mockNow + 300;
        const result = formatDiscordTimestamp(inFiveMinutes, 'R');
        expect(result).toBe('in 5 minutes');
      });

      it('should format future hours', () => {
        const inTwoHours = mockNow + 7200;
        const result = formatDiscordTimestamp(inTwoHours, 'R');
        expect(result).toBe('in 2 hours');
      });

      it('should format future days', () => {
        const inThreeDays = mockNow + 259200;
        const result = formatDiscordTimestamp(inThreeDays, 'R');
        expect(result).toBe('in 3 days');
      });

      it('should format future months', () => {
        const inTwoMonths = mockNow + 5184000;
        const result = formatDiscordTimestamp(inTwoMonths, 'R');
        expect(result).toBe('in 2 months');
      });

      it('should format future years', () => {
        const inTwoYears = mockNow + 63072000;
        const result = formatDiscordTimestamp(inTwoYears, 'R');
        expect(result).toBe('in 2 years');
      });
    });
  });

  describe('getAllDiscordFormats', () => {
    it('should return all Discord formats', () => {
      const timestamp = mockNow;
      const formats = getAllDiscordFormats(timestamp);

      expect(formats).toHaveProperty('t');
      expect(formats).toHaveProperty('T');
      expect(formats).toHaveProperty('d');
      expect(formats).toHaveProperty('D');
      expect(formats).toHaveProperty('f');
      expect(formats).toHaveProperty('F');
      expect(formats).toHaveProperty('R');
    });

    it('should return strings for all formats', () => {
      const timestamp = mockNow;
      const formats = getAllDiscordFormats(timestamp);

      Object.values(formats).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DISCORD_STYLE_LABELS', () => {
    it('should have labels for all styles', () => {
      const styles: DiscordTimestampStyle[] = ['t', 'T', 'd', 'D', 'f', 'F', 'R'];

      styles.forEach(style => {
        expect(DISCORD_STYLE_LABELS).toHaveProperty(style);
        expect(typeof DISCORD_STYLE_LABELS[style]).toBe('string');
        expect(DISCORD_STYLE_LABELS[style].length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive labels', () => {
      expect(DISCORD_STYLE_LABELS.t).toContain('Time');
      expect(DISCORD_STYLE_LABELS.T).toContain('Time');
      expect(DISCORD_STYLE_LABELS.d).toContain('Date');
      expect(DISCORD_STYLE_LABELS.D).toContain('Date');
      expect(DISCORD_STYLE_LABELS.f).toContain('Date');
      expect(DISCORD_STYLE_LABELS.F).toContain('Date');
      expect(DISCORD_STYLE_LABELS.R).toContain('Relative');
    });
  });
});
