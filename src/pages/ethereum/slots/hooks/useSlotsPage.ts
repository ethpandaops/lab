import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { SLOTS_PER_EPOCH, slotToTimestamp, timestampToSlot } from '@/utils/beacon';
import { useTableBounds } from '@/hooks/useBounds';
import { getRangePage, type RangePage } from '@/components/Lists/RangePager';
import {
  fctBlockHeadServiceList,
  fctBlockProposerServiceList,
  fctBlockBlobCountServiceList,
  fctBlockProposerEntityServiceList,
  fctBlockPayloadPtcVoteHeadServiceList,
} from '@/api/sdk.gen';
import type {
  FctBlockProposer,
  FctBlockBlobCount,
  FctBlockHead,
  FctBlockProposerEntity,
  FctBlockPayloadPtcVoteHead,
} from '@/api/types.gen';
import type { SlotData } from './useSlotsData.types';

/** Slots per page */
export const SLOTS_PER_PAGE = 50;

/**
 * Fetch and join every per-slot source for an inclusive slot range, newest first. Slots with no
 * rows (missed, or not yet indexed) are still returned so the page has no gaps.
 */
async function fetchSlotRange(startSlot: number, endSlot: number, genesisTime: number): Promise<SlotData[]> {
  const startTimestamp = slotToTimestamp(startSlot, genesisTime);
  const endTimestamp = slotToTimestamp(endSlot, genesisTime);
  const pageSize = endSlot - startSlot + 1;

  // Fetch all data sources in parallel
  const [blockHeadResult, proposerResult, blobCountResult, proposerEntityResult, ptcVoteResult] = await Promise.all([
    fctBlockHeadServiceList({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: pageSize,
        order_by: 'slot desc',
      },
    }),
    fctBlockProposerServiceList({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: pageSize,
        order_by: 'slot desc',
      },
    }),
    fctBlockBlobCountServiceList({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: pageSize,
        order_by: 'slot desc',
      },
    }),
    fctBlockProposerEntityServiceList({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: pageSize,
        order_by: 'slot desc',
      },
    }),
    // Gloas (ePBS): PTC verdict per slot. Empty pre-gloas, so it costs
    // nothing on networks without the fork.
    fctBlockPayloadPtcVoteHeadServiceList({
      query: {
        slot_start_date_time_gte: startTimestamp,
        slot_start_date_time_lte: endTimestamp,
        page_size: pageSize,
        order_by: 'slot desc',
      },
    }).catch(() => undefined),
  ]);

  // Combine data from all queries
  const slots: SlotData[] = [];
  for (let slot = endSlot; slot >= startSlot; slot--) {
    const epoch = Math.floor(slot / SLOTS_PER_EPOCH);

    // Find data for this slot from each query
    const proposerData = proposerResult.data?.fct_block_proposer?.find((p: FctBlockProposer) => p.slot === slot);
    const blobData = blobCountResult.data?.fct_block_blob_count?.find((b: FctBlockBlobCount) => b.slot === slot);
    const blockData = blockHeadResult.data?.fct_block_head?.find((b: FctBlockHead) => b.slot === slot);
    const entityData = proposerEntityResult.data?.fct_block_proposer_entity?.find(
      (e: FctBlockProposerEntity) => e.slot === slot
    );
    const ptcData = ptcVoteResult?.data?.fct_block_payload_ptc_vote_head?.find(
      (v: FctBlockPayloadPtcVoteHead) => v.slot === slot
    );

    // Determine if slot has data
    const hasData = Boolean(proposerData || blockData);

    // Calculate timestamp for this slot
    const timestamp = slotToTimestamp(slot, genesisTime);

    slots.push({
      slot,
      epoch,
      proposerIndex: proposerData?.proposer_validator_index ?? null,
      blobCount: blobData?.blob_count ?? null,
      status: proposerData?.status ?? null,
      hasData,
      blockRoot: proposerData?.block_root ?? blockData?.block_root ?? null,
      timestamp,
      proposerEntity: entityData?.entity ?? null,
      ptcPresentVotes: ptcData?.payload_present_votes ?? null,
      ptcVotesSeen: ptcData?.ptc_validators_seen ?? null,
    });
  }

  return slots;
}

/** Return type for useSlotsPage */
export interface UseSlotsPageReturn {
  /** Slots on the page, newest first */
  slots: SlotData[];
  /** The page range, for the pager */
  page: RangePage;
  isLoading: boolean;
  /** True while a different page is loading and the previous one is still shown */
  isPlaceholderData: boolean;
  error: Error | null;
}

/**
 * One page of the slot list. `from` is the page's top slot; undefined follows the chain head and
 * moves forward every slot. Pages are bounded by the earliest indexed proposer data.
 */
export function useSlotsPage(from: number | undefined): UseSlotsPageReturn {
  const { slot: currentSlot } = useBeaconClock();
  const { currentNetwork } = useNetwork();
  const { data: proposerBounds } = useTableBounds('fct_block_proposer');
  const genesisTime = currentNetwork?.genesis_time;

  const earliest =
    proposerBounds && genesisTime ? Math.max(0, timestampToSlot(proposerBounds.min, genesisTime) + 1) : 0;
  const page = getRangePage(from, currentSlot, earliest, SLOTS_PER_PAGE);

  const query = useQuery({
    queryKey: ['slots-page', currentNetwork?.name, page.bottom, page.top],
    queryFn: () => fetchSlotRange(page.bottom, page.top, genesisTime!),
    enabled: currentSlot > 0 && Boolean(genesisTime),
    placeholderData: keepPreviousData,
    staleTime: page.isLatest ? 0 : 60_000,
  });

  return {
    slots: query.data ?? [],
    page,
    isLoading: query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    error: query.error,
  };
}
