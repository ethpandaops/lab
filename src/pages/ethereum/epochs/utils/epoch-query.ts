import type { FctEpochSummaryCanonical, FctEpochSummaryCanonicalServiceListData } from '@/api/types.gen';
import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import type { EpochFilters } from '../IndexPage.types';

/** One row of the epoch list */
export interface EpochRow {
  epoch: number;
  /** Unix seconds */
  startTime: number;
  /** Slots with a block */
  proposed: number;
  /** Slots without one, among the slots seen so far; once finalized, slots whose block was orphaned count too */
  missed: number;
  /** Attestation participation (0-1), null without attestation data */
  participation: number | null;
}

/** Where a page starts: below or above an epoch */
export type EpochCursor = { kind: 'before' | 'after'; epoch: number };

export function encodeEpochCursor(cursor: EpochCursor): string {
  return `${cursor.kind === 'before' ? 'lt' : 'gt'}:${cursor.epoch}`;
}

export function parseEpochCursor(value: string | undefined): EpochCursor | undefined {
  const match = value ? /^(lt|gt):(\d+)$/.exec(value) : null;
  return match ? { kind: match[1] === 'lt' ? 'before' : 'after', epoch: Number(match[2]) } : undefined;
}

/** Inclusive epoch bounds from the epoch and time range filters; a time range keeps epochs that start inside it */
export function epochBounds(filters: EpochFilters, genesisTime: number): { min?: number; max?: number } {
  const epochSeconds = SLOTS_PER_EPOCH * SECONDS_PER_SLOT;
  const fromTime =
    filters.timeStart !== undefined
      ? Math.max(0, Math.ceil((filters.timeStart - genesisTime) / epochSeconds))
      : undefined;
  const toTime = filters.timeEnd !== undefined ? Math.floor((filters.timeEnd - genesisTime) / epochSeconds) : undefined;
  const mins = [filters.epochMin, fromTime].filter((v): v is number => v !== undefined);
  const maxes = [filters.epochMax, toTime].filter((v): v is number => v !== undefined);
  return {
    min: mins.length ? Math.max(...mins) : undefined,
    max: maxes.length ? Math.min(...maxes) : undefined,
  };
}

/** Whether any filter needs epoch figures, as opposed to only bounding the range */
export function hasEpochPredicate(filters: EpochFilters): boolean {
  return hasParticipationFilter(filters) || filters.missedMin !== undefined || filters.missedMax !== undefined;
}

/** Whether a participation range is set */
export function hasParticipationFilter(filters: EpochFilters): boolean {
  return filters.participationMin !== undefined || filters.participationMax !== undefined;
}

/**
 * Query for finalized epochs in `[lo, hi]` from fct_epoch_summary_canonical, with the missed-slot and participation
 * ranges applied by the server. Participation is filtered on `participation_bps`, the rate rounded down to basis
 * points, so the bounds keep every epoch in range plus a few just past it that {@link matchesEpoch} drops.
 */
export function summaryQuery(
  { lo, hi }: { lo: number; hi: number },
  filters: EpochFilters,
  ascending: boolean,
  pageSize: number,
  genesisTime: number
): FctEpochSummaryCanonicalServiceListData['query'] {
  const epochSeconds = SLOTS_PER_EPOCH * SECONDS_PER_SLOT;
  return {
    epoch_start_date_time_gte: genesisTime + lo * epochSeconds,
    epoch_start_date_time_lte: genesisTime + hi * epochSeconds,
    ...(filters.missedMin !== undefined && { missed_slot_count_gte: filters.missedMin }),
    ...(filters.missedMax !== undefined && { missed_slot_count_lte: filters.missedMax }),
    ...(filters.participationMin !== undefined && {
      participation_bps_gte: Math.floor(filters.participationMin * 100),
    }),
    ...(filters.participationMax !== undefined && { participation_bps_lte: Math.ceil(filters.participationMax * 100) }),
    order_by: `epoch_start_date_time ${ascending ? 'asc' : 'desc'}`,
    page_size: pageSize,
  };
}

/** An epoch row from fct_epoch_summary_canonical, where orphaned blocks count as missed slots */
export function epochRowFromSummary(row: FctEpochSummaryCanonical, genesisTime: number): EpochRow {
  const epoch = row.epoch ?? 0;
  return {
    epoch,
    startTime: row.epoch_start_date_time ?? genesisTime + epoch * SLOTS_PER_EPOCH * SECONDS_PER_SLOT,
    proposed: row.canonical_block_count ?? 0,
    missed: row.missed_slot_count ?? 0,
    participation: row.participation_rate ?? null,
  };
}

export function matchesEpoch(row: EpochRow, filters: EpochFilters): boolean {
  const percent = row.participation === null ? null : row.participation * 100;
  if (filters.participationMin !== undefined && (percent === null || percent < filters.participationMin)) return false;
  if (filters.participationMax !== undefined && (percent === null || percent > filters.participationMax)) return false;
  if (filters.missedMin !== undefined && row.missed < filters.missedMin) return false;
  if (filters.missedMax !== undefined && row.missed > filters.missedMax) return false;
  return true;
}

/**
 * Epoch figures from per-slot proposer rows (a null block root is a missed slot) and per-slot attestation
 * correctness rows, for each epoch in `epochs`.
 */
export function summariseEpochs(
  epochs: number[],
  proposerRows: Array<{ slot?: number; block_root?: string | null }>,
  correctnessRows: Array<{
    slot?: number;
    votes_head?: number | null;
    votes_other?: number | null;
    votes_max?: number;
  }>,
  genesisTime: number
): EpochRow[] {
  const slots = new Map<number, boolean>();
  for (const row of proposerRows) {
    if (row.slot === undefined) continue;
    slots.set(row.slot, (slots.get(row.slot) ?? false) || Boolean(row.block_root));
  }
  const votes = new Map<number, { cast: number; max: number }>();
  for (const row of correctnessRows) {
    if (row.slot === undefined) continue;
    const epoch = Math.floor(row.slot / SLOTS_PER_EPOCH);
    const entry = votes.get(epoch) ?? { cast: 0, max: 0 };
    entry.cast += (row.votes_head ?? 0) + (row.votes_other ?? 0);
    entry.max += row.votes_max ?? 0;
    votes.set(epoch, entry);
  }

  return epochs.map(epoch => {
    let proposed = 0;
    let missed = 0;
    for (let slot = epoch * SLOTS_PER_EPOCH; slot < (epoch + 1) * SLOTS_PER_EPOCH; slot++) {
      const hasBlock = slots.get(slot);
      if (hasBlock === true) proposed++;
      else if (hasBlock === false) missed++;
    }
    const vote = votes.get(epoch);
    return {
      epoch,
      startTime: genesisTime + epoch * SLOTS_PER_EPOCH * SECONDS_PER_SLOT,
      proposed,
      missed,
      participation: vote && vote.max > 0 ? vote.cast / vote.max : null,
    };
  });
}
