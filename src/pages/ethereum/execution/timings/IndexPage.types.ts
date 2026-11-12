import { z } from 'zod';

/**
 * Time range options for engine timing data
 */
export type TimeRange = '1hour' | '6hours' | '24hours' | '7days' | '31days' | '90days' | '180days' | '365days' | 'all';

/**
 * Time range configuration with labels and duration in seconds (null for All)
 */
export const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; seconds: number | null }> = {
  '1hour': { label: 'Last 1h', seconds: 3600 },
  '6hours': { label: 'Last 6h', seconds: 21600 },
  '24hours': { label: 'Last 24h', seconds: 86400 },
  '7days': { label: 'Last 7d', seconds: 604800 },
  '31days': { label: 'Last 31d', seconds: 2678400 },
  '90days': { label: 'Last 90d', seconds: 7776000 },
  '180days': { label: 'Last 6mo', seconds: 15552000 },
  '365days': { label: 'Last 1y', seconds: 31536000 },
  all: { label: 'All', seconds: null },
};

/**
 * The precomputed window matching each range in fct_engine_new_payload_duration_percentile_window:
 * hour windows end at the last complete hour, day windows are complete UTC days ending yesterday (0 = all history)
 */
export const PERCENTILE_WINDOW: Record<TimeRange, { grain: 'hour' | 'day'; length: number }> = {
  '1hour': { grain: 'hour', length: 1 },
  '6hours': { grain: 'hour', length: 6 },
  '24hours': { grain: 'hour', length: 24 },
  '7days': { grain: 'hour', length: 168 },
  '31days': { grain: 'hour', length: 744 },
  '90days': { grain: 'day', length: 90 },
  '180days': { grain: 'day', length: 180 },
  '365days': { grain: 'day', length: 365 },
  all: { grain: 'day', length: 0 },
};

/**
 * Time ranges that should use per-slot data for charts (short ranges)
 * Longer ranges will use hourly aggregated data or hide per-slot charts
 */
export const PER_SLOT_CHART_RANGES: TimeRange[] = ['1hour', '6hours'];

/**
 * Time ranges backed by hourly aggregated data (per-slot or hourly charts)
 * Longer ranges use the daily aggregations instead
 */
export const HOURLY_CHART_RANGES: TimeRange[] = ['1hour', '6hours', '24hours', '7days', '31days'];

/**
 * Zod schema for timings page search parameters
 * Validates tab state and time range selection in URL
 */
export const timingsSearchSchema = z.object({
  // Active tab selection
  // 'performance' is a legacy tab, redirected to /ethereum/execution/performance
  tab: z.enum(['overview', 'newPayload', 'getBlobs', 'clients', 'performance']).optional().catch(undefined),

  // Time range for data queries
  range: z
    .enum(['1hour', '6hours', '24hours', '7days', '31days', '90days', '180days', '365days', 'all'])
    .optional()
    .catch(undefined),

  // Filter to reference nodes only (ethPandaOps controlled fleet)
  refNodes: z.boolean().optional().catch(undefined),
});

/**
 * Default time range for the page
 */
export const DEFAULT_TIME_RANGE: TimeRange = 'all';
