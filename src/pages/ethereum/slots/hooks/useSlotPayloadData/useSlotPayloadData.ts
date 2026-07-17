import { useQueries } from '@tanstack/react-query';
import {
  fctBlockPayloadBidServiceListOptions,
  fctBlockPayloadFirstSeenByNodeServiceListOptions,
  fctBlockPayloadPtcVoteHeadServiceListOptions,
  fctBlockPayloadAvailableByNodeServiceListOptions,
  fctPayloadBidHighestValueByBuilderChunked50MsServiceListOptions,
  fctBlockPayloadServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctBlockPayloadBid,
  FctBlockPayloadFirstSeenByNode,
  FctBlockPayloadPtcVoteHead,
  FctBlockPayloadAvailableByNode,
  FctPayloadBidHighestValueByBuilderChunked50Ms,
  FctBlockPayload,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';

export interface SlotPayloadData {
  /** Winning bid committed in the canonical block (available after finalization pipeline) */
  bid?: FctBlockPayloadBid;
  /** Payload envelope sightings per sentry node */
  payloadFirstSeen: FctBlockPayloadFirstSeenByNode[];
  /** Payload + blobs verified locally per sentry node */
  payloadAvailable: FctBlockPayloadAvailableByNode[];
  /** PTC votes observed on the live event stream */
  ptcVote?: FctBlockPayloadPtcVoteHead;
  /** The bid race: highest value per builder per 50ms chunk, from gossip */
  bidRace: FctPayloadBidHighestValueByBuilderChunked50Ms[];
  /** Canonical per-block payload facts: bid commitment + envelope contents */
  payload?: FctBlockPayload;
}

export interface UseSlotPayloadDataResult {
  data: SlotPayloadData;
  isLoading: boolean;
}

/**
 * Fetch the gloas (ePBS) payload lifecycle data for a slot: the winning bid,
 * envelope propagation across sentries, local availability, and PTC votes.
 * Callers should gate usage on the slot's fork being gloas or later.
 */
export function useSlotPayloadData(slot: number, enabled = true): UseSlotPayloadDataResult {
  const { currentNetwork } = useNetwork();

  const slotTimestamp = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const queryEnabled = enabled && !!currentNetwork && slotTimestamp > 0;

  const queries = useQueries({
    queries: [
      {
        ...fctBlockPayloadBidServiceListOptions({
          query: { slot_start_date_time_eq: slotTimestamp },
        }),
        enabled: queryEnabled,
      },
      {
        ...fctBlockPayloadFirstSeenByNodeServiceListOptions({
          query: { slot_start_date_time_eq: slotTimestamp, page_size: 10000 },
        }),
        enabled: queryEnabled,
      },
      {
        ...fctBlockPayloadAvailableByNodeServiceListOptions({
          query: { slot_start_date_time_eq: slotTimestamp, page_size: 10000 },
        }),
        enabled: queryEnabled,
      },
      {
        ...fctBlockPayloadPtcVoteHeadServiceListOptions({
          query: { slot_start_date_time_eq: slotTimestamp },
        }),
        enabled: queryEnabled,
      },
      {
        ...fctPayloadBidHighestValueByBuilderChunked50MsServiceListOptions({
          query: { slot_start_date_time_eq: slotTimestamp, page_size: 10000 },
        }),
        enabled: queryEnabled,
      },
      {
        ...fctBlockPayloadServiceListOptions({
          query: { slot_start_date_time_eq: slotTimestamp },
        }),
        enabled: queryEnabled,
      },
    ],
  });

  const [bidQuery, firstSeenQuery, availableQuery, ptcVoteQuery, bidRaceQuery, payloadQuery] = queries;

  return {
    data: {
      bid: bidQuery.data?.fct_block_payload_bid?.[0],
      payloadFirstSeen: firstSeenQuery.data?.fct_block_payload_first_seen_by_node ?? [],
      payloadAvailable: availableQuery.data?.fct_block_payload_available_by_node ?? [],
      ptcVote: ptcVoteQuery.data?.fct_block_payload_ptc_vote_head?.[0],
      bidRace: bidRaceQuery.data?.fct_payload_bid_highest_value_by_builder_chunked_50ms ?? [],
      payload: payloadQuery.data?.fct_block_payload?.[0],
    },
    isLoading: queryEnabled && queries.some(query => query.isLoading),
  };
}
