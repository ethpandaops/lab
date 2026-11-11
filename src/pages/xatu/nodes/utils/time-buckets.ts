import type { TimezoneMode } from '@/contexts/TimezoneContext';
import { completeBucketEnd, type RollupGrain } from '@/utils/time';
import { NODE_RANGE_CONFIG, type Granularity, type NodeRange } from '../constants';

const HOUR = 3600;
const DAY = 86400;
const WEEK = 7 * DAY;

const GRAIN: Record<Granularity, RollupGrain> = { hourly: 'hour', daily: 'day', weekly: 'week' };

/** Length of one bucket in seconds */
function bucketSeconds(granularity: Granularity): number {
  return granularity === 'hourly' ? HOUR : granularity === 'daily' ? DAY : WEEK;
}

/**
 * Start (unix seconds, UTC) of every bucket in a range, oldest first, ending with the last complete bucket.
 * Weeks start on Monday.
 *
 * @param earliest - First bucket with data; only used for all history, which has no fixed length
 * @param granularity - Overrides the range's, for a table without rollups at the range's grain
 */
export function getBuckets(
  range: NodeRange,
  nowSeconds: number,
  earliest?: number,
  granularity: Granularity = NODE_RANGE_CONFIG[range].granularity
): number[] {
  const { buckets } = NODE_RANGE_CONFIG[range];
  const size = bucketSeconds(granularity);
  const last = completeBucketEnd(GRAIN[granularity], nowSeconds * 1000) - size;
  const first =
    buckets === null
      ? earliest === undefined
        ? last
        : Math.min(last, last - Math.ceil((last - earliest) / size) * size)
      : last - (buckets - 1) * size;
  const starts: number[] = [];
  for (let start = first; start <= last; start += size) starts.push(start);
  return starts;
}

/** Start of the Monday-based UTC week containing a time (unix seconds) */
export function weekStart(seconds: number): number {
  return completeBucketEnd('week', seconds * 1000);
}

/** UTC date of a daily bucket, e.g. "2026-10-30" */
function toDateString(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/**
 * API filter for a range's buckets: the span of hours, the list of days, or for all history every bucket but the one
 * in progress
 */
export function bucketFilter(
  granularity: Granularity,
  buckets: number[],
  allHistory: boolean
): Record<string, string | number> {
  const last = buckets[buckets.length - 1];
  if (granularity === 'hourly') return { hour_start_date_time_gte: buckets[0], hour_start_date_time_lt: last + HOUR };
  if (granularity === 'weekly') return { week_start_date_ne: toDateString(last + WEEK) };
  return allHistory
    ? { day_start_date_ne: toDateString(last + DAY) }
    : { day_start_date_in_values: buckets.map(toDateString).join(',') };
}

/** Bucket column of an hourly, daily or weekly rollup row */
export interface BucketColumns {
  hour_start_date_time?: number;
  day_start_date?: string;
  week_start_date?: string;
}

/** Bucket start of a rollup row at a granularity */
export function rowBucket(row: BucketColumns, granularity: Granularity): number | null {
  return parseBucket(
    granularity === 'hourly'
      ? row.hour_start_date_time
      : granularity === 'daily'
        ? row.day_start_date
        : row.week_start_date
  );
}

/** Bucket start of an hourly row (unix seconds) or a daily or weekly row ("YYYY-MM-DD") */
export function parseBucket(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed / 1000;
}

/** Timezone option for a bucket: daily and weekly buckets are UTC days, so they always render in UTC */
function zoneFor(granularity: Granularity, timezone: TimezoneMode): string | undefined {
  return granularity !== 'hourly' || timezone === 'UTC' ? 'UTC' : undefined;
}

/**
 * Category axis label of a bucket. Ranges longer than a day use the shared date label ("Oct 29 '26"),
 * which the chart ticks once per day, week or month; the last day labels each hour ("14:00").
 */
export function bucketAxisLabel(
  start: number,
  granularity: Granularity,
  bucketCount: number,
  timezone: TimezoneMode
): string {
  const date = new Date(start * 1000);
  const timeZone = zoneFor(granularity, timezone);
  if (granularity === 'hourly' && bucketCount <= 24) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
  }
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone });
  const day = date.toLocaleDateString('en-US', { day: 'numeric', timeZone });
  const year = date.toLocaleDateString('en-US', { year: '2-digit', timeZone });
  return `${month} ${day} '${year}`;
}

/**
 * Tooltip heading of a bucket, e.g. "Oct 29, 14:00", "Oct 29, 2026" or "Week of Oct 26, 2026".
 */
export function bucketHeading(start: number, granularity: Granularity, timezone: TimezoneMode): string {
  const date = new Date(start * 1000);
  const timeZone = zoneFor(granularity, timezone);
  if (granularity === 'daily') return date.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone });
  if (granularity === 'weekly') return `Week of ${date.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone })}`;
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
  return `${day}, ${time}${timeZone ? ' UTC' : ''}`;
}

/**
 * Median of values weighted by how many slots each covers, e.g. a range's typical arrival from hourly medians.
 */
export function weightedMedian(values: Array<{ value: number; weight: number }>): number | null {
  const sorted = values.filter(entry => entry.weight > 0).sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total === 0) return null;
  let running = 0;
  for (const entry of sorted) {
    running += entry.weight;
    if (running >= total / 2) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}
