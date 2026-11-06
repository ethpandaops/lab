import { z } from 'zod';

/** Time windows for the page when no slot range is set; `all` starts at genesis */
export const TIME_WINDOWS = ['1h', '6h', '24h', '7d', 'all'] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

/** Seconds in each time window */
export const TIME_WINDOW_SECONDS: Record<Exclude<TimeWindow, 'all'>, number> = {
  '1h': 3600,
  '6h': 6 * 3600,
  '24h': 24 * 3600,
  '7d': 7 * 24 * 3600,
};

export const DEFAULT_TIME_WINDOW: TimeWindow = 'all';

/** Blocks table columns the API can sort by */
export const BLOCK_SORT_KEYS = ['slot', 'node', 'gas', 'txs', 'size'] as const;
export type BlockSortKey = (typeof BLOCK_SORT_KEYS)[number];

const count = z.coerce.number().int().nonnegative().optional();
const amount = z.coerce.number().nonnegative().optional();

/** Filters applied by the API to the timeline, the pairings and the blocks table */
export const blockFiltersSchema = z.object({
  slotFrom: count,
  slotTo: count,
  /** Node id, the last segment of the node name */
  node: z.string().optional(),
  /** Consensus client implementation */
  cl: z.string().optional(),
  /** Consensus client version substring */
  clVersion: z.string().optional(),
  /** Execution client, read from the node name */
  el: z.string().optional(),
  /** Gas used bounds, in millions */
  gasMin: amount,
  gasMax: amount,
  txsMin: count,
  txsMax: count,
  /** Block size bounds, in KB */
  sizeMin: amount,
  sizeMax: amount,
});

export type BlockFilters = z.infer<typeof blockFiltersSchema>;

export const BLOCK_FILTER_KEYS = Object.keys(blockFiltersSchema.shape) as Array<keyof BlockFilters>;

/** Search params of the locally built blocks page */
export const locallyBuiltBlocksSearchSchema = blockFiltersSchema.extend({
  window: z.enum(TIME_WINDOWS).optional(),
  /** Blocks table page, from 0 */
  page: z.coerce.number().int().nonnegative().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(BLOCK_SORT_KEYS).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type LocallyBuiltBlocksSearch = z.infer<typeof locallyBuiltBlocksSearchSchema>;
