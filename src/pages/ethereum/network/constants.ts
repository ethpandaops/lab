import { z } from 'zod';

/** Time ranges the network pages cover */
export type NetworkRange = '7d' | '30d' | '90d' | '1y' | 'all';

/** Days in each range; all history when null */
export const RANGE_DAYS: Record<NetworkRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null,
};

/** Range options for the range control */
export const RANGE_OPTIONS: ReadonlyArray<{ value: NetworkRange; label: string }> = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

export const DEFAULT_RANGE: NetworkRange = 'all';

/** Zod schema for the search params every network page takes */
export const networkSearchSchema = z.object({
  t: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().catch(undefined),
});
export type NetworkSearch = z.infer<typeof networkSearchSchema>;

/** Countries the overview charts */
export const TOP_PLACES = 10;

/**
 * First full day of the execution discovery crawl that counts nodes at today's scale. Before it the census held a few
 * hundred nodes a day, so execution series start here.
 */
export const EL_CRAWL_START = '2026-07-15';

/** Zod schema for the overview's search params: the range, and which layer "where nodes run" shows */
export const overviewSearchSchema = networkSearchSchema.extend({
  layer: z.enum(['consensus', 'execution']).optional().catch(undefined),
});
