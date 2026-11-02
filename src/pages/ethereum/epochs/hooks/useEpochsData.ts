import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctAttestationCorrectnessHeadServiceList,
  fctAttestationLivenessByEntityHeadServiceList,
  fctBlockProposerHeadServiceList,
} from '@/api/sdk.gen';
import type {
  FctAttestationCorrectnessHead,
  FctAttestationLivenessByEntityHead,
  FctBlockProposerHead,
} from '@/api/types.gen';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { SLOTS_PER_EPOCH, slotToEpoch, slotToTimestamp, timestampToSlot } from '@/utils/beacon';
import { fetchAllPages } from '@/utils/api-pagination';
import type { EpochFilters } from '../IndexPage.types';
import {
  encodeEpochCursor,
  epochBounds,
  hasEpochPredicate,
  matchesEpoch,
  parseEpochCursor,
  summariseEpochs,
  type EpochRow,
} from '../utils/epoch-query';
import type { MissedAttestationByEntity } from './useEpochsData.types';

/** Epochs read per request while participation or missed-slot filters are checked */
const SCAN_CHUNK = 64;
/** Chunks per page before a short page is returned with a cursor to keep searching */
const MAX_CHUNKS = 4;

export interface EpochsPageArgs {
  filters: EpochFilters;
  pageSize: number;
  cursor?: string;
}

export interface EpochsPageResult {
  rows: EpochRow[];
  nextCursor?: string;
  prevCursor?: string;
  /** The page stopped short of `pageSize` before the earliest epoch; the next page keeps searching */
  partial?: boolean;
  /** For a partial page, the last epoch searched */
  searchedTo?: number;
}

interface EpochSources {
  proposers: FctBlockProposerHead[];
  correctness: FctAttestationCorrectnessHead[];
}

/**
 * Per-slot proposer and attestation rows for `epochs`, read as one slot range. Only the sources asked for are
 * read; the others come back empty.
 */
async function readSources(
  epochs: number[],
  want: { proposers: boolean; correctness: boolean },
  genesisTime: number,
  signal?: AbortSignal
): Promise<EpochSources> {
  if (epochs.length === 0) return { proposers: [], correctness: [] };
  const lo = Math.min(...epochs);
  const hi = Math.max(...epochs);
  const query = {
    slot_start_date_time_gte: slotToTimestamp(lo * SLOTS_PER_EPOCH, genesisTime),
    slot_start_date_time_lte: slotToTimestamp((hi + 1) * SLOTS_PER_EPOCH - 1, genesisTime),
    // Sparse epochs from a filtered scan would otherwise pull every epoch in between
    ...(hi - lo + 1 > epochs.length && { epoch_in_values: epochs.join(',') }),
    page_size: 10_000,
  };
  const [proposers, correctness] = await Promise.all([
    want.proposers
      ? fetchAllPages<FctBlockProposerHead>(
          fctBlockProposerHeadServiceList,
          { query },
          'fct_block_proposer_head',
          signal
        )
      : [],
    want.correctness
      ? fetchAllPages<FctAttestationCorrectnessHead>(
          fctAttestationCorrectnessHeadServiceList,
          { query },
          'fct_attestation_correctness_head',
          signal
        )
      : [],
  ]);
  return { proposers, correctness };
}

/**
 * One page of epochs, newest first. Without figure filters the page is the next `pageSize` epochs; with them,
 * epochs are read in chunks and checked until the page fills, the earliest epoch is reached, or `MAX_CHUNKS`
 * chunks have been read.
 */
export async function fetchEpochsPage(
  { filters, pageSize, cursor: cursorParam }: EpochsPageArgs,
  genesisTime: number,
  earliest: number,
  currentEpoch: number,
  signal?: AbortSignal
): Promise<EpochsPageResult> {
  const predicate = hasEpochPredicate(filters);
  const bounds = epochBounds(filters, genesisTime);
  const cursor = parseEpochCursor(cursorParam);
  // The current epoch is still filling up, so only finished epochs are checked against figures
  let lo = Math.max(earliest, bounds.min ?? 0);
  let hi = Math.min(predicate ? currentEpoch - 1 : currentEpoch, bounds.max ?? Number.POSITIVE_INFINITY);
  const ascending = cursor?.kind === 'after';
  if (cursor?.kind === 'before') hi = Math.min(hi, cursor.epoch - 1);
  if (cursor?.kind === 'after') lo = Math.max(lo, cursor.epoch + 1);
  const start = ascending ? lo : hi;
  const chunk = predicate ? SCAN_CHUNK : pageSize;

  // A filtered scan reads only what its filters check, then fills in the rest for the epochs it keeps
  const scanWant = predicate
    ? {
        proposers: filters.missedMin !== undefined || filters.missedMax !== undefined,
        correctness: filters.participationMin !== undefined || filters.participationMax !== undefined,
      }
    : { proposers: true, correctness: true };
  const read: EpochSources = { proposers: [], correctness: [] };
  const matched: EpochRow[] = [];
  let last: number | undefined;
  let scannedEnd: number | undefined;
  for (let chunks = 0; chunks < (predicate ? MAX_CHUNKS : 1) && matched.length < pageSize && lo <= hi; chunks++) {
    const chunkLo = ascending ? lo : Math.max(lo, hi - chunk + 1);
    const chunkHi = ascending ? Math.min(hi, lo + chunk - 1) : hi;
    const epochs = Array.from({ length: chunkHi - chunkLo + 1 }, (_, i) => (ascending ? chunkLo + i : chunkHi - i));
    const sources = await readSources(epochs, scanWant, genesisTime, signal);
    read.proposers.push(...sources.proposers);
    read.correctness.push(...sources.correctness);
    for (const row of summariseEpochs(epochs, sources.proposers, sources.correctness, genesisTime)) {
      last = row.epoch;
      if (matchesEpoch(row, filters)) matched.push(row);
      if (matched.length === pageSize) break;
    }
    scannedEnd = ascending ? chunkHi : chunkLo;
    if (ascending) lo = chunkHi + 1;
    else hi = chunkLo - 1;
  }

  const kept = matched.map(row => row.epoch);
  const rest = await readSources(
    kept,
    { proposers: !scanWant.proposers, correctness: !scanWant.correctness },
    genesisTime,
    signal
  );
  const rows = summariseEpochs(
    kept,
    [...read.proposers, ...rest.proposers],
    [...read.correctness, ...rest.correctness],
    genesisTime
  );

  const full = rows.length === pageSize;
  // Nothing left to read, and the page did not stop part-way through the last chunk
  const exhausted = lo > hi && (!full || last === scannedEnd);
  const first = rows[0]?.epoch;
  if (ascending) {
    rows.reverse();
    return {
      rows,
      nextCursor: encodeEpochCursor({ kind: 'before', epoch: first ?? start }),
      prevCursor: !full && exhausted ? undefined : encodeEpochCursor({ kind: 'after', epoch: last ?? start }),
    };
  }
  return {
    rows,
    nextCursor: exhausted || last === undefined ? undefined : encodeEpochCursor({ kind: 'before', epoch: last }),
    prevCursor: encodeEpochCursor({ kind: 'after', epoch: first ?? (Number.isFinite(start) ? start : 0) }),
    partial: !full && !exhausted,
    searchedTo: !full && !exhausted ? last : undefined,
  };
}

/** Missed attestations per entity per epoch, for the offline validators chart and table */
async function fetchOfflineValidators(
  epochs: number[],
  genesisTime: number,
  signal?: AbortSignal
): Promise<MissedAttestationByEntity[]> {
  if (epochs.length === 0) return [];
  const rows = await fetchAllPages<FctAttestationLivenessByEntityHead>(
    fctAttestationLivenessByEntityHeadServiceList,
    {
      query: {
        epoch_in_values: epochs.join(','),
        slot_start_date_time_gte: slotToTimestamp(Math.min(...epochs) * SLOTS_PER_EPOCH, genesisTime),
        slot_start_date_time_lte: slotToTimestamp((Math.max(...epochs) + 1) * SLOTS_PER_EPOCH - 1, genesisTime),
        missed_count_gt: 0,
        page_size: 10_000,
      },
    },
    'fct_attestation_liveness_by_entity_head',
    signal
  );
  const totals = new Map<string, MissedAttestationByEntity>();
  for (const row of rows) {
    if (row.epoch === undefined) continue;
    const entity = row.entity ?? 'unknown';
    const key = `${entity}|${row.epoch}`;
    const entry = totals.get(key) ?? { entity, epoch: row.epoch, count: 0 };
    entry.count += row.missed_count ?? 0;
    totals.set(key, entry);
  }
  return [...totals.values()];
}

export interface UseEpochsDataReturn {
  data: EpochsPageResult | undefined;
  missedAttestationsByEntity: MissedAttestationByEntity[];
  isLoading: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
  currentEpoch: number;
}

/**
 * One page of epochs for the given filters and cursor, plus the offline validators in those epochs.
 */
export function useEpochsData(args: EpochsPageArgs): UseEpochsDataReturn {
  const { currentNetwork } = useNetwork();
  const { epoch: currentEpoch } = useBeaconClock();
  const { data: proposerBounds } = useTableBounds('fct_block_proposer_head');
  const genesisTime = currentNetwork?.genesis_time;
  const earliest =
    proposerBounds && genesisTime !== undefined
      ? slotToEpoch(timestampToSlot(proposerBounds.min, genesisTime)) + 1
      : undefined;

  const page = useQuery({
    queryKey: ['epochs-list', currentNetwork?.name, args, earliest, currentEpoch],
    queryFn: ({ signal }) => fetchEpochsPage(args, genesisTime!, earliest!, currentEpoch, signal),
    enabled: genesisTime !== undefined && earliest !== undefined && currentEpoch > 0,
    placeholderData: keepPreviousData,
  });

  const epochs = page.data?.rows.map(row => row.epoch) ?? [];
  const offline = useQuery({
    queryKey: ['epochs-list-offline', currentNetwork?.name, epochs],
    queryFn: ({ signal }) => fetchOfflineValidators(epochs, genesisTime!, signal),
    enabled: genesisTime !== undefined && epochs.length > 0,
    placeholderData: keepPreviousData,
  });

  return {
    data: page.data,
    missedAttestationsByEntity: offline.data ?? [],
    isLoading: page.isLoading || (genesisTime !== undefined && earliest === undefined),
    isPlaceholderData: page.isPlaceholderData,
    error: page.error ?? offline.error,
    currentEpoch,
  };
}
