import { completeBucketEnd, toUtcDate, wholeUtcWeeks } from '@/utils/time';

const DAY = 86_400;

/**
 * The rollup rows a range reads, `to` being its last day (start of day UTC). At weekly grain: the whole UTC weeks
 * inside it from the weekly rollups, and the days before and after them from the daily rollups, which the page adds
 * up into partial weeks. Otherwise every day.
 *
 * @example
 * ```ts
 * // Thursday 2026-10-01 to Thursday 2026-11-05, weekly
 * rollupPeriods(Date.UTC(2026, 9, 1) / 1000, Date.UTC(2026, 10, 5) / 1000, true);
 * // { weeks: ['2026-10-05', …, '2026-10-26'], days: ['2026-10-01', …, '2026-10-04', '2026-11-02', …, '2026-11-05'] }
 * ```
 */
export function rollupPeriods(from: number, to: number, weekly: boolean): { weeks: string[]; days: string[] } {
  const end = to + DAY;
  const whole = weekly ? wholeUtcWeeks(from, end) : { from: end, to: end, weeks: [] };
  const days: string[] = [];
  for (let day = from; day < end; day += DAY) if (day < whole.from || day >= whole.to) days.push(toUtcDate(day));
  return { weeks: whole.weeks, days };
}

/** First and last day (start of day UTC) of the week starting `monday` that fall inside the range [from, to] */
export function weekSpan(monday: number, from: number, to: number): [number, number] {
  return [Math.max(monday, from), Math.min(monday + 6 * DAY, to)];
}

/**
 * Exclusive end (unix seconds) of the per-slot Activity reads. A range ending on the last complete UTC day runs to
 * now, rounded up to the minute so the requests stay cacheable; an earlier end stops after its last day.
 */
export function activityEnd(to: number, nowMs: number = Date.now()): number {
  const lastDay = completeBucketEnd('day', nowMs) - DAY;
  return to >= lastDay ? Math.ceil(nowMs / 60_000) * 60 : to + DAY;
}
