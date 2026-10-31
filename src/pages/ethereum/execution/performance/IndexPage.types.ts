import { z } from 'zod';

/**
 * Time ranges for the performance page. Beyond 31 days the hourly per-client table is too heavy
 * to fetch, and the opcode fits already cover their own 7–90 day window.
 */
export type TimeRange = '1hour' | '6hours' | '24hours' | '7days' | '31days';

/** Labels and durations in seconds */
export const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; seconds: number }> = {
  '1hour': { label: 'Last 1h', seconds: 3600 },
  '6hours': { label: 'Last 6h', seconds: 21600 },
  '24hours': { label: 'Last 24h', seconds: 86400 },
  '7days': { label: 'Last 7d', seconds: 604800 },
  '31days': { label: 'Last 31d', seconds: 2678400 },
};

/** Ranges whose throughput trend is built from per-slot rows rather than hourly rows */
export const PER_SLOT_CHART_RANGES: TimeRange[] = ['1hour', '6hours'];

export const DEFAULT_TIME_RANGE: TimeRange = '7days';

/** Search params for the performance page */
export const performanceSearchSchema = z.object({
  range: z.enum(['1hour', '6hours', '24hours', '7days', '31days']).optional(),
  refNodes: z.boolean().optional(),
});

export type PerformanceSearch = z.infer<typeof performanceSearchSchema>;
