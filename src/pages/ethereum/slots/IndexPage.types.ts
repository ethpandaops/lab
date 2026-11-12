import { z } from 'zod';

/** Columns the slot list can be ordered by; every one but slot orders by an execution payload value */
export const SLOT_SORTS = ['slot', 'gas', 'txs', 'blobs'] as const;
export type SlotSort = (typeof SLOT_SORTS)[number];

const SLOT_STATUSES = ['proposed', 'missed', 'orphaned'] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

const BLOCK_SOURCES = ['mev', 'local'] as const;
export type BlockSource = (typeof BLOCK_SOURCES)[number];

export const DEFAULT_PAGE_SIZE = 50;

const optionalCount = z.coerce.number().int().nonnegative().optional().catch(undefined);
const optionalAmount = z.coerce.number().nonnegative().optional().catch(undefined);

/**
 * Search params for the slots list. Every filter, the sort and the page position live here so a view can be
 * shared by URL.
 */
export const slotsSearchSchema = z.object({
  /** Page index, for display; the cursor says where the page starts */
  page: z.coerce.number().int().nonnegative().optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
  /** Opaque page cursor, see `slot-query.ts` */
  cursor: z.string().optional().catch(undefined),
  sort: z.enum(SLOT_SORTS).optional().catch(undefined),
  dir: z.enum(['asc', 'desc']).optional().catch(undefined),

  slotMin: optionalCount,
  slotMax: optionalCount,
  /** Unix seconds */
  timeStart: optionalCount,
  timeEnd: optionalCount,
  status: z.enum(SLOT_STATUSES).optional().catch(undefined),
  source: z.enum(BLOCK_SOURCES).optional().catch(undefined),
  relay: z.string().optional().catch(undefined),
  /** Builder pubkey */
  builder: z.string().optional().catch(undefined),
  /** Entity name, or a group such as `*lido` */
  entity: z.string().optional().catch(undefined),
  /** Proposer validator index */
  proposer: optionalCount,
  blobsMin: optionalCount,
  blobsMax: optionalCount,
  /** Millions of gas */
  gasMin: optionalAmount,
  gasMax: optionalAmount,
  /** Consensus client named in the graffiti */
  cl: z.string().optional().catch(undefined),
  /** Execution client named in the graffiti */
  el: z.string().optional().catch(undefined),
});

export type SlotsSearch = z.infer<typeof slotsSearchSchema>;

/** The filter part of the search params */
export type SlotFilters = Omit<SlotsSearch, 'page' | 'pageSize' | 'cursor' | 'sort' | 'dir'>;

export const SLOT_FILTER_KEYS = [
  'slotMin',
  'slotMax',
  'timeStart',
  'timeEnd',
  'status',
  'source',
  'relay',
  'builder',
  'entity',
  'proposer',
  'blobsMin',
  'blobsMax',
  'gasMin',
  'gasMax',
  'cl',
  'el',
] as const satisfies ReadonlyArray<keyof SlotFilters>;

/** Relays seen delivering mainnet payloads; the filter also accepts any relay picked from the table */
export const KNOWN_RELAYS = [
  'Aestus',
  'Agnostic Gnosis',
  'BloXroute Max Profit',
  'BloXroute Regulated',
  'EthGas',
  'Flashbots',
  'Titan Relay',
  'Ultra Sound',
] as const;
