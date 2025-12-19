import { z } from 'zod';

/**
 * Time range options for engine timing data
 */
export type TimeRange = '1hour' | '6hours' | '24hours' | '7days';

/**
 * Time range configuration with labels and duration in seconds
 */
export const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; seconds: number }> = {
  '1hour': { label: 'Last 1h', seconds: 3600 },
  '6hours': { label: 'Last 6h', seconds: 21600 },
  '24hours': { label: 'Last 24h', seconds: 86400 },
  '7days': { label: 'Last 7d', seconds: 604800 },
};

/**
 * Time ranges that should use per-slot data for charts (short ranges)
 * Longer ranges will use hourly aggregated data or hide per-slot charts
 */
export const PER_SLOT_CHART_RANGES: TimeRange[] = ['1hour', '6hours'];

/**
 * Tab identifiers for the timings page
 */
export type TimingsTab = 'overview' | 'newPayload' | 'getBlobs' | 'clients';

/**
 * Zod schema for timings page search parameters
 * Validates tab state and time range selection in URL
 */
export const timingsSearchSchema = z.object({
  // Active tab selection
  tab: z.enum(['overview', 'newPayload', 'getBlobs', 'clients']).optional(),

  // Time range for data queries
  range: z.enum(['1hour', '6hours', '24hours', '7days']).optional(),

  // Filter to reference nodes only (ethPandaOps controlled fleet)
  refNodes: z.boolean().optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type TimingsSearch = z.infer<typeof timingsSearchSchema>;

/**
 * Default time range for the page
 */
export const DEFAULT_TIME_RANGE: TimeRange = '1hour';

/**
 * Status values for engine_newPayload responses
 */
export type NewPayloadStatus = 'VALID' | 'INVALID' | 'SYNCING' | 'ACCEPTED' | 'INVALID_BLOCK_HASH';

/**
 * Status values for engine_getBlobs responses
 */
export type GetBlobsStatus = 'SUCCESS' | 'PARTIAL' | 'EMPTY' | 'ERROR' | 'UNSUPPORTED';
