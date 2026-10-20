import type { ClientDay } from './fast-confirmation.api';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import { STALL_EPISODE_GAP_SLOTS } from './constants';

/** One (block, node) observation from fct_block_fast_confirmation_by_node */
export interface BlockObservation {
  slot: number;
  slotStartDateTime: number;
  blockRoot: string;
  status: string;
  client: string;
  node: string;
  confirmationType: string;
  fastConfirmedMs: number | null;
  confirmationSlot: number | null;
  finalizedMs: number | null;
}

/** Per-slot summary across every fast confirmation node */
export interface SlotSummary {
  slot: number;
  epoch: number;
  slotStartDateTime: number;
  blockRoot: string;
  /** Earliest fast confirmation across nodes, in ms after slot start */
  fastConfirmedMs: number | null;
  finalizedMs: number | null;
  /** True when at least one node only confirmed the block through a descendant */
  viaDescendant: boolean;
  /** True when a node that was following the chain never fast confirmed the block */
  unconfirmed: boolean;
  byClient: Array<{ client: string; fastConfirmedMs: number | null; confirmationType: string }>;
}

/** A run of slow or indirect confirmations on one node */
export interface StallEpisode {
  node: string;
  client: string;
  startSlot: number;
  endSlot: number;
  startDateTime: number;
  blocks: number;
  worstMs: number;
}

/**
 * Format a duration in milliseconds for display, e.g. "11.6s", "15m 49s", "1h 4m".
 */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Collapse per-node observations into one summary per canonical slot.
 */
export function summarizeSlots(observations: BlockObservation[]): SlotSummary[] {
  const bySlot = new Map<number, BlockObservation[]>();
  for (const obs of observations) {
    if (obs.status !== 'canonical') continue;
    const list = bySlot.get(obs.slot);
    if (list) list.push(obs);
    else bySlot.set(obs.slot, [obs]);
  }

  const summaries: SlotSummary[] = [];
  for (const [slot, list] of bySlot) {
    const confirmed = list.map(o => o.fastConfirmedMs).filter((v): v is number => v !== null);
    const finalized = list.map(o => o.finalizedMs).filter((v): v is number => v !== null);
    summaries.push({
      slot,
      epoch: Math.floor(slot / SLOTS_PER_EPOCH),
      slotStartDateTime: list[0].slotStartDateTime,
      blockRoot: list[0].blockRoot,
      fastConfirmedMs: confirmed.length ? Math.min(...confirmed) : null,
      finalizedMs: finalized.length ? Math.min(...finalized) : null,
      viaDescendant: list.some(o => o.confirmationType === 'descendant'),
      unconfirmed: list.some(o => o.confirmationType === 'unconfirmed'),
      byClient: earliestByClient(list),
    });
  }

  return summaries.sort((a, b) => a.slot - b.slot);
}

/** One entry per client with its earliest confirmation across that client's nodes. */
function earliestByClient(list: BlockObservation[]): SlotSummary['byClient'] {
  const byClient = new Map<string, SlotSummary['byClient'][number]>();
  for (const o of list) {
    const current = byClient.get(o.client);
    const earlier =
      o.fastConfirmedMs !== null &&
      (current?.fastConfirmedMs === null || o.fastConfirmedMs < (current?.fastConfirmedMs ?? Infinity));
    if (!current || earlier) {
      byClient.set(o.client, {
        client: o.client,
        fastConfirmedMs: o.fastConfirmedMs,
        confirmationType: o.confirmationType,
      });
    }
  }
  return [...byClient.values()].sort((a, b) => a.client.localeCompare(b.client));
}

/**
 * Group slow or indirect confirmations into stall episodes per node, newest first.
 */
export function groupStallEpisodes(observations: BlockObservation[]): StallEpisode[] {
  const byNode = new Map<string, BlockObservation[]>();
  for (const obs of observations) {
    if (obs.status !== 'canonical') continue;
    const list = byNode.get(obs.node);
    if (list) list.push(obs);
    else byNode.set(obs.node, [obs]);
  }

  const episodes: StallEpisode[] = [];
  for (const [node, list] of byNode) {
    list.sort((a, b) => a.slot - b.slot);
    let current: StallEpisode | null = null;
    for (const obs of list) {
      const ms = obs.fastConfirmedMs ?? Number.POSITIVE_INFINITY;
      if (current && obs.slot - current.endSlot <= STALL_EPISODE_GAP_SLOTS) {
        current.endSlot = obs.slot;
        current.blocks += 1;
        current.worstMs = Math.max(current.worstMs, ms);
        continue;
      }
      current = {
        node,
        client: obs.client,
        startSlot: obs.slot,
        endSlot: obs.slot,
        startDateTime: obs.slotStartDateTime,
        blocks: 1,
        worstMs: ms,
      };
      episodes.push(current);
    }
  }

  return episodes.sort((a, b) => b.startSlot - a.startSlot);
}

/** One bucket of a log-spaced histogram */
export interface LogBucket {
  /** Geometric centre of the bucket in seconds */
  center: number;
  count: number;
}

/**
 * Bucket millisecond values into log-spaced bins between minSeconds and maxSeconds.
 * Values outside the range are clamped into the edge bins.
 */
export function logHistogram(valuesMs: number[], minSeconds: number, maxSeconds: number, bins: number): LogBucket[] {
  const logMin = Math.log10(minSeconds);
  const logMax = Math.log10(maxSeconds);
  const step = (logMax - logMin) / bins;
  const counts = new Array<number>(bins).fill(0);

  for (const ms of valuesMs) {
    if (!Number.isFinite(ms) || ms <= 0) continue;
    const idx = Math.floor((Math.log10(ms / 1000) - logMin) / step);
    counts[Math.min(bins - 1, Math.max(0, idx))] += 1;
  }

  return counts.map((count, i) => ({ center: 10 ** (logMin + step * (i + 0.5)), count }));
}

/** Colour tier of one epoch in the block field */
export type FieldTier = 'none' | 'ok' | 'late' | 'slow' | 'stalled' | 'held';

/** Seconds in one epoch */
export const EPOCH_SECONDS = 384;

/** A confirmation this slow means the node only confirmed the block once it was finalized */
export const HELD_TO_FINALITY_MS = 700_000;

/**
 * Tier for the slowest fast confirmation seen in an epoch.
 */
export function tierForMs(worstMs: number | null): FieldTier {
  if (worstMs === null) return 'ok';
  if (worstMs >= HELD_TO_FINALITY_MS) return 'held';
  if (worstMs >= 120_000) return 'stalled';
  if (worstMs >= 25_000) return 'slow';
  return 'late';
}

/** One epoch in the block field */
export interface FieldEpoch {
  epoch: number;
  startTime: number;
  day: number;
  column: number;
  tier: FieldTier;
  worstMs: number | null;
  lateBlocks: number;
}

/** Every epoch between the first and last covered hour, laid out as UTC days by epoch of day */
export interface FieldModel {
  days: number[];
  columns: number;
  epochs: FieldEpoch[];
  byEpoch: Map<number, FieldEpoch>;
}

/**
 * Lay out every epoch covered by the node as rows of UTC days and columns of epoch-of-day.
 * Coverage is hourly, taken from the hours where the node scored at least one block.
 * Late observations (slow confirmations) set the tier of their epoch.
 */
export function buildField(genesis: number, coveredHours: number[], late: BlockObservation[]): FieldModel {
  const covered = new Set(coveredHours);
  const columns = Math.round(86_400 / EPOCH_SECONDS);
  if (!covered.size) return { days: [], columns, epochs: [], byEpoch: new Map() };

  const lateByEpoch = new Map<number, { worstMs: number; blocks: Set<number> }>();
  for (const o of late) {
    if (o.status !== 'canonical') continue;
    const epoch = Math.floor(o.slot / 32);
    const entry = lateByEpoch.get(epoch) ?? { worstMs: 0, blocks: new Set<number>() };
    entry.worstMs = Math.max(entry.worstMs, o.fastConfirmedMs ?? Number.POSITIVE_INFINITY);
    entry.blocks.add(o.slot);
    lateByEpoch.set(epoch, entry);
  }

  const first = Math.min(...covered);
  const last = Math.max(...covered) + 3600;
  const firstEpoch = Math.ceil((first - genesis) / EPOCH_SECONDS);
  const lastEpoch = Math.floor((last - genesis) / EPOCH_SECONDS) - 1;
  const firstDay = Math.floor((genesis + firstEpoch * EPOCH_SECONDS) / 86_400) * 86_400;

  const epochs: FieldEpoch[] = [];
  const dayStarts = new Set<number>();
  for (let epoch = firstEpoch; epoch <= lastEpoch; epoch++) {
    const startTime = genesis + epoch * EPOCH_SECONDS;
    const hour = Math.floor(startTime / 3600) * 3600;
    const dayStart = Math.floor(startTime / 86_400) * 86_400;
    const lateEntry = lateByEpoch.get(epoch);
    dayStarts.add(dayStart);
    epochs.push({
      epoch,
      startTime,
      day: (dayStart - firstDay) / 86_400,
      column: Math.min(columns - 1, Math.floor((startTime - dayStart) / EPOCH_SECONDS)),
      tier: covered.has(hour) ? tierForMs(lateEntry ? lateEntry.worstMs : null) : 'none',
      worstMs: lateEntry ? lateEntry.worstMs : null,
      lateBlocks: lateEntry ? lateEntry.blocks.size : 0,
    });
  }

  return {
    days: [...dayStarts].sort((a, b) => a - b),
    columns,
    epochs,
    byEpoch: new Map(epochs.map(e => [e.epoch, e])),
  };
}

/** Whole-history summary of one client, built from its daily aggregates */
export interface ClientSummary {
  client: string;
  since: string;
  blocks: number;
  fastMs: number;
  finalityMs: number;
  speedup: number;
  directShare: number;
  reverted: number;
  worstMs: number;
}

/**
 * Summarise each client's daily aggregates, weighting daily medians by blocks scored.
 */
export function summarizeClients(days: ClientDay[]): ClientSummary[] {
  const byClient = new Map<string, ClientDay[]>();
  for (const d of days) {
    if (!d.client || d.observations === 0) continue;
    const list = byClient.get(d.client);
    if (list) list.push(d);
    else byClient.set(d.client, [d]);
  }

  return [...byClient.entries()]
    .map(([client, list]) => {
      const blocks = list.reduce((sum, d) => sum + d.slots, 0);
      const weight = list.reduce((sum, d) => sum + d.observations, 0);
      const weighted = (pick: (d: ClientDay) => number): number =>
        list.reduce((sum, d) => sum + pick(d) * d.observations, 0) / weight;
      const fastMs = weighted(d => d.p50FastMs);
      const finalityMs = weighted(d => d.p50FinalityMs);
      return {
        client,
        since: list.map(d => d.day).sort()[0],
        blocks,
        fastMs,
        finalityMs,
        speedup: fastMs > 0 ? finalityMs / fastMs : 0,
        directShare: list.reduce((sum, d) => sum + d.direct, 0) / weight,
        reverted: list.reduce((sum, d) => sum + d.orphaned, 0),
        worstMs: Math.max(...list.map(d => d.maxFastMs)),
      };
    })
    .sort((a, b) => b.blocks - a.blocks);
}
