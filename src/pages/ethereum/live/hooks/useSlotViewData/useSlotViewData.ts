import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import {
  fctBlockHeadServiceListOptions,
  fctBlockProposerServiceListOptions,
  fctBlockProposerEntityServiceListOptions,
  fctBlockMevHeadServiceListOptions,
  fctBlockBlobCountHeadServiceListOptions,
  fctBlockFirstSeenByNodeServiceListOptions,
  fctBlockBlobFirstSeenByNodeServiceListOptions,
  fctBlockDataColumnSidecarFirstSeenServiceListOptions,
  fctAttestationFirstSeenChunked50MsServiceListOptions,
  intBeaconCommitteeHeadServiceListOptions,
  fctMevBidHighestValueByBuilderChunked50MsServiceListOptions,
  fctMevBidCountByRelayServiceListOptions,
  fctEngineNewPayloadByElClientServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { EIP7870_REFERENCE_TAG } from '@/constants';
import { slotToTimestamp } from '../../utils';
import { useBlockDetailsData } from '../useBlockDetailsData';
import { useMapData } from '../useMapData';
import { useSidebarData } from '../useSidebarData';
import { useBlobAvailabilityData } from '../useBlobAvailabilityData';
import { useDataColumnAvailabilityData } from '../useDataColumnAvailabilityData';
import { useAttestationData } from '../useAttestationData';
import type { SlotViewData } from './useSlotViewData.types';

// Stable empty arrays to prevent infinite re-renders
const EMPTY_BLOCK_FIRST_SEEN: never[] = [];
const EMPTY_BLOB_FIRST_SEEN: never[] = [];
const EMPTY_DATA_COLUMN_FIRST_SEEN: never[] = [];
const EMPTY_ATTESTATION: never[] = [];

// Shared options for the per-slot queries. A given slot's data is essentially
// settled once seen, so cache it and skip the window-focus refetch storm that
// otherwise churns these arrays and flickers the live visualizations.
const SLOT_QUERY_OPTIONS = {
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  retry: (failureCount: number, error: unknown): boolean => {
    // 404 means no data for this slot — don't retry.
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) return false;
    return failureCount < 3;
  },
};

export function useSlotViewData(currentSlot: number): SlotViewData {
  const { currentNetwork } = useNetwork();

  // Convert slot to timestamp for API calls
  const slotStartDateTime = useMemo(() => {
    if (!currentNetwork || currentSlot === 0) return 0;
    return slotToTimestamp(currentSlot, currentNetwork.genesis_time);
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
    ...SLOT_QUERY_OPTIONS,
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
    ...SLOT_QUERY_OPTIONS,
  });

  // API Query 2b: Proposer Entity (named staker, when known)
  const proposerEntityQuery = useQuery({
    ...fctBlockProposerEntityServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 1,
      },
    }),
    enabled: slotStartDateTime > 0,
    ...SLOT_QUERY_OPTIONS,
  });

  // API Query 3: Block MEV (head table — the canonical fct_block_mev lags and is
  // empty for live slots, so use the head variant or every block reads self-built)
  const blockMevQuery = useQuery({
    ...fctBlockMevHeadServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 1,
      },
    }),
    enabled: slotStartDateTime > 0,
    ...SLOT_QUERY_OPTIONS,
  });

  // API Query 4: Blob Count (using _head table for live data)
  const blobCountQuery = useQuery({
    ...fctBlockBlobCountHeadServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 1,
      },
    }),
    enabled: slotStartDateTime > 0,
    ...SLOT_QUERY_OPTIONS,
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
    ...SLOT_QUERY_OPTIONS,
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
    ...SLOT_QUERY_OPTIONS,
  });

  // API Query 6b: Data Column Sidecar First Seen (aggregated per column, not per node)
  const dataColumnFirstSeenQuery = useQuery({
    ...fctBlockDataColumnSidecarFirstSeenServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 10000,
      },
    }),
    enabled: slotStartDateTime > 0,
    ...SLOT_QUERY_OPTIONS,
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
    ...SLOT_QUERY_OPTIONS,
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
    ...SLOT_QUERY_OPTIONS,
  });

  // API Query 9: MEV Bidding Timeline (chunked 50ms)
  const mevBiddingQuery = useQuery({
    ...fctMevBidHighestValueByBuilderChunked50MsServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        page_size: 10000,
      },
    }),
    enabled: slotStartDateTime > 0,
    ...SLOT_QUERY_OPTIONS,
  });

  // API Query 10: MEV Bid Count by Relay
  const relayBidsQuery = useQuery({
    ...fctMevBidCountByRelayServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
      },
    }),
    enabled: slotStartDateTime > 0,
    ...SLOT_QUERY_OPTIONS,
  });

  // API Query 11: Engine newPayload validation timing per EL client
  const engineByClientQuery = useQuery({
    ...fctEngineNewPayloadByElClientServiceListOptions({
      query: {
        slot_start_date_time_eq: slotStartDateTime,
        node_class_contains: EIP7870_REFERENCE_TAG,
        page_size: 50,
      },
    }),
    enabled: slotStartDateTime > 0,
    ...SLOT_QUERY_OPTIONS,
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
    if (blockMevQuery.error) errorList.push({ endpoint: 'fct_block_mev_head', error: blockMevQuery.error as Error });
    if (blobCountQuery.error)
      errorList.push({ endpoint: 'fct_block_blob_count', error: blobCountQuery.error as Error });
    if (blockFirstSeenQuery.error)
      errorList.push({ endpoint: 'fct_block_first_seen_by_node', error: blockFirstSeenQuery.error as Error });
    if (blobFirstSeenQuery.error)
      errorList.push({ endpoint: 'fct_block_blob_first_seen_by_node', error: blobFirstSeenQuery.error as Error });
    if (dataColumnFirstSeenQuery.error)
      errorList.push({
        endpoint: 'fct_block_data_column_sidecar_first_seen',
        error: dataColumnFirstSeenQuery.error as Error,
      });
    if (attestationQuery.error)
      errorList.push({ endpoint: 'fct_attestation_first_seen_chunked_50ms', error: attestationQuery.error as Error });
    if (mevBiddingQuery.error)
      errorList.push({
        endpoint: 'fct_mev_bid_highest_value_by_builder_chunked_50ms',
        error: mevBiddingQuery.error as Error,
      });
    if (relayBidsQuery.error)
      errorList.push({ endpoint: 'fct_mev_bid_count_by_relay', error: relayBidsQuery.error as Error });
    return errorList;
  }, [
    blockHeadQuery.error,
    blockProposerQuery.error,
    blockMevQuery.error,
    blobCountQuery.error,
    blockFirstSeenQuery.error,
    blobFirstSeenQuery.error,
    dataColumnFirstSeenQuery.error,
    attestationQuery.error,
    mevBiddingQuery.error,
    relayBidsQuery.error,
  ]);

  // Transform data using component-specific hooks
  const blockDetails = useBlockDetailsData(
    blockHeadQuery.data?.fct_block_head?.[0],
    blockProposerQuery.data?.fct_block_proposer?.[0],
    blockMevQuery.data?.fct_block_mev_head?.[0]
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

  const { firstSeenData: dataColumnFirstSeenData, blobCount: dataColumnBlobCount } = useDataColumnAvailabilityData(
    dataColumnFirstSeenQuery.data?.fct_block_data_column_sidecar_first_seen ?? EMPTY_DATA_COLUMN_FIRST_SEEN
  );

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

  const blobCount = blobCountQuery.data?.fct_block_blob_count_head?.[0]?.blob_count ?? 0;

  // TODO: Fix attestation actual count
  // The chunked API returns 2x the correct count (double-counting issue)
  // Other APIs either return no data or 400 errors
  // For now, just return 0 to avoid showing incorrect data
  const attestationActualCount = 0;

  // EL client block-validation race, restricted to the EIP-7870 reference nodes
  // (identical high-spec hardware) so client timings are a fair comparison.
  // One row per client, sorted fastest first.
  const clientValidation = useMemo(() => {
    const rows = engineByClientQuery.data?.fct_engine_new_payload_by_el_client ?? [];
    const byClient = new Map<string, { client: string; medianMs: number; observations: number }>();

    for (const row of rows) {
      if (row.status && row.status !== 'VALID') continue;
      const client = row.meta_execution_implementation;
      const median = row.median_duration_ms;
      if (!client || median === undefined) continue;

      const observations = row.observation_count ?? 0;
      const existing = byClient.get(client);
      // Keep the row backed by the most observations (most representative).
      if (!existing || observations > existing.observations) {
        byClient.set(client, { client, medianMs: median, observations });
      }
    }

    return Array.from(byClient.values()).sort((a, b) => a.medianMs - b.medianMs);
  }, [engineByClientQuery.data]);

  // Block propagation across the sentry network (arrival ms percentiles).
  const { propagationMinMs, propagationP50Ms, propagationP90Ms, propagationMaxMs, propagationNodeCount } =
    useMemo(() => {
      const diffs = (blockFirstSeenQuery.data?.fct_block_first_seen_by_node ?? EMPTY_BLOCK_FIRST_SEEN)
        .map(node => node.seen_slot_start_diff)
        .filter((d): d is number => typeof d === 'number')
        .sort((a, b) => a - b);

      if (diffs.length === 0) {
        return {
          propagationMinMs: null,
          propagationP50Ms: null,
          propagationP90Ms: null,
          propagationMaxMs: null,
          propagationNodeCount: 0,
        };
      }
      const at = (q: number): number => diffs[Math.min(diffs.length - 1, Math.floor(q * (diffs.length - 1)))];
      return {
        propagationMinMs: diffs[0],
        propagationP50Ms: at(0.5),
        propagationP90Ms: at(0.9),
        propagationMaxMs: diffs[diffs.length - 1],
        propagationNodeCount: diffs.length,
      };
    }, [blockFirstSeenQuery.data]);

  // Attestation arrival timing (reliable even though raw counts double-count):
  // when the first vote was seen and when the arrival rate peaked.
  const { attestationFirstMs, attestationPeakMs } = useMemo(() => {
    let first: number | null = null;
    let peakTime: number | null = null;
    let peakCount = -1;
    for (const point of attestationData) {
      if (point.count <= 0) continue;
      if (first === null || point.time < first) first = point.time;
      if (point.count > peakCount) {
        peakCount = point.count;
        peakTime = point.time;
      }
    }
    return { attestationFirstMs: first, attestationPeakMs: peakTime };
  }, [attestationData]);

  // MEV auction depth for the slot: how many builders/relays competed and the
  // total bid volume — populated even when the proposer self-built.
  const auction = useMemo(() => {
    const builderRows = mevBiddingQuery.data?.fct_mev_bid_highest_value_by_builder_chunked_50ms ?? [];
    const relayRows = relayBidsQuery.data?.fct_mev_bid_count_by_relay ?? [];

    const builders = new Set(builderRows.map(bid => bid.builder_pubkey).filter(Boolean)).size;
    let bids = 0;
    let topRelay: string | null = null;
    let topBids = -1;
    for (const relay of relayRows) {
      const count = relay.bid_total ?? 0;
      bids += count;
      if (count > topBids) {
        topBids = count;
        topRelay = relay.relay_name ?? null;
      }
    }

    // Highest bid offered into the auction (in wei), regardless of what the proposer used.
    let topBidWei: string | null = null;
    let topBidValue = -1n;
    for (const bid of builderRows) {
      if (!bid.value) continue;
      try {
        const value = BigInt(bid.value);
        if (value > topBidValue) {
          topBidValue = value;
          topBidWei = bid.value;
        }
      } catch {
        // ignore malformed bid values
      }
    }

    return {
      auctionBuilders: builders,
      auctionRelays: relayRows.length,
      auctionBids: bids,
      auctionTopRelay: topRelay,
      auctionTopBidWei: topBidWei,
    };
  }, [mevBiddingQuery.data, relayBidsQuery.data]);

  const proposerEntity = proposerEntityQuery.data?.fct_block_proposer_entity?.[0]?.entity ?? null;

  // Prepare raw API data for slot progress timeline
  const rawApiData = useMemo(
    () => ({
      blockHead: blockHeadQuery.data?.fct_block_head?.[0],
      blockProposer: blockProposerQuery.data?.fct_block_proposer?.[0],
      blockMev: blockMevQuery.data?.fct_block_mev_head?.[0],
      blockPropagation: blockFirstSeenQuery.data?.fct_block_first_seen_by_node ?? EMPTY_BLOCK_FIRST_SEEN,
      attestations: attestationQuery.data?.fct_attestation_first_seen_chunked_50ms ?? EMPTY_ATTESTATION,
      committees: committeeQuery.data?.int_beacon_committee_head ?? [],
      mevBidding: mevBiddingQuery.data?.fct_mev_bid_highest_value_by_builder_chunked_50ms ?? [],
      relayBids: relayBidsQuery.data?.fct_mev_bid_count_by_relay ?? [],
    }),
    [
      blockHeadQuery.data,
      blockProposerQuery.data,
      blockMevQuery.data,
      blockFirstSeenQuery.data,
      attestationQuery.data,
      committeeQuery.data,
      mevBiddingQuery.data,
      relayBidsQuery.data,
    ]
  );

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
      dataColumnBlobCount,
      dataColumnFirstSeenData,
      attestationData,
      attestationTotalExpected,
      attestationActualCount,
      attestationMaxCount,
      clientValidation,
      proposerEntity,
      propagationMinMs,
      propagationP50Ms,
      propagationP90Ms,
      propagationMaxMs,
      propagationNodeCount,
      attestationFirstMs,
      attestationPeakMs,
      ...auction,
      isLoading,
      errors,
      rawApiData,
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
      dataColumnBlobCount,
      dataColumnFirstSeenData,
      attestationData,
      attestationTotalExpected,
      attestationActualCount,
      attestationMaxCount,
      clientValidation,
      proposerEntity,
      propagationMinMs,
      propagationP50Ms,
      propagationP90Ms,
      propagationMaxMs,
      propagationNodeCount,
      attestationFirstMs,
      attestationPeakMs,
      auction,
      isLoading,
      errors,
      rawApiData,
    ]
  );
}
