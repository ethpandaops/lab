import { z } from 'zod';

/**
 * Time range options for engine timing data
 */
export type TimeRange = 'hour' | 'day' | '7days';

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
  range: z.enum(['hour', 'day', '7days']).optional(),

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
export const DEFAULT_TIME_RANGE: TimeRange = 'day';

/**
 * Status values for engine_newPayload responses
 */
export type NewPayloadStatus = 'VALID' | 'INVALID' | 'SYNCING' | 'ACCEPTED' | 'INVALID_BLOCK_HASH';

/**
 * Status values for engine_getBlobs responses
 */
export type GetBlobsStatus = 'SUCCESS' | 'PARTIAL' | 'EMPTY' | 'ERROR' | 'UNSUPPORTED';
