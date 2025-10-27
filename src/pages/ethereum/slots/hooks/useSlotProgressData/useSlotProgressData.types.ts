import type {
  FctBlockHead,
  FctBlockProposer,
  FctBlockMev,
  FctBlockFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  IntBeaconCommitteeHead,
  FctMevBidHighestValueByBuilderChunked50Ms,
  FctMevBidCountByRelay,
} from '@/api/types.gen';
import type { PhaseData } from '@/components/Ethereum/SlotProgressTimeline/SlotProgressTimeline.types';

/**
 * Raw API data needed to compute slot progress phases (static mode - from arrays)
 */
export interface SlotProgressRawData {
  /** Block head data (from array - single item or empty) */
  blockHead?: FctBlockHead;
  /** Block proposer data (from array - single item or empty) */
  blockProposer?: FctBlockProposer;
  /** MEV relay data (from array - single item or empty, if available) */
  blockMev?: FctBlockMev;
  /** Block propagation data (up to 10k nodes) */
  blockPropagation: FctBlockFirstSeenByNode[];
  /** Attestation arrival data (chunked in 50ms intervals) */
  attestations: FctAttestationFirstSeenChunked50Ms[];
  /** Committee data for expected validator count */
  committees: IntBeaconCommitteeHead[];
  /** MEV bidding timeline data (chunked in 50ms intervals) */
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
  /** MEV relay bid count data */
  relayBids: FctMevBidCountByRelay[];
}

/**
 * Return type for useSlotProgressData hook (static mode)
 */
export interface UseSlotProgressDataReturn {
  /** Phase data for SlotProgressTimeline component (all completed) */
  phases: PhaseData[];
  /** Whether the slot has been missed (no block seen) */
  isMissed: boolean;
  /** Whether the block was orphaned (<66% attestations) */
  isOrphaned: boolean;
  /** Whether the block achieved acceptance (≥66% attestations) */
  isAccepted: boolean;
  /** Loading state */
  isLoading: boolean;
}
