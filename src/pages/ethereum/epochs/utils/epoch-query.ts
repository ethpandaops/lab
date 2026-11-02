import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import type { EpochFilters } from '../IndexPage.types';

/** One row of the epoch list */
export interface EpochRow {
  epoch: number;
  /** Unix seconds */
  startTime: number;
  /** Slots with a block */
  proposed: number;
  /** Slots without one, among the slots seen so far */
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
  return (
    filters.participationMin !== undefined ||
    filters.participationMax !== undefined ||
    filters.missedMin !== undefined ||
    filters.missedMax !== undefined
  );
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
