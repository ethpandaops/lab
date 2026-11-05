/**
 * Time-related utility functions
 */

/**
 * Convert Unix timestamp to a human-readable relative time string with time sections
 * @param timestamp - Unix timestamp in seconds (optional, can be null/undefined)
 * @returns Relative time string with detailed breakdown (e.g., "2m 30s ago", "1h 15m ago")
 *
 * @example
 * ```ts
 * getRelativeTime(Date.now() / 1000 - 30); // "30s ago"
 * getRelativeTime(Date.now() / 1000 - 120); // "2m ago"
 * getRelativeTime(Date.now() / 1000 - 7200); // "2h ago"
 * getRelativeTime(null); // "Never"
 * ```
 */
export function getRelativeTime(timestamp?: number | null): string {
  // Handle null/undefined timestamps
  if (timestamp == null) return 'Never';
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  // Future timestamps
  if (diff < 0) {
    const absDiff = Math.abs(diff);

    // Less than a minute
    if (absDiff < 60) {
      return `in ${Math.floor(absDiff)}s`;
    }

    // Less than an hour - show minutes and seconds
    if (absDiff < 3600) {
      const mins = Math.floor(absDiff / 60);
      const secs = Math.floor(absDiff % 60);
      return secs > 0 ? `in ${mins}m ${secs}s` : `in ${mins}m`;
    }

    // Less than a day - show hours and minutes
    if (absDiff < 86400) {
      const hours = Math.floor(absDiff / 3600);
      const mins = Math.floor((absDiff % 3600) / 60);
      return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
    }

    // Days
    const days = Math.floor(absDiff / 86400);
    const hours = Math.floor((absDiff % 86400) / 3600);
    return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
  }

  // Past timestamps
  // Less than a minute
  if (diff < 60) {
    return `${Math.floor(diff)}s ago`;
  }

  // Less than an hour - show minutes and seconds
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    const secs = Math.floor(diff % 60);
    return secs > 0 ? `${mins}m ${secs}s ago` : `${mins}m ago`;
  }

  // Less than a day - show hours and minutes
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
  }

  // Days - show days and hours
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h ago` : `${days}d ago`;
}

/**
 * Format a Unix timestamp to a human-readable date string
 * @param timestamp - Unix timestamp in seconds
 * @param options - Intl.DateTimeFormat options (defaults include timezone)
 * @returns Formatted date string with timezone
 *
 * @example
 * ```ts
 * formatTimestamp(1609459200); // "Jan 1, 2021, 12:00:00 AM AEDT"
 * formatTimestamp(1609459200, { dateStyle: 'short', timeStyle: 'short' }); // "1/1/21, 12:00 AM"
 * ```
 */
export function formatTimestamp(
  timestamp: number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }
): string {
  return new Date(timestamp * 1000).toLocaleString(undefined, options);
}

/**
 * Format a span between two Unix timestamps, collapsing the parts they share
 * @param start - Unix timestamp in seconds
 * @param end - Unix timestamp in seconds
 * @returns Formatted range with timezone
 *
 * @example
 * ```ts
 * formatTimeRange(1610712000, 1610715600); // "Jan 15, 2021, 12:00 – 1:00 PM UTC"
 * ```
 */
export function formatTimeRange(start: number, end: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).formatRange(new Date(start * 1000), new Date(end * 1000));
}

/** Bucket length of an hourly, daily or weekly rollup */
export type RollupGrain = 'hour' | 'day' | 'week';

const HOUR_SECONDS = 3600;
const DAY_SECONDS = 86_400;

/**
 * Start (unix seconds) of the UTC hour, day or week (Monday) in progress, which is the exclusive end of the last
 * complete one. Rollup queries end here so the partial bucket is never read.
 *
 * @example
 * ```ts
 * // 2026-11-05 13:20 UTC (a Thursday)
 * completeBucketEnd('hour'); // 2026-11-05 13:00
 * completeBucketEnd('day'); // 2026-11-05 00:00
 * completeBucketEnd('week'); // 2026-11-02 00:00
 * ```
 */
export function completeBucketEnd(grain: RollupGrain, nowMs: number = Date.now()): number {
  const now = Math.floor(nowMs / 1000);
  if (grain === 'hour') return Math.floor(now / HOUR_SECONDS) * HOUR_SECONDS;
  const day = Math.floor(now / DAY_SECONDS) * DAY_SECONDS;
  if (grain === 'day') return day;
  // The epoch fell on a Thursday, so Monday is three days into the 7-day cycle
  const daysSinceMonday = (Math.floor(day / DAY_SECONDS) + 3) % 7;
  return day - daysSinceMonday * DAY_SECONDS;
}

/** UTC date ("2026-11-05") of a unix-seconds time, the key of daily and weekly rollup rows */
export function toUtcDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** UTC date of the day in progress, whose daily rollup rows are partial */
export function currentUtcDate(nowMs: number = Date.now()): string {
  return toUtcDate(completeBucketEnd('day', nowMs));
}

/** UTC date of the Monday starting the week in progress, whose weekly rollup rows are partial */
export function currentUtcWeek(nowMs: number = Date.now()): string {
  return toUtcDate(completeBucketEnd('week', nowMs));
}

/**
 * The whole UTC weeks (Monday to Monday) inside [start, end), whose weekly rollup rows (keyed by the `weeks` dates)
 * cover [from, to). The rest of [start, end), before `from` and from `to` on, is left for a daily rollup. Without a
 * whole week, `from` and `to` are both `end`.
 *
 * @example
 * ```ts
 * // Thursday 2026-10-01 to Thursday 2026-11-05
 * wholeUtcWeeks(Date.UTC(2026, 9, 1) / 1000, Date.UTC(2026, 10, 5) / 1000);
 * // { from: 2026-10-05, to: 2026-11-02, weeks: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'] }
 * ```
 */
export function wholeUtcWeeks(start: number, end: number): { from: number; to: number; weeks: string[] } {
  const week = 7 * DAY_SECONDS;
  const floorStart = completeBucketEnd('week', start * 1000);
  const from = floorStart === start ? start : floorStart + week;
  const to = completeBucketEnd('week', end * 1000);
  if (to <= from) return { from: end, to: end, weeks: [] };
  const weeks: string[] = [];
  for (let monday = from; monday < to; monday += week) weeks.push(toUtcDate(monday));
  return { from, to, weeks };
}

/** The last `days` complete UTC days, oldest first, ending yesterday, e.g. for day_start_date_in_values */
export function completeUtcDays(days: number, nowMs: number = Date.now()): string[] {
  const end = completeBucketEnd('day', nowMs);
  return Array.from({ length: Math.max(0, days) }, (_, i) => toUtcDate(end - (days - i) * DAY_SECONDS));
}
