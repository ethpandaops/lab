import { z } from 'zod';

/**
 * Time ranges for the performance page. Up to 31 days read the hourly per-client table; All reads
 * the daily one from its first day.
 */
export type TimeRange = '1hour' | '6hours' | '24hours' | '7days' | '31days' | 'all';

/** Labels and durations in seconds (null for All) */
export const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; seconds: number | null }> = {
  '1hour': { label: 'Last 1h', seconds: 3600 },
  '6hours': { label: 'Last 6h', seconds: 21600 },
  '24hours': { label: 'Last 24h', seconds: 86400 },
  '7days': { label: 'Last 7d', seconds: 604800 },
  '31days': { label: 'Last 31d', seconds: 2678400 },
  all: { label: 'All', seconds: null },
};

/**
 * The precomputed window of the fct_engine_new_payload_*_window tables matching each range: hour windows end at the
 * last complete hour, the day window is every complete UTC day. Shorter ranges read their blocks.
 */
export const ROLLUP_WINDOW: Record<TimeRange, { grain: 'hour' | 'day'; length: number } | null> = {
  '1hour': null,
  '6hours': null,
  '24hours': { grain: 'hour', length: 24 },
  '7days': { grain: 'hour', length: 168 },
  '31days': { grain: 'hour', length: 744 },
  all: { grain: 'day', length: 0 },
};

/** Ranges whose throughput trend is built from per-slot rows rather than hourly rows */
export const PER_SLOT_CHART_RANGES: TimeRange[] = ['1hour', '6hours'];

export const DEFAULT_TIME_RANGE: TimeRange = 'all';

/** Search params for the performance page */
export const performanceSearchSchema = z.object({
  range: z.enum(['1hour', '6hours', '24hours', '7days', '31days', 'all']).optional(),
  refNodes: z.boolean().optional(),
});

export type PerformanceSearch = z.infer<typeof performanceSearchSchema>;
