import type { TimezoneMode } from '@/contexts/TimezoneContext';
import { NODE_RANGE_CONFIG, SLOTS_PER_BUCKET, type Granularity, type NodeRange } from '../constants';

const HOUR = 3600;
const DAY = 86400;

/** Length of one bucket in seconds */
export function bucketSeconds(granularity: Granularity): number {
  return granularity === 'hourly' ? HOUR : DAY;
}

/**
 * Start (unix seconds, UTC) of every bucket in a range, oldest first, ending with the bucket in progress.
 *
 * @param earliest - First bucket with data; only used for all history, which has no fixed length
 */
export function getBuckets(range: NodeRange, nowSeconds: number, earliest?: number): number[] {
  const { granularity, buckets } = NODE_RANGE_CONFIG[range];
  const size = bucketSeconds(granularity);
  const current = Math.floor(nowSeconds / size) * size;
  const first =
    buckets === null
      ? earliest === undefined
        ? current
        : Math.min(current, Math.floor(earliest / size) * size)
      : current - (buckets - 1) * size;
  const starts: number[] = [];
  for (let start = first; start <= current; start += size) starts.push(start);
  return starts;
}

/** UTC date of a daily bucket, e.g. "2026-10-30" */
export function toDateString(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** Bucket start of an hourly row (unix seconds) or a daily row ("YYYY-MM-DD") */
export function parseBucket(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed / 1000;
}

/**
 * Slots a bucket can hold so far: a whole hour or day, or the slots elapsed in the bucket in progress.
 */
export function expectedSlots(start: number, granularity: Granularity, nowSeconds: number): number {
  const full = SLOTS_PER_BUCKET[granularity];
  const elapsed = Math.floor((nowSeconds - start) / 12);
  return Math.max(0, Math.min(full, elapsed));
}

/** Timezone option for a bucket: daily buckets are UTC days, so they always render in UTC */
function zoneFor(granularity: Granularity, timezone: TimezoneMode): string | undefined {
  return granularity === 'daily' || timezone === 'UTC' ? 'UTC' : undefined;
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
 * Tooltip heading of a bucket, e.g. "Oct 29, 14:00" or "Oct 29, 2026".
 */
export function bucketHeading(start: number, granularity: Granularity, timezone: TimezoneMode): string {
  const date = new Date(start * 1000);
  const timeZone = zoneFor(granularity, timezone);
  if (granularity === 'daily') return date.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone });
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
