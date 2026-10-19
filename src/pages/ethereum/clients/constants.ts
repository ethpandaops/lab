import { z } from 'zod';

/** Available time period options for the client share charts */
export type TimePeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/** Zod schema for the proposer clients page search params */
export const clientsSearchSchema = z.object({
  /** Time period */
  t: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).optional(),
  /** Consensus client filter for the blocks table */
  cl: z.string().optional(),
  /** Execution client filter for the blocks table */
  el: z.string().optional(),
  /** Show shares of identified blocks only */
  identified: z.boolean().optional(),
});
export type ClientsSearch = z.infer<typeof clientsSearchSchema>;

/** Configuration for each time period: hourly data for short windows, daily for long ones */
export const TIME_RANGE_CONFIG = {
  '24h': { days: 1, dataType: 'hourly' as const },
  '7d': { days: 7, dataType: 'hourly' as const },
  '30d': { days: 30, dataType: 'daily' as const },
  '90d': { days: 90, dataType: 'daily' as const },
  '1y': { days: 365, dataType: 'daily' as const },
  all: { days: null, dataType: 'daily' as const },
} as const;

/** Time period selector options for UI rendering */
export const TIME_PERIOD_OPTIONS: ReadonlyArray<{ value: TimePeriod; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

/** Default time period */
export const DEFAULT_TIME_PERIOD: TimePeriod = '7d';

/** Page size for the aggregate queries */
export const PAGE_SIZE = 10_000;

/** Page size for the blocks table */
export const BLOCKS_PAGE_SIZE = 25;

/** Client name the models use when the graffiti names no client */
export const UNKNOWN_CLIENT = 'unknown';

/** Table that holds one row per block, used for bounds and the blocks table */
export const BLOCK_GRAFFITI_TABLE = 'fct_block_graffiti';

/** Human readable labels for the graffiti_format column */
export const GRAFFITI_FORMAT_LABELS: Record<string, string> = {
  codes_full: 'Client codes, 8 char commits',
  codes_long: 'Client codes, 4 char commits',
  codes_short: 'Client codes, 2 char commits',
  codes_min: 'Client codes',
  version_string: 'Client version string',
  none: 'Unrecognised text',
  empty: 'Empty',
};
