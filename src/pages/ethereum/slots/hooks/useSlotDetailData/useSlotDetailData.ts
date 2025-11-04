import { useQueries } from '@tanstack/react-query';
import {
  fctBlockHeadServiceListOptions,
  fctBlockProposerServiceListOptions,
  fctBlockMevServiceListOptions,
  fctBlockBlobCountServiceListOptions,
  fctBlockFirstSeenByNodeServiceListOptions,
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
import { slotToTimestamp, getForkForSlot } from '@/utils/beacon';
import type {
  FctBlockHead,
  FctBlockProposer,
  FctBlockMev,
  FctBlockBlobCount,
  FctBlockFirstSeenByNode,
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
  blockProposer: FctBlockProposer[];
  blockMev: FctBlockMev[];
  blobCount: FctBlockBlobCount[];
  blockPropagation: FctBlockFirstSeenByNode[];
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

  // Determine if this is a Fulu+ slot (needs data column data instead of blob data)
  const forkVersion = getForkForSlot(slot, currentNetwork);
  const isFuluOrLater = forkVersion === 'fulu';

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
      // Blob propagation data (pre-Fulu)
      {
        ...fctBlockBlobFirstSeenByNodeServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0 && !isFuluOrLater,
      },
      // Data column propagation data (Fulu+)
      {
        ...fctBlockDataColumnSidecarFirstSeenByNodeServiceListOptions({
          query: {
            slot_start_date_time_eq: slotTimestamp,
            page_size: 10000,
          },
        }),
        enabled: !!currentNetwork && slotTimestamp > 0 && isFuluOrLater,
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
    queries[16].data?.fct_attestation_liveness_by_entity_head ?? [];

  // Filter to only missed attestations and sort by count
  const missedAttestations: MissedAttestationEntity[] = attestationLivenessData
    .filter(record => record.status?.toLowerCase() === 'missed')
    .sort((a, b) => (b.attestation_count ?? 0) - (a.attestation_count ?? 0))
    .slice(0, 10)
    .map(record => ({
      entity: record.entity ?? 'unknown',
      count: record.attestation_count ?? 0,
    }));

  // Combine all data
  const data: SlotDetailData = {
    blockHead: queries[0].data?.fct_block_head ?? [],
    blockProposer: queries[1].data?.fct_block_proposer ?? [],
    blockMev: queries[2].data?.fct_block_mev ?? [],
    blobCount: queries[3].data?.fct_block_blob_count ?? [],
    blockPropagation: queries[4].data?.fct_block_first_seen_by_node ?? [],
    blobPropagation: queries[5].data?.fct_block_blob_first_seen_by_node ?? [],
    dataColumnPropagation: queries[6].data?.fct_block_data_column_sidecar_first_seen_by_node ?? [],
    attestations: queries[7].data?.fct_attestation_first_seen_chunked_50ms ?? [],
    attestationCorrectness: queries[8].data?.fct_attestation_correctness_head ?? [],
    attestationAttested: queries[9].data?.int_attestation_attested_head ?? [],
    attestationLiveness: attestationLivenessData,
    missedAttestations,
    mevBidding: queries[10].data?.fct_mev_bid_highest_value_by_builder_chunked_50ms ?? [],
    committees: queries[11].data?.int_beacon_committee_head ?? [],
    preparedBlocks: queries[12].data?.fct_prepared_block ?? [],
    relayBids: queries[13].data?.fct_mev_bid_count_by_relay ?? [],
    builderBids: queries[14].data?.fct_mev_bid_count_by_builder ?? [],
    proposerEntity: queries[15].data?.fct_block_proposer_entity ?? [],
    votedForBlocks: queries[17].data?.fct_block_head ?? [],
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
