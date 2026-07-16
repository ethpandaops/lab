import type { FctBlockPayloadBid, FctBlockPayloadFirstSeenByNode, FctBlockPayloadPtcVoteHead } from '@/api/types.gen';

/**
 * The lifecycle outcome of a gloas (ePBS) slot's execution payload.
 *
 * - `payload_present`: the PTC saw the payload in time (majority present votes)
 * - `payload_late`: sentries saw the payload but the PTC majority voted absent
 * - `payload_withheld`: the block exists but no payload was ever observed
 * - `pending`: not enough data yet to judge (live slots, ingestion lag)
 */
export type PayloadStatus = 'payload_present' | 'payload_late' | 'payload_withheld' | 'pending';

export interface PayloadStatusInput {
  /** Whether a beacon block exists for the slot */
  hasBlock: boolean;
  /** Payload envelope sightings across sentry nodes */
  payloadFirstSeen: FctBlockPayloadFirstSeenByNode[];
  /** PTC votes observed on the live event stream */
  ptcVote?: FctBlockPayloadPtcVoteHead;
}

export interface PayloadStatusResult {
  status: PayloadStatus;
  /** Earliest time any sentry saw the payload, ms from slot start */
  firstSeenMs?: number;
  /** Number of sentries that saw the payload */
  seenByNodes: number;
  /** PTC validators voting payload present */
  presentVotes: number;
  /** PTC validators observed voting */
  ptcVotesSeen: number;
}

/**
 * Derive the payload outcome for a gloas slot from observed facts. The PTC
 * verdict is authoritative when we have votes; sentry sightings break the tie
 * between late and withheld.
 */
export function derivePayloadStatus({ hasBlock, payloadFirstSeen, ptcVote }: PayloadStatusInput): PayloadStatusResult {
  const seenByNodes = payloadFirstSeen.length;
  const firstSeenMs =
    seenByNodes > 0
      ? Math.min(...payloadFirstSeen.map(node => node.seen_slot_start_diff ?? Number.POSITIVE_INFINITY))
      : undefined;
  const presentVotes = ptcVote?.payload_present_votes ?? 0;
  const ptcVotesSeen = ptcVote?.ptc_validators_seen ?? 0;

  let status: PayloadStatus = 'pending';

  if (hasBlock && ptcVotesSeen > 0) {
    const majorityPresent = presentVotes * 2 >= ptcVotesSeen;

    if (majorityPresent) {
      status = 'payload_present';
    } else if (seenByNodes > 0) {
      status = 'payload_late';
    } else {
      status = 'payload_withheld';
    }
  } else if (hasBlock && seenByNodes > 0) {
    status = 'payload_present';
  }

  return { status, firstSeenMs, seenByNodes, presentVotes, ptcVotesSeen };
}

/**
 * True when the winning bid was produced by the proposer itself (self-build).
 */
export function isSelfBuiltPayload(bid: FctBlockPayloadBid | undefined, proposerIndex: number | undefined): boolean {
  return bid?.builder_index !== undefined && proposerIndex !== undefined && bid.builder_index === proposerIndex;
}

/**
 * Format a wei string as ETH for display, trimming to a sensible precision.
 */
export function formatWeiAsEth(wei: string | undefined): string | undefined {
  if (!wei) {
    return undefined;
  }

  const asNumber = Number(wei) / 1e18;
  if (!Number.isFinite(asNumber)) {
    return undefined;
  }

  return asNumber >= 1 ? asNumber.toFixed(4) : asNumber.toPrecision(3);
}
