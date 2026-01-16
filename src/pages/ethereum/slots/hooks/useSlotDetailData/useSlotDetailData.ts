import { useQueries } from '@tanstack/react-query';
import {
  fctBlockHeadServiceListOptions,
  fctBlockServiceListOptions,
  fctBlockProposerServiceListOptions,
  fctBlockMevServiceListOptions,
  fctBlockBlobCountServiceListOptions,
  fctBlockFirstSeenByNodeServiceListOptions,
  fctHeadFirstSeenByNodeServiceListOptions,
  fctBlockBlobFirstSeenByNodeServiceListOptions,
  fctBlockDataColumnSidecarFirstSeenByNodeServiceListOptions,
  fctAttestationFirstSeenChunked50MsServiceListOptions,
  fctAttestationCorrectnessHeadServiceListOptions,
  fctAttestationLivenessByEntityHeadServiceListOptions,
  intAttestationAttestedHeadServiceListOptions,
  fctMevBidHighestValueByBuilderChunked50MsServiceListOptions,
  fctMevBidCountByRelayServiceListOptions,
  fctMevBidCountByBuilderServiceListOptions,
  intBeaconCommitteeHeadServiceListOptions,
  fctPreparedBlockServiceListOptions,
  fctBlockProposerEntityServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import type {
  FctBlock,
  FctBlockHead,
  FctBlockProposer,
  FctBlockMev,
  FctBlockBlobCount,
  FctBlockFirstSeenByNode,
  FctHeadFirstSeenByNode,
  FctBlockBlobFirstSeenByNode,
  FctBlockDataColumnSidecarFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  FctAttestationCorrectnessHead,
  FctAttestationLivenessByEntityHead,
  IntAttestationAttestedHead,
  FctMevBidHighestValueByBuilderChunked50Ms,
  FctMevBidCountByRelay,
  FctMevBidCountByBuilder,
  IntBeaconCommitteeHead,
  FctPreparedBlock,
  FctBlockProposerEntity,
} from '@/api/types.gen';

export interface MissedAttestationEntity {
  entity: string;
  count: number;
}

export interface SlotDetailData {
  blockHead: FctBlockHead[];
  /** All blocks for the slot (including orphaned/reorged blocks) */
  block: FctBlock[];
  /** Whether this slot data is for an orphaned (reorged) block */
  isOrphaned: boolean;
  blockProposer: FctBlockProposer[];
  blockMev: FctBlockMev[];
  blobCount: FctBlockBlobCount[];
  blockPropagation: FctBlockFirstSeenByNode[];
  /** Head (chain import complete) propagation data - when nodes updated their head */
  headPropagation: FctHeadFirstSeenByNode[];
  blobPropagation: FctBlockBlobFirstSeenByNode[];
  dataColumnPropagation: FctBlockDataColumnSidecarFirstSeenByNode[];
  attestations: FctAttestationFirstSeenChunked50Ms[];
  attestationCorrectness: FctAttestationCorrectnessHead[];
  attestationLiveness: FctAttestationLivenessByEntityHead[];
  attestationAttested: IntAttestationAttestedHead[];
  missedAttestations: MissedAttestationEntity[];
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
  relayBids: FctMevBidCountByRelay[];
  builderBids: FctMevBidCountByBuilder[];
  committees: IntBeaconCommitteeHead[];
  preparedBlocks: FctPreparedBlock[];
  proposerEntity: FctBlockProposerEntity[];
  votedForBlocks: FctBlockHead[];
}

/**
 * Raw API data for SlotProgressTimeline integration.
 * Extracted from arrays for easier consumption.
 */
export interface SlotDetailRawApiData {
  blockHead?: FctBlockHead;
  blockProposer?: FctBlockProposer;
  blockMev?: FctBlockMev;
  blockPropagation: FctBlockFirstSeenByNode[];
  attestations: FctAttestationFirstSeenChunked50Ms[];
  committees: IntBeaconCommitteeHead[];
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
  relayBids: FctMevBidCountByRelay[];
}

export interface UseSlotDetailDataResult {
  data: SlotDetailData | null;
  rawApiData: SlotDetailRawApiData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch all data for a slot detail page.
 * Fetches data from multiple endpoints in parallel for a given slot.
 *
 * @param slot - The slot number to fetch data for
 * @returns Object containing all slot data, loading state, and error state
 */
export function useSlotDetailData(slot: number): UseSlotDetailDataResult {
  const { currentNetwork } = useNetwork();

  // Convert slot to timestamp for querying
  const slotTimestamp = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;

  const queries = useQueries({
    queries: [
      // Block head data (canonical blocks only)
      {
        ...fctBlockHeadServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // All block data (including orphaned/reorged blocks)
      {
        ...fctBlockServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Block proposer data
      {
        ...fctBlockProposerServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // MEV data
      {
        ...fctBlockMevServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Blob count data
      {
        ...fctBlockBlobCountServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Block propagation data
      {
        ...fctBlockFirstSeenByNodeServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Head propagation data (when chain head updated after import)
      {
        ...fctHeadFirstSeenByNodeServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Blob propagation data (pre-Fulu, but always fetch to handle edge cases)
      {
        ...fctBlockBlobFirstSeenByNodeServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Data column propagation data (Fulu+, but always fetch to handle edge cases)
      {
        ...fctBlockDataColumnSidecarFirstSeenByNodeServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Attestation data
      {
        ...fctAttestationFirstSeenChunked50MsServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Attestation correctness data
      {
        ...fctAttestationCorrectnessHeadServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Attestation attested data (detailed vote breakdown)
      {
        ...intAttestationAttestedHeadServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // MEV bidding timeline data
      {
        ...fctMevBidHighestValueByBuilderChunked50MsServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Committee data
      {
        ...intBeaconCommitteeHeadServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Prepared blocks data
      {
        ...fctPreparedBlockServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // MEV relay bid count data
      {
        ...fctMevBidCountByRelayServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // MEV builder bid count data
      {
        ...fctMevBidCountByBuilderServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Proposer entity data
      {
        ...fctBlockProposerEntityServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Attestation liveness by entity data
      {
        ...fctAttestationLivenessByEntityHeadServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0,
      },
      // Block head data for voted-for blocks (slot-65 to slot range)
      {
        ...fctBlockHeadServiceListOptions({
          query: {
            slot_gte: slot - 65,
            slot_lte: slot,
            page_size: 100,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
    ],
  });

  // Check if any query is loading
  const isLoading = queries.some(query => query.isLoading);

  // Get first error if any
  const error = (queries.find(query => query.error)?.error as Error) || null;

  // If still loading or has error, return early
  if (isLoading || error) {
    return {
      data: null,
      rawApiData: null,
      isLoading,
      error,
    };
  }

  // Process attestation liveness data to get top 10 missed attestations
  const attestationLivenessData: FctAttestationLivenessByEntityHead[] =
    queries[18].data?.fct_attestation_liveness_by_entity_head ?? [];

  // Sort by missed_count and get top 10
  const missedAttestations: MissedAttestationEntity[] = attestationLivenessData
    .filter(record => (record.missed_count ?? 0) > 0)
    .sort((a, b) => (b.missed_count ?? 0) - (a.missed_count ?? 0))
    .slice(0, 10)
    .map(record => ({
      entity: record.entity ?? 'unknown',
      count: record.missed_count ?? 0,
    }));

  // Get block data from both sources
  const blockHeadData = queries[0].data?.fct_block_head ?? [];
  const allBlockData = queries[1].data?.fct_block ?? [];

  // Determine if this is an orphaned block:
  // - No canonical block head exists, but we have block data from the all-blocks table
  // - Or we have block data with status "orphaned"
  const isOrphaned =
    blockHeadData.length === 0 && allBlockData.length > 0 && allBlockData.some(b => b.status === 'orphaned');

  // Combine all data
  // Query indices (0-indexed):
  // 0: fct_block_head (canonical)
  // 1: fct_block (all blocks including orphaned)
  // 2: fct_block_proposer
  // 3: fct_block_mev
  // 4: fct_block_blob_count
  // 5: fct_block_first_seen_by_node
  // 6: fct_head_first_seen_by_node (head updated after import)
  // 7: fct_block_blob_first_seen_by_node (pre-Fulu)
  // 8: fct_block_data_column_sidecar_first_seen_by_node (Fulu+)
  // 9: fct_attestation_first_seen_chunked_50ms
  // 10: fct_attestation_correctness_head
  // 11: int_attestation_attested_head
  // 12: fct_mev_bid_highest_value_by_builder_chunked_50ms
  // 13: int_beacon_committee_head
  // 14: fct_prepared_block
  // 15: fct_mev_bid_count_by_relay
  // 16: fct_mev_bid_count_by_builder
  // 17: fct_block_proposer_entity
  // 18: fct_attestation_liveness_by_entity_head
  // 19: fct_block_head (voted-for blocks)
  const data: SlotDetailData = {
    blockHead: blockHeadData,
    block: allBlockData,
    isOrphaned,
    blockProposer: queries[2].data?.fct_block_proposer ?? [],
    blockMev: queries[3].data?.fct_block_mev ?? [],
    blobCount: queries[4].data?.fct_block_blob_count ?? [],
    blockPropagation: queries[5].data?.fct_block_first_seen_by_node ?? [],
    headPropagation: queries[6].data?.fct_head_first_seen_by_node ?? [],
    blobPropagation: queries[7].data?.fct_block_blob_first_seen_by_node ?? [],
    dataColumnPropagation: queries[8].data?.fct_block_data_column_sidecar_first_seen_by_node ?? [],
    attestations: queries[9].data?.fct_attestation_first_seen_chunked_50ms ?? [],
    attestationCorrectness: queries[10].data?.fct_attestation_correctness_head ?? [],
    attestationAttested: queries[11].data?.int_attestation_attested_head ?? [],
    attestationLiveness: attestationLivenessData,
    missedAttestations,
    mevBidding: queries[12].data?.fct_mev_bid_highest_value_by_builder_chunked_50ms ?? [],
    committees: queries[13].data?.int_beacon_committee_head ?? [],
    preparedBlocks: queries[14].data?.fct_prepared_block ?? [],
    relayBids: queries[15].data?.fct_mev_bid_count_by_relay ?? [],
    builderBids: queries[16].data?.fct_mev_bid_count_by_builder ?? [],
    proposerEntity: queries[17].data?.fct_block_proposer_entity ?? [],
    votedForBlocks: queries[19].data?.fct_block_head ?? [],
  };

  // Extract raw API data for SlotProgressTimeline (arrays -> first element)
  const rawApiData: SlotDetailRawApiData = {
    blockHead: data.blockHead[0],
    blockProposer: data.blockProposer[0],
    blockMev: data.blockMev[0],
    blockPropagation: data.blockPropagation,
    attestations: data.attestations,
    committees: data.committees,
    mevBidding: data.mevBidding,
    relayBids: data.relayBids,
  };

  return {
    data,
    rawApiData,
    isLoading: false,
    error: null,
  };
}
