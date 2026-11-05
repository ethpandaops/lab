import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctAttestationCorrectnessHeadServiceList,
  fctAttestationLivenessByEntityHeadServiceList,
  fctBlockProposerHeadServiceList,
  fctEpochSummaryCanonicalServiceList,
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
  epochRowFromSummary,
  hasEpochPredicate,
  hasParticipationFilter,
  matchesEpoch,
  parseEpochCursor,
  summariseEpochs,
  summaryQuery,
  type EpochRow,
} from '../utils/epoch-query';
import type { MissedAttestationByEntity } from './useEpochsData.types';

/**
 * Extra finalized epochs read with a participation range, for those the server keeps by basis points that fall just
 * outside the exact range
 */
const PARTICIPATION_MARGIN = 2;

export interface EpochsPageArgs {
  filters: EpochFilters;
  pageSize: number;
  cursor?: string;
}

export interface EpochsPageResult {
  rows: EpochRow[];
  nextCursor?: string;
  prevCursor?: string;
}

/** Epochs held by fct_epoch_summary_canonical; later epochs are not finalized yet */
export interface SummaryEpochs {
  earliest: number;
  latest: number;
}

/** Epoch rows for the consecutive `epochs`, from per-slot proposer and attestation rows of the head tables */
async function readHeadEpochs(epochs: number[], genesisTime: number, signal?: AbortSignal): Promise<EpochRow[]> {
  if (epochs.length === 0) return [];
  const query = {
    slot_start_date_time_gte: slotToTimestamp(Math.min(...epochs) * SLOTS_PER_EPOCH, genesisTime),
    slot_start_date_time_lte: slotToTimestamp((Math.max(...epochs) + 1) * SLOTS_PER_EPOCH - 1, genesisTime),
    page_size: 10_000,
  };
  const [proposers, correctness] = await Promise.all([
    fetchAllPages<FctBlockProposerHead>(fctBlockProposerHeadServiceList, { query }, 'fct_block_proposer_head', signal),
    fetchAllPages<FctAttestationCorrectnessHead>(
      fctAttestationCorrectnessHeadServiceList,
      { query },
      'fct_attestation_correctness_head',
      signal
    ),
  ]);
  return summariseEpochs(epochs, proposers, correctness, genesisTime);
}

/** Epochs from `from` to `to` inclusive, in either direction */
const epochRange = (from: number, to: number): number[] =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (from <= to ? from + i : from - i));

/**
 * One page of epochs, newest first. Finalized epochs come from fct_epoch_summary_canonical, filtered, ordered and
 * paged by the server; the unfinalized epochs after it are summed from the per-slot head tables and filtered here.
 */
export async function fetchEpochsPage(
  { filters, pageSize, cursor: cursorParam }: EpochsPageArgs,
  genesisTime: number,
  summary: SummaryEpochs,
  currentEpoch: number,
  signal?: AbortSignal
): Promise<EpochsPageResult> {
  const participation = hasParticipationFilter(filters);
  const bounds = epochBounds(filters, genesisTime);
  const cursor = parseEpochCursor(cursorParam);
  // The current epoch is still filling up, so only finished epochs are checked against figures
  let lo = Math.max(summary.earliest, bounds.min ?? 0);
  let hi = Math.min(
    hasEpochPredicate(filters) ? currentEpoch - 1 : currentEpoch,
    bounds.max ?? Number.POSITIVE_INFINITY
  );
  const ascending = cursor?.kind === 'after';
  if (cursor?.kind === 'before') hi = Math.min(hi, cursor.epoch - 1);
  if (cursor?.kind === 'after') lo = Math.max(lo, cursor.epoch + 1);
  const start = ascending ? lo : hi;
  const finalized = { lo, hi: Math.min(hi, summary.latest) };
  const tail = { lo: Math.max(lo, summary.latest + 1), hi };

  const rows: EpochRow[] = [];
  /** Epochs past the page are left to look at */
  let more = false;
  /** The last epoch looked at */
  let scannedTo: number | undefined;

  /** Unfinalized epochs, one past what the page still needs unless their figures are filtered */
  async function* tailRows(): AsyncGenerator<EpochRow> {
    if (tail.lo > tail.hi) return;
    if (rows.length === pageSize) {
      more = true;
      return;
    }
    const epochs = ascending ? epochRange(tail.lo, tail.hi) : epochRange(tail.hi, tail.lo);
    const wanted = hasEpochPredicate(filters) ? epochs : epochs.slice(0, pageSize - rows.length + 1);
    yield* await readHeadEpochs(wanted, genesisTime, signal);
  }

  /**
   * Finalized epochs, one past what the page still needs. Should the exact participation check drop more than the
   * margin, the next batch picks up where this one ended.
   */
  async function* finalizedRows(): AsyncGenerator<EpochRow> {
    const range = { ...finalized };
    while (range.lo <= range.hi) {
      if (rows.length === pageSize) {
        more = true;
        return;
      }
      const limit = pageSize - rows.length + 1 + (participation ? PARTICIPATION_MARGIN : 0);
      const response = await fctEpochSummaryCanonicalServiceList({
        query: summaryQuery(range, filters, ascending, limit, genesisTime),
        signal,
        throwOnError: true,
      });
      const batch = (response.data.fct_epoch_summary_canonical ?? []).map(row => epochRowFromSummary(row, genesisTime));
      yield* batch;
      const last = batch.at(-1)?.epoch;
      if (batch.length < limit || last === undefined) return;
      if (ascending) range.lo = last + 1;
      else range.hi = last - 1;
    }
  }

  for (const source of ascending ? [finalizedRows, tailRows] : [tailRows, finalizedRows]) {
    for await (const row of source()) {
      if (rows.length === pageSize) {
        more = true;
        break;
      }
      scannedTo = row.epoch;
      if (matchesEpoch(row, filters)) rows.push(row);
    }
    if (more) break;
  }

  const full = rows.length === pageSize;
  const first = rows[0]?.epoch;
  if (ascending) {
    rows.reverse();
    return {
      rows,
      nextCursor: encodeEpochCursor({ kind: 'before', epoch: first ?? start }),
      prevCursor: !full && !more ? undefined : encodeEpochCursor({ kind: 'after', epoch: scannedTo ?? start }),
    };
  }
  return {
    rows,
    nextCursor: more ? encodeEpochCursor({ kind: 'before', epoch: scannedTo ?? start }) : undefined,
    prevCursor: encodeEpochCursor({ kind: 'after', epoch: first ?? (Number.isFinite(start) ? start : 0) }),
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
  /** First slot time of the offline validators table when the page's epochs start before it */
  offlineDataStart?: number;
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
  const { data: summaryBounds } = useTableBounds('fct_epoch_summary_canonical');
  const { data: livenessBounds } = useTableBounds('fct_attestation_liveness_by_entity_head');
  const genesisTime = currentNetwork?.genesis_time;
  const summary: SummaryEpochs | undefined =
    summaryBounds && genesisTime !== undefined
      ? {
          earliest: slotToEpoch(timestampToSlot(summaryBounds.min, genesisTime)),
          latest: slotToEpoch(timestampToSlot(summaryBounds.max, genesisTime)),
        }
      : undefined;

  const page = useQuery({
    queryKey: ['epochs-list', currentNetwork?.name, args, summary, currentEpoch],
    queryFn: ({ signal }) => fetchEpochsPage(args, genesisTime!, summary!, currentEpoch, signal),
    enabled: genesisTime !== undefined && summary !== undefined && currentEpoch > 0,
    placeholderData: keepPreviousData,
  });

  const epochs = page.data?.rows.map(row => row.epoch) ?? [];
  const offline = useQuery({
    queryKey: ['epochs-list-offline', currentNetwork?.name, epochs],
    queryFn: ({ signal }) => fetchOfflineValidators(epochs, genesisTime!, signal),
    enabled: genesisTime !== undefined && epochs.length > 0,
    placeholderData: keepPreviousData,
  });

  const firstEpochStart =
    epochs.length > 0 && genesisTime !== undefined
      ? slotToTimestamp(Math.min(...epochs) * SLOTS_PER_EPOCH, genesisTime)
      : undefined;

  return {
    data: page.data,
    missedAttestationsByEntity: offline.data ?? [],
    offlineDataStart:
      livenessBounds && firstEpochStart !== undefined && firstEpochStart < livenessBounds.min
        ? livenessBounds.min
        : undefined,
    isLoading: page.isLoading || (genesisTime !== undefined && summary === undefined),
    isPlaceholderData: page.isPlaceholderData,
    error: page.error ?? offline.error,
    currentEpoch,
  };
}
