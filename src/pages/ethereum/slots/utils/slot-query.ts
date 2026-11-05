import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import { entityQuery } from '@/pages/ethereum/clients/utils/client-share';
import type { BlockSource, SlotFilters, SlotSort, SlotStatus } from '../IndexPage.types';

/**
 * Tables that hold per-slot facts. Filters run server-side on one of them (the driver); the rest are joined by
 * slot and checked here.
 */
export type SlotTable = 'proposer' | 'status' | 'entity' | 'block' | 'mev' | 'graffiti' | 'ptc';

/** Blob gas per blob, unchanged since Deneb */
export const GAS_PER_BLOB = 131_072;

/** Payload column each non-slot sort orders by, all on fct_block_head */
export const SORT_COLUMNS: Record<Exclude<SlotSort, 'slot'>, string> = {
  gas: 'execution_payload_gas_used',
  txs: 'execution_payload_transactions_count',
  blobs: 'execution_payload_blob_gas_used',
};

/** Everything known about one slot, from whichever tables were read. A missing field means no row. */
export interface SlotFacts {
  slot: number;
  /** fct_block_proposer_head: every slot up to the head; a null root is a missed slot */
  proposer?: { index: number | null; blockRoot: string | null };
  /** fct_block_proposer: finalized status */
  status?: 'canonical' | 'orphaned' | 'missed';
  entity?: string | null;
  block?: {
    number: number | null;
    proposerIndex: number | null;
    gasUsed: number | null;
    gasLimit: number | null;
    txs: number | null;
    blobs: number | null;
  };
  mev?: { relays: string[]; builder: string | null; value: string | null };
  graffiti?: { cl: string; el: string; entity: string | null };
  ptc?: { presentVotes: number | null; votesSeen: number | null };
}

/** One row of the slot list */
export interface SlotRow {
  slot: number;
  epoch: number;
  /** Unix seconds */
  timestamp: number;
  proposerIndex: number | null;
  entity: string | null;
  status: SlotStatus | null;
  source: BlockSource | null;
  blockNumber: number | null;
  gasUsed: number | null;
  gasLimit: number | null;
  txCount: number | null;
  blobCount: number | null;
  relays: string[];
  builder: string | null;
  /** MEV payment in wei */
  value: string | null;
  cl: string | null;
  el: string | null;
  ptcPresentVotes: number | null;
  ptcVotesSeen: number | null;
}

/** Where a page starts: below or above a slot (slot order), or at a position in an API page (value order) */
export type SlotCursor =
  | { kind: 'before'; slot: number }
  | { kind: 'after'; slot: number }
  | { kind: 'token'; token: string | undefined; skip: number };

export function encodeCursor(cursor: SlotCursor): string {
  if (cursor.kind === 'before') return `lt:${cursor.slot}`;
  if (cursor.kind === 'after') return `gt:${cursor.slot}`;
  return `t:${cursor.skip}:${cursor.token ?? ''}`;
}

export function parseCursor(value: string | undefined): SlotCursor | undefined {
  if (!value) return undefined;
  const keyset = /^(lt|gt):(\d+)$/.exec(value);
  if (keyset) return { kind: keyset[1] === 'lt' ? 'before' : 'after', slot: Number(keyset[2]) };
  const token = /^t:(\d+):(.*)$/.exec(value);
  if (token) return { kind: 'token', skip: Number(token[1]), token: token[2] || undefined };
  return undefined;
}

/**
 * Inclusive slot bounds from the slot and time range filters, or undefined where open. A time range keeps the
 * slots that start inside it.
 */
export function slotBounds(filters: SlotFilters, genesisTime: number): { min?: number; max?: number } {
  const fromTime =
    filters.timeStart !== undefined
      ? Math.max(0, Math.ceil((filters.timeStart - genesisTime) / SECONDS_PER_SLOT))
      : undefined;
  const toTime =
    filters.timeEnd !== undefined ? Math.floor((filters.timeEnd - genesisTime) / SECONDS_PER_SLOT) : undefined;
  const mins = [filters.slotMin, fromTime].filter((v): v is number => v !== undefined);
  const maxes = [filters.slotMax, toTime].filter((v): v is number => v !== undefined);
  return {
    min: mins.length ? Math.max(...mins) : undefined,
    max: maxes.length ? Math.min(...maxes) : undefined,
  };
}

/** Tables a filter set needs to be read, to check every filter */
export function filterTables(filters: SlotFilters): SlotTable[] {
  const tables = new Set<SlotTable>();
  if (filters.proposer !== undefined) tables.add('proposer');
  if (filters.status) tables.add('status');
  if (filters.entity) tables.add('entity');
  if (filters.relay || filters.builder || filters.source) tables.add('mev');
  // Local means a block without a relay delivery, so it needs the blocks too
  if (filters.source === 'local') tables.add('block');
  if (hasRange(filters.blobsMin, filters.blobsMax) || hasRange(filters.gasMin, filters.gasMax)) tables.add('block');
  if (filters.cl || filters.el) tables.add('graffiti');
  return [...tables];
}

/**
 * The table to page through. Value sorts can only be ordered on the block table; otherwise the most selective
 * filtered table drives, so the fewest rows are joined and checked here.
 */
export function chooseDriver(filters: SlotFilters, sort: SlotSort): SlotTable {
  if (sort !== 'slot') return 'block';
  if (filters.proposer !== undefined) return 'proposer';
  if (filters.builder) return 'mev';
  if (filters.entity) return 'entity';
  if (filters.status === 'missed' || filters.status === 'orphaned') return 'status';
  if (filters.cl || filters.el) return 'graffiti';
  if (filters.relay || filters.source === 'mev') return 'mev';
  if (hasRange(filters.blobsMin, filters.blobsMax) || hasRange(filters.gasMin, filters.gasMax)) return 'block';
  if (filters.source === 'local') return 'block';
  if (filters.status === 'proposed') return 'status';
  return 'proposer';
}

/** API filter params for the filters a table can apply itself */
export function serverQuery(table: SlotTable, filters: SlotFilters): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  switch (table) {
    case 'proposer':
      if (filters.proposer !== undefined) query.proposer_validator_index_eq = filters.proposer;
      break;
    case 'status':
      if (filters.status) query.status_eq = filters.status === 'proposed' ? 'canonical' : filters.status;
      break;
    case 'entity':
      if (filters.entity) Object.assign(query, entityQuery(filters.entity));
      break;
    case 'block':
      if (filters.blobsMin !== undefined) query.execution_payload_blob_gas_used_gte = filters.blobsMin * GAS_PER_BLOB;
      if (filters.blobsMax !== undefined) query.execution_payload_blob_gas_used_lte = filters.blobsMax * GAS_PER_BLOB;
      if (filters.gasMin !== undefined) query.execution_payload_gas_used_gte = Math.round(filters.gasMin * 1e6);
      if (filters.gasMax !== undefined) query.execution_payload_gas_used_lte = Math.round(filters.gasMax * 1e6);
      break;
    case 'mev':
      if (filters.relay) query.relay_names_has = filters.relay;
      if (filters.builder) query.builder_pubkey_eq = filters.builder.toLowerCase();
      break;
    case 'graffiti':
      if (filters.cl) query.consensus_client_eq = filters.cl;
      if (filters.el) query.execution_client_eq = filters.el;
      break;
  }
  return query;
}

/**
 * Whether a slot passes every filter, given facts from every table in `filterTables`. `mevCoveredTo` is the
 * newest slot the MEV table has caught up to; a newer block without a relay delivery is not yet known to be local.
 */
export function matchesFilters(facts: SlotFacts, filters: SlotFilters, mevCoveredTo = Infinity): boolean {
  if (filters.proposer !== undefined && facts.proposer?.index !== filters.proposer) return false;
  if (filters.status && toStatus(facts.status) !== filters.status) return false;
  if (filters.entity && !matchesEntity(facts.entity, filters.entity)) return false;
  if (filters.source === 'mev' && !facts.mev) return false;
  if (filters.source === 'local' && (facts.mev || !facts.block || facts.slot > mevCoveredTo)) return false;
  if (filters.relay && !facts.mev?.relays.includes(filters.relay)) return false;
  if (filters.builder && facts.mev?.builder?.toLowerCase() !== filters.builder.toLowerCase()) return false;
  if (hasRange(filters.blobsMin, filters.blobsMax) && !inRange(facts.block?.blobs, filters.blobsMin, filters.blobsMax))
    return false;
  if (
    hasRange(filters.gasMin, filters.gasMax) &&
    !inRange(
      facts.block?.gasUsed,
      filters.gasMin === undefined ? undefined : filters.gasMin * 1e6,
      filters.gasMax === undefined ? undefined : filters.gasMax * 1e6
    )
  )
    return false;
  if (filters.cl && facts.graffiti?.cl !== filters.cl) return false;
  if (filters.el && facts.graffiti?.el !== filters.el) return false;
  return true;
}

/** Merge one API row from a table into the facts for its slot */
export function applyRow(table: SlotTable, row: Record<string, unknown>, facts: Map<number, SlotFacts>): void {
  const slot = row.slot;
  if (typeof slot !== 'number') return;
  const entry = facts.get(slot) ?? { slot };
  facts.set(slot, entry);
  const num = (value: unknown): number | null => (typeof value === 'number' ? value : null);
  const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

  switch (table) {
    case 'proposer':
      entry.proposer = { index: num(row.proposer_validator_index), blockRoot: str(row.block_root) };
      break;
    case 'status': {
      const status = str(row.status);
      // A slot can hold an orphaned block and a canonical one; canonical wins, then orphaned
      if (status === 'canonical' || status === 'orphaned' || status === 'missed') {
        const rank = { canonical: 0, orphaned: 1, missed: 2 } as const;
        if (!entry.status || rank[status] < rank[entry.status]) entry.status = status;
      }
      break;
    }
    case 'entity':
      entry.entity = str(row.entity);
      break;
    case 'block': {
      const blobGas = num(row.execution_payload_blob_gas_used);
      entry.block = {
        number: num(row.execution_payload_block_number),
        proposerIndex: num(row.proposer_index),
        gasUsed: num(row.execution_payload_gas_used),
        gasLimit: num(row.execution_payload_gas_limit),
        txs: num(row.execution_payload_transactions_count),
        blobs: blobGas === null ? null : Math.round(blobGas / GAS_PER_BLOB),
      };
      break;
    }
    case 'mev':
      entry.mev = {
        relays: Array.isArray(row.relay_names) ? (row.relay_names as string[]) : [],
        builder: str(row.builder_pubkey),
        value: str(row.value),
      };
      break;
    case 'graffiti':
      entry.graffiti = {
        cl: str(row.consensus_client) ?? 'unknown',
        el: str(row.execution_client) ?? 'unknown',
        entity: str(row.entity),
      };
      break;
    case 'ptc':
      entry.ptc = { presentVotes: num(row.payload_present_votes), votesSeen: num(row.ptc_validators_seen) };
      break;
  }
}

/** The list row for a slot's facts; see `matchesFilters` for `mevCoveredTo` */
export function toSlotRow(facts: SlotFacts, genesisTime: number, mevCoveredTo = Infinity): SlotRow {
  const status: SlotStatus | null =
    toStatus(facts.status) ??
    (facts.proposer ? (facts.proposer.blockRoot ? 'proposed' : 'missed') : facts.block ? 'proposed' : null);
  return {
    slot: facts.slot,
    epoch: Math.floor(facts.slot / SLOTS_PER_EPOCH),
    timestamp: genesisTime + facts.slot * SECONDS_PER_SLOT,
    proposerIndex: facts.proposer?.index ?? facts.block?.proposerIndex ?? null,
    entity: facts.entity ?? facts.graffiti?.entity ?? null,
    status,
    source: facts.mev ? 'mev' : facts.block && status !== 'missed' && facts.slot <= mevCoveredTo ? 'local' : null,
    blockNumber: facts.block?.number ?? null,
    gasUsed: facts.block?.gasUsed ?? null,
    gasLimit: facts.block?.gasLimit ?? null,
    txCount: facts.block?.txs ?? null,
    blobCount: facts.block?.blobs ?? null,
    relays: facts.mev?.relays ?? [],
    builder: facts.mev?.builder ?? null,
    value: facts.mev?.value ?? null,
    cl: facts.graffiti?.cl ?? null,
    el: facts.graffiti?.el ?? null,
    ptcPresentVotes: facts.ptc?.presentVotes ?? null,
    ptcVotesSeen: facts.ptc?.votesSeen ?? null,
  };
}

function toStatus(status: SlotFacts['status']): SlotStatus | null {
  if (status === 'canonical') return 'proposed';
  return status ?? null;
}

function matchesEntity(entity: string | null | undefined, filter: string): boolean {
  if (!entity) return false;
  const query = entityQuery(filter);
  return 'entity_eq' in query ? entity === query.entity_eq : entity.includes(query.entity_contains);
}

function hasRange(min: number | undefined, max: number | undefined): boolean {
  return min !== undefined || max !== undefined;
}

function inRange(value: number | null | undefined, min: number | undefined, max: number | undefined): boolean {
  if (value === null || value === undefined) return false;
  return (min === undefined || value >= min) && (max === undefined || value <= max);
}
