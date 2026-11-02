import { z } from 'zod';
import type { FctBlockGraffitiServiceListData } from '@/api/types.gen';
import { entityQuery } from './client-share';
import { offsetPageToken } from '@/utils/page-token';

/** Rows per page the block tables offer */
export const BLOCK_PAGE_SIZES = [10, 25, 50, 100] as const;

/** Rows per page when the URL does not say */
export const DEFAULT_BLOCK_PAGE_SIZE = 25;

/** Order when the URL does not say: newest first */
export const DEFAULT_BLOCK_SORT = 'slot_start_date_time desc';

/** Columns of fct_block_graffiti the blocks table sorts by */
export const GRAFFITI_SORT_FIELDS = [
  'slot_start_date_time',
  'slot',
  'proposer_index',
  'entity',
  'consensus_client',
  'execution_client',
  'graffiti_format',
  'graffiti_text',
] as const;

const optionalNumber = z.coerce.number().int().nonnegative().optional().catch(undefined);
// Numeric-looking strings (indices, commits) come back from the URL as numbers
const optionalString = z.coerce.string().trim().min(1).optional().catch(undefined);

/**
 * Search params for a filterable blocks table. Spread into a route's schema; `cl`, `el` and `entity` share names
 * with the clients page filter bar so both read the same filter.
 */
export const blockSearchShape = {
  /** Earliest slot start, unix seconds */
  since: optionalNumber,
  /** Latest slot start, unix seconds */
  until: optionalNumber,
  slotMin: optionalNumber,
  slotMax: optionalNumber,
  /** Proposer validator indices, comma separated */
  proposer: optionalString,
  entity: optionalString,
  cl: optionalString,
  clVersion: optionalString,
  clCommit: optionalString,
  el: optionalString,
  elCommit: optionalString,
  /** Graffiti format, e.g. codes_long */
  format: optionalString,
  /** Text the graffiti contains */
  graffiti: optionalString,
  /** "<column> asc|desc" */
  sort: z
    .string()
    .regex(/^[a-z_]+ (asc|desc)$/)
    .optional()
    .catch(undefined),
  /** 1-based page */
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  size: z.coerce
    .number()
    .int()
    .refine(value => (BLOCK_PAGE_SIZES as readonly number[]).includes(value))
    .optional()
    .catch(undefined),
};

export const blockSearchSchema = z.object(blockSearchShape);
export type BlockSearch = z.infer<typeof blockSearchSchema>;

/** Search params that filter rows, as opposed to sort and pagination */
export type BlockFilterKey = Exclude<keyof BlockSearch, 'sort' | 'page' | 'size'>;
export type BlockFilters = Pick<BlockSearch, BlockFilterKey>;

/** Every filter, in the order the panel and chips show them */
export const BLOCK_FILTER_KEYS: readonly BlockFilterKey[] = [
  'since',
  'until',
  'slotMin',
  'slotMax',
  'entity',
  'proposer',
  'cl',
  'clVersion',
  'clCommit',
  'el',
  'elCommit',
  'format',
  'graffiti',
];

/** Filters that read graffiti, so only apply to blocks that made it on chain */
export const GRAFFITI_FILTER_KEYS: readonly BlockFilterKey[] = [
  'cl',
  'clVersion',
  'clCommit',
  'el',
  'elCommit',
  'format',
  'graffiti',
];

/** Search update that clears every filter in `keys` and returns to the first page */
export function clearFilters(keys: readonly BlockFilterKey[]): Partial<BlockSearch> {
  return Object.fromEntries([...keys.map(key => [key, undefined]), ['page', undefined]]);
}

/** Proposer indices in a `proposer` param; anything that is not an index is dropped */
export function parseProposers(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => /^\d+$/.test(part))
    .map(Number);
}

/** Version filter as stored by the graffiti model, which prefixes a "v": 8.0.0 → v8.0.0 */
export function normaliseVersionFilter(value: string): string {
  return /^\d/.test(value) ? `v${value}` : value;
}

/** Column and direction of a `sort` param, falling back to newest first for columns not in `fields` */
export function parseSort(
  sort: string | undefined,
  fields: readonly string[] = GRAFFITI_SORT_FIELDS
): { field: string; desc: boolean } {
  const [field, direction] = (sort ?? '').split(' ');
  if (field && fields.includes(field)) return { field, desc: direction === 'desc' };
  return { field: 'slot_start_date_time', desc: true };
}

type GraffitiQuery = NonNullable<FctBlockGraffitiServiceListData['query']>;

/**
 * fct_block_graffiti query for one page of blocks. `genesisTime` bounds the time range when no start is set, since
 * the API needs a slot_start_date_time filter.
 */
export function graffitiBlocksQuery(search: BlockSearch, genesisTime: number): GraffitiQuery {
  const proposers = parseProposers(search.proposer);
  const size = search.size ?? DEFAULT_BLOCK_PAGE_SIZE;
  const { field, desc } = parseSort(search.sort);
  // Ties (same entity, same client) stay newest first so pages do not shuffle
  const tieBreak = field === 'slot_start_date_time' || field === 'slot' ? '' : ',slot_start_date_time desc';
  const order = `${field} ${desc ? 'desc' : 'asc'}${tieBreak}`;

  return {
    slot_start_date_time_gte: search.since ?? genesisTime,
    ...(search.until !== undefined && { slot_start_date_time_lte: search.until }),
    ...(search.slotMin !== undefined && { slot_gte: search.slotMin }),
    ...(search.slotMax !== undefined && { slot_lte: search.slotMax }),
    ...(proposers.length === 1 && { proposer_index_eq: proposers[0] }),
    ...(proposers.length > 1 && { proposer_index_in_values: proposers.join(',') }),
    ...(search.entity && entityQuery(search.entity)),
    ...(search.cl && { consensus_client_eq: search.cl }),
    ...(search.clVersion && { consensus_client_version_eq: normaliseVersionFilter(search.clVersion) }),
    ...(search.clCommit && { consensus_client_commit_starts_with: search.clCommit.toLowerCase() }),
    ...(search.el && { execution_client_eq: search.el }),
    ...(search.elCommit && { execution_client_commit_starts_with: search.elCommit.toLowerCase() }),
    ...(search.format && { graffiti_format_eq: search.format }),
    ...(search.graffiti && { graffiti_text_contains: search.graffiti }),
    order_by: order,
    page_size: size,
    page_token: offsetPageToken((search.page ?? 1) - 1, size),
  };
}

/** Search update for a DataTable pagination change: a new page size starts again from the first page */
export function paginationUpdate(search: BlockSearch, pageIndex: number, pageSize: number): Partial<BlockSearch> {
  if (pageSize !== (search.size ?? DEFAULT_BLOCK_PAGE_SIZE)) {
    return { size: pageSize === DEFAULT_BLOCK_PAGE_SIZE ? undefined : pageSize, page: undefined };
  }
  return { page: pageIndex > 0 ? pageIndex + 1 : undefined };
}

/** Search update for a DataTable sorting change; clearing the sort returns to newest first */
export function sortUpdate(sorting: Array<{ id: string; desc: boolean }>): Partial<BlockSearch> {
  const next = sorting[0] ? `${sorting[0].id} ${sorting[0].desc ? 'desc' : 'asc'}` : undefined;
  return { sort: next === DEFAULT_BLOCK_SORT ? undefined : next, page: undefined };
}

/** Value for a datetime-local input, in UTC or the browser's zone */
export function toDateTimeInput(timestamp: number | undefined, utc: boolean): string {
  if (timestamp === undefined) return '';
  const offset = utc ? 0 : new Date(timestamp * 1000).getTimezoneOffset() * 60;
  return new Date((timestamp - offset) * 1000).toISOString().slice(0, 16);
}

/** Unix seconds from a datetime-local input value, read as UTC or the browser's zone */
export function fromDateTimeInput(value: string, utc: boolean): number | undefined {
  if (!value) return undefined;
  const ms = utc ? Date.parse(`${value}Z`) : new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}
