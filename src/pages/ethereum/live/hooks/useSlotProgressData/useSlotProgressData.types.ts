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
 * Raw API data needed to compute slot progress phases
 */
export interface SlotProgressRawData {
  /** Block head data (canonical or orphaned) */
  blockHead?: FctBlockHead;
  /** Block proposer data */
  blockProposer?: FctBlockProposer;
  /** MEV relay data (if available) */
  blockMev?: FctBlockMev;
  /** Block propagation data (up to 10k nodes) */
  blockPropagation: FctBlockFirstSeenByNode[];
  /** Attestation arrival data (chunked in 50ms intervals) */
  attestations: FctAttestationFirstSeenChunked50Ms[];
  /** Committee data for expected validator count */
  committees: IntBeaconCommitteeHead[];
  /** MEV bidding timeline data (chunked in 50ms intervals) */
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
  /** MEV bid count by relay */
  relayBids: FctMevBidCountByRelay[];
}

/**
 * Return type for useSlotProgressData hook
 */
export interface UseSlotProgressDataReturn {
  /** Phase data for SlotProgressTimeline component */
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
