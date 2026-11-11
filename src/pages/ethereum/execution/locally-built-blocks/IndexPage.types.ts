import { z } from 'zod';

/** Time windows for the page when no slot range is set; `all` starts at the table's start */
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
const BLOCK_SORT_KEYS = ['slot', 'node', 'gas', 'txs', 'size'] as const;
export type BlockSortKey = (typeof BLOCK_SORT_KEYS)[number];

const count = z.coerce.number().int().nonnegative().optional().catch(undefined);
const amount = z.coerce.number().nonnegative().optional().catch(undefined);

/** Filters applied by the API to the timeline, the pairings and the blocks table */
const blockFiltersSchema = z.object({
  slotFrom: count,
  slotTo: count,
  /** Node id, the last segment of the node name */
  node: z.string().optional().catch(undefined),
  /** Consensus client implementation */
  cl: z.string().optional().catch(undefined),
  /** Consensus client version substring */
  clVersion: z.string().optional().catch(undefined),
  /** Execution client, read from the node name */
  el: z.string().optional().catch(undefined),
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
  window: z.enum(TIME_WINDOWS).optional().catch(undefined),
  /** Blocks table page, from 0 */
  page: z.coerce.number().int().nonnegative().optional().catch(undefined),
  /** Where a newest-first page starts, see `widening-window.ts` */
  cursor: z.string().optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
  sort: z.enum(BLOCK_SORT_KEYS).optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
});

export type LocallyBuiltBlocksSearch = z.infer<typeof locallyBuiltBlocksSearchSchema>;
