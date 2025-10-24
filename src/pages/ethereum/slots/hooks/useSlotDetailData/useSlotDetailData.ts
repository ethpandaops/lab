import { useQueries } from '@tanstack/react-query';
import {
  fctBlockHeadServiceListOptions,
  fctBlockProposerServiceListOptions,
  fctBlockMevServiceListOptions,
  fctBlockBlobCountServiceListOptions,
  fctBlockFirstSeenByNodeServiceListOptions,
  fctBlockBlobFirstSeenByNodeServiceListOptions,
  fctAttestationFirstSeenChunked50MsServiceListOptions,
  fctAttestationCorrectnessHeadServiceListOptions,
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
  FctBlockHead,
  FctBlockProposer,
  FctBlockMev,
  FctBlockBlobCount,
  FctBlockFirstSeenByNode,
  FctBlockBlobFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  FctAttestationCorrectnessHead,
  FctMevBidHighestValueByBuilderChunked50Ms,
  FctMevBidCountByRelay,
  FctMevBidCountByBuilder,
  IntBeaconCommitteeHead,
  FctPreparedBlock,
  FctBlockProposerEntity,
} from '@/api/types.gen';

export interface SlotDetailData {
  blockHead: FctBlockHead[];
  blockProposer: FctBlockProposer[];
  blockMev: FctBlockMev[];
  blobCount: FctBlockBlobCount[];
  blockPropagation: FctBlockFirstSeenByNode[];
  blobPropagation: FctBlockBlobFirstSeenByNode[];
  attestations: FctAttestationFirstSeenChunked50Ms[];
  attestationCorrectness: FctAttestationCorrectnessHead[];
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
  relayBids: FctMevBidCountByRelay[];
  builderBids: FctMevBidCountByBuilder[];
  committees: IntBeaconCommitteeHead[];
  preparedBlocks: FctPreparedBlock[];
  proposerEntity: FctBlockProposerEntity[];
}

export interface UseSlotDetailDataResult {
  data: SlotDetailData | null;
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
      // Block head data
      {
        ...fctBlockHeadServiceListOptions({
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
      // Blob propagation data
      {
        ...fctBlockBlobFirstSeenByNodeServiceListOptions({
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
      isLoading,
      error,
    };
  }

  // Combine all data
  const data: SlotDetailData = {
    blockHead: queries[0].data?.fct_block_head ?? [],
    blockProposer: queries[1].data?.fct_block_proposer ?? [],
    blockMev: queries[2].data?.fct_block_mev ?? [],
    blobCount: queries[3].data?.fct_block_blob_count ?? [],
    blockPropagation: queries[4].data?.fct_block_first_seen_by_node ?? [],
    blobPropagation: queries[5].data?.fct_block_blob_first_seen_by_node ?? [],
    attestations: queries[6].data?.fct_attestation_first_seen_chunked_50ms ?? [],
    attestationCorrectness: queries[7].data?.fct_attestation_correctness_head ?? [],
    mevBidding: queries[8].data?.fct_mev_bid_highest_value_by_builder_chunked_50ms ?? [],
    committees: queries[9].data?.int_beacon_committee_head ?? [],
    preparedBlocks: queries[10].data?.fct_prepared_block ?? [],
    relayBids: queries[11].data?.fct_mev_bid_count_by_relay ?? [],
    builderBids: queries[12].data?.fct_mev_bid_count_by_builder ?? [],
    proposerEntity: queries[13].data?.fct_block_proposer_entity ?? [],
  };

  return {
    data,
    isLoading: false,
    error: null,
  };
}
