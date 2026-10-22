import { keepPreviousData, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  fctBlockProposerEntityServiceListOptions,
  fctBlockHeadServiceListOptions,
  fctBlockBlobCountHeadServiceListOptions,
  fctAttestationCorrectnessHeadServiceListOptions,
  intBlockCanonicalServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { fctBlockProposerEntityServiceList } from '@/api/sdk.gen';
import type {
  FctBlockProposerEntity,
  FctBlockHead,
  FctBlockBlobCountHead,
  FctAttestationCorrectnessHead,
  IntBlockCanonical,
} from '@/api/types.gen';
import type { RangePage } from '@/components/Lists/RangePager';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';

import type { SlotData } from '../../epochs/hooks/useEpochDetailData.types';

/** Proposals per page */
export const PROPOSALS_PER_PAGE = 25;

export interface UseEntityProposalsPageReturn {
  /** Proposals on the page, newest first */
  slots: SlotData[];
  /** Range of the page for the pager. Proposals are sparse, so newer pages are resolved on demand. */
  page: RangePage;
  isLoading: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
  /** Top slot of the page of proposals just newer than this one; undefined means the latest page */
  resolveNewer: () => Promise<number | undefined>;
}

/**
 * One page of an entity's block proposals, at or below slot `from` (undefined: latest), with the
 * per-slot block, blob, attestation and canonical data the slots table shows.
 */
export function useEntityProposalsPage(entity: string, from: number | undefined): UseEntityProposalsPageReturn {
  const { currentNetwork } = useNetwork();
  const { slot: currentSlot } = useBeaconClock();
  const queryClient = useQueryClient();
  const genesisTime = currentNetwork?.genesis_time ?? 0;

  // The latest page is pinned per half-day so it does not refetch every slot
  const latestAnchor = useMemo(() => Math.floor(currentSlot / 3600) * 3600 + 3600, [currentSlot]);
  const topSlot = from ?? latestAnchor;

  const proposals = useQuery({
    ...fctBlockProposerEntityServiceListOptions({
      query: {
        entity_eq: entity,
        slot_start_date_time_lte: slotToTimestamp(topSlot, genesisTime),
        order_by: 'slot_start_date_time desc',
        page_size: PROPOSALS_PER_PAGE,
      },
    }),
    enabled: !!currentNetwork && currentSlot > 0,
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => proposals.data?.fct_block_proposer_entity ?? [], [proposals.data]);

  const times = rows.map(row => row.slot_start_date_time).filter((t): t is number => t !== undefined);
  const range =
    times.length > 0 ? { gte: Math.min(...times), lte: Math.max(...times), inValues: times.join(',') } : undefined;
  const supplementalQuery = {
    slot_start_date_time_gte: range?.gte,
    slot_start_date_time_lte: range?.lte,
    slot_start_date_time_in_values: range?.inValues,
    page_size: 1000,
  };
  const supplementalOptions = { enabled: !!range, placeholderData: keepPreviousData };

  const [blockHead, blobCount, attestation, canonical] = useQueries({
    queries: [
      { ...fctBlockHeadServiceListOptions({ query: supplementalQuery }), ...supplementalOptions },
      { ...fctBlockBlobCountHeadServiceListOptions({ query: supplementalQuery }), ...supplementalOptions },
      { ...fctAttestationCorrectnessHeadServiceListOptions({ query: supplementalQuery }), ...supplementalOptions },
      { ...intBlockCanonicalServiceListOptions({ query: supplementalQuery }), ...supplementalOptions },
    ],
  });

  const slots = useMemo<SlotData[]>(() => {
    const heads = new Map(
      ((blockHead.data as { fct_block_head?: FctBlockHead[] })?.fct_block_head ?? []).map(b => [b.slot, b])
    );
    const blobs = new Map(
      (
        (blobCount.data as { fct_block_blob_count_head?: FctBlockBlobCountHead[] })?.fct_block_blob_count_head ?? []
      ).map(b => [b.slot, b.blob_count ?? 0])
    );
    const votes = new Map(
      (
        (attestation.data as { fct_attestation_correctness_head?: FctAttestationCorrectnessHead[] })
          ?.fct_attestation_correctness_head ?? []
      ).map(a => [a.slot, a])
    );
    const canonicalSlots = new Set(
      ((canonical.data as { int_block_canonical?: IntBlockCanonical[] })?.int_block_canonical ?? []).map(b => b.slot)
    );

    return rows.map((block: FctBlockProposerEntity) => {
      const slot = block.slot ?? 0;
      const head = heads.get(slot);
      const vote = votes.get(slot);
      return {
        slot,
        slotStartDateTime: block.slot_start_date_time ?? 0,
        blockRoot: head?.block_root ?? null,
        proposerIndex: head?.proposer_index ?? null,
        proposerEntity: entity,
        blobCount: blobs.get(slot) ?? 0,
        status: canonicalSlots.has(slot) ? 'canonical' : 'proposed',
        attestationHead: vote?.votes_head ?? 0,
        attestationOther: vote?.votes_other ?? 0,
        attestationMax: vote?.votes_max ?? 0,
        blockFirstSeenTime: null,
      };
    });
  }, [rows, blockHead.data, blobCount.data, attestation.data, canonical.data, entity]);

  const pageTop = slots[0]?.slot ?? topSlot;
  const pageBottom = slots[slots.length - 1]?.slot ?? topSlot;
  const page: RangePage = {
    top: pageTop,
    bottom: pageBottom,
    isLatest: from === undefined,
    // Newer pages are found by querying upward from the top row (see resolveNewer)
    newerTop: from === undefined ? undefined : pageTop + 1,
    olderTop: rows.length === PROPOSALS_PER_PAGE ? pageBottom - 1 : undefined,
  };

  const resolveNewer = useCallback(async (): Promise<number | undefined> => {
    const result = await queryClient.fetchQuery({
      queryKey: ['entity-proposals-newer', currentNetwork?.name, entity, pageTop],
      queryFn: () =>
        fctBlockProposerEntityServiceList({
          query: {
            entity_eq: entity,
            slot_start_date_time_gt: slotToTimestamp(pageTop, genesisTime),
            order_by: 'slot_start_date_time asc',
            page_size: PROPOSALS_PER_PAGE,
          },
          throwOnError: true,
        }),
    });
    const newer = result.data?.fct_block_proposer_entity ?? [];
    // Fewer than a full page above this one means the newer page is the latest page
    if (newer.length < PROPOSALS_PER_PAGE) return undefined;
    return newer[newer.length - 1]?.slot;
  }, [queryClient, currentNetwork?.name, entity, pageTop, genesisTime]);

  const supplemental = [blockHead, blobCount, attestation, canonical];
  return {
    slots,
    page,
    isLoading: proposals.isLoading || supplemental.some(q => q.isLoading),
    isPlaceholderData: proposals.isPlaceholderData || supplemental.some(q => q.isPlaceholderData),
    error: (proposals.error ?? supplemental.find(q => q.error)?.error ?? null) as Error | null,
    resolveNewer,
  };
}
