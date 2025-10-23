import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import {
  fctBlockHeadServiceListOptions,
  fctBlockProposerServiceListOptions,
  fctBlockMevServiceListOptions,
  fctBlockBlobCountServiceListOptions,
  fctBlockFirstSeenByNodeServiceListOptions,
  fctBlockBlobFirstSeenByNodeServiceListOptions,
  fctAttestationFirstSeenChunked50MsServiceListOptions,
  intBeaconCommitteeHeadServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { slotToTimestamp } from '../../utils';
import { useBlockDetailsData } from '../useBlockDetailsData';
import { useMapData } from '../useMapData';
import { useSidebarData } from '../useSidebarData';
import { useBlobAvailabilityData } from '../useBlobAvailabilityData';
import { useAttestationData } from '../useAttestationData';
import type { SlotViewData } from './useSlotViewData.types';

// Stable empty arrays to prevent infinite re-renders
const EMPTY_BLOCK_FIRST_SEEN: never[] = [];
const EMPTY_BLOB_FIRST_SEEN: never[] = [];
const EMPTY_ATTESTATION: never[] = [];
const EMPTY_DATA_COLUMN: never[] = [];

export function useSlotViewData(currentSlot: number): SlotViewData {
  const { currentNetwork } = useNetwork();

  // Convert slot to timestamp for API calls
  const slotStartDateTime = useMemo(() => {
    if (!currentNetwork || currentSlot === 0) return 0;
    const timestamp = slotToTimestamp(currentSlot, currentNetwork.genesis_time);
    console.log('[useSlotViewData] timestamp calculation:', {
      currentSlot,
      genesisTime: currentNetwork.genesis_time,
      calculatedTimestamp: timestamp,
    });
    return timestamp;
  }, [currentSlot, currentNetwork]);

  // API Query 1: Block Head
  const blockHeadQuery = useQuery({
    ...fctBlockHeadServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 1,
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      // Don't retry on 404 - it means no data for this slot
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
  });

  // API Query 2: Block Proposer
  const blockProposerQuery = useQuery({
    ...fctBlockProposerServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 1,
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
      return failureCount < 3;
    },
  });

  // API Query 3: Block MEV
  const blockMevQuery = useQuery({
    ...fctBlockMevServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 1,
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
      return failureCount < 3;
    },
  });

  // API Query 4: Blob Count
  const blobCountQuery = useQuery({
    ...fctBlockBlobCountServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 1,
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
      return failureCount < 3;
    },
  });

  // API Query 5: Block First Seen by Node (List)
  const blockFirstSeenQuery = useQuery({
    ...fctBlockFirstSeenByNodeServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 10000,
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
      return failureCount < 3;
    },
  });

  // API Query 6: Blob First Seen by Node (List)
  const blobFirstSeenQuery = useQuery({
    ...fctBlockBlobFirstSeenByNodeServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 10000,
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
      return failureCount < 3;
    },
  });

  // API Query 7: Attestation Chunked 50ms (List)
  const attestationQuery = useQuery({
    ...fctAttestationFirstSeenChunked50MsServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 10000,
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
      return failureCount < 3;
    },
  });

  // API Query 8: Beacon Committee (List) - for total expected validators
  const committeeQuery = useQuery({
    ...intBeaconCommitteeHeadServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 10000, // Ensure we get all committees for the slot
      },
    }),
    enabled: slotStartDateTime > 0,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
      return failureCount < 3;
    },
  });


  // Aggregate loading state (critical queries only)
  // If slotStartDateTime is 0, queries are disabled but we should still show loading
  const isLoading =
    slotStartDateTime === 0 ||
    blockHeadQuery.isLoading ||
    blockProposerQuery.isLoading ||
    blobCountQuery.isLoading ||
    blockFirstSeenQuery.isLoading ||
    attestationQuery.isLoading;

  // Aggregate errors
  const errors = useMemo(() => {
    const errorList: Array<{ endpoint: string; error: Error }> = [];
    if (blockHeadQuery.error) errorList.push({ endpoint: 'fct_block_head', error: blockHeadQuery.error as Error });
    if (blockProposerQuery.error)
      errorList.push({ endpoint: 'fct_block_proposer', error: blockProposerQuery.error as Error });
    if (blockMevQuery.error) errorList.push({ endpoint: 'fct_block_mev', error: blockMevQuery.error as Error });
    if (blobCountQuery.error)
      errorList.push({ endpoint: 'fct_block_blob_count', error: blobCountQuery.error as Error });
    if (blockFirstSeenQuery.error)
      errorList.push({ endpoint: 'fct_block_first_seen_by_node', error: blockFirstSeenQuery.error as Error });
    if (blobFirstSeenQuery.error)
      errorList.push({ endpoint: 'fct_block_blob_first_seen_by_node', error: blobFirstSeenQuery.error as Error });
    if (attestationQuery.error)
      errorList.push({ endpoint: 'fct_attestation_first_seen_chunked_50ms', error: attestationQuery.error as Error });
    return errorList;
  }, [
    blockHeadQuery.error,
    blockProposerQuery.error,
    blockMevQuery.error,
    blobCountQuery.error,
    blockFirstSeenQuery.error,
    blobFirstSeenQuery.error,
    attestationQuery.error,
  ]);

  // Transform data using component-specific hooks
  const blockDetails = useBlockDetailsData(
    blockHeadQuery.data?.fct_block_head?.[0],
    blockProposerQuery.data?.fct_block_proposer?.[0],
    blockMevQuery.data?.fct_block_mev?.[0]
  );

  const mapPoints = useMapData(blockFirstSeenQuery.data?.fct_block_first_seen_by_node ?? EMPTY_BLOCK_FIRST_SEEN);

  const { phases: sidebarPhases, items: sidebarItems } = useSidebarData({
    blockNodes: blockFirstSeenQuery.data?.fct_block_first_seen_by_node ?? EMPTY_BLOCK_FIRST_SEEN,
    blobNodes: blobFirstSeenQuery.data?.fct_block_blob_first_seen_by_node ?? EMPTY_BLOB_FIRST_SEEN,
    attestationChunks: attestationQuery.data?.fct_attestation_first_seen_chunked_50ms ?? EMPTY_ATTESTATION,
    proposer: blockProposerQuery.data?.fct_block_proposer?.[0],
    currentSlot,
  });

  const {
    firstSeenData: blobFirstSeenData,
    availabilityRateData: blobAvailabilityRateData,
    continentalPropagationData: blobContinentalPropagationData,
  } = useBlobAvailabilityData(blobFirstSeenQuery.data?.fct_block_blob_first_seen_by_node ?? EMPTY_BLOB_FIRST_SEEN);

  // Calculate total expected validators from committee data
  const totalExpectedValidators = useMemo(() => {
    const committees = committeeQuery.data?.int_beacon_committee_head ?? [];
    return committees.reduce((sum, committee) => {
      return sum + (committee.validators?.length ?? 0);
    }, 0);
  }, [committeeQuery.data]);

  const {
    data: attestationData,
    totalExpected: attestationTotalExpected,
    maxCount: attestationMaxCount,
  } = useAttestationData(
    attestationQuery.data?.fct_attestation_first_seen_chunked_50ms ?? EMPTY_ATTESTATION,
    totalExpectedValidators
  );

  const blobCount = blobCountQuery.data?.fct_block_blob_count?.[0]?.blob_count ?? 0;

  // TODO: Fix attestation actual count
  // The chunked API returns 2x the correct count (double-counting issue)
  // Other APIs either return no data or 400 errors
  // For now, just return 0 to avoid showing incorrect data
  const attestationActualCount = 0;

  return useMemo(
    () => ({
      blockDetails,
      mapPoints,
      sidebarPhases,
      sidebarItems,
      blobCount,
      blobFirstSeenData,
      blobAvailabilityRateData,
      blobContinentalPropagationData,
      dataColumnBlobCount: 0, // Placeholder - no API data yet
      dataColumnFirstSeenData: EMPTY_DATA_COLUMN, // Placeholder - no API data yet
      attestationData,
      attestationTotalExpected,
      attestationActualCount,
      attestationMaxCount,
      isLoading,
      errors,
    }),
    [
      blockDetails,
      mapPoints,
      sidebarPhases,
      sidebarItems,
      blobCount,
      blobFirstSeenData,
      blobAvailabilityRateData,
      blobContinentalPropagationData,
      attestationData,
      attestationTotalExpected,
      attestationActualCount,
      attestationMaxCount,
      isLoading,
      errors,
    ]
  );
}
