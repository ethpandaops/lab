import type { FctAttestationFirstSeenChunked50Ms, FctBlockHead } from '@/api/types.gen';

/**
 * Props for AttestationArrivalsChart component
 */
export interface AttestationArrivalsChartProps {
  /** Card title, defaults to the committee attestation wording */
  title?: string;
  /** Anchor id for the popout card, must be unique per page */
  anchorId?: string;
  /**
   * Array of attestation data points from fct_attestation_first_seen_chunked_50ms
   * Must include block_root and slot information
   */
  attestationData: FctAttestationFirstSeenChunked50Ms[];
  /**
   * The current slot number being viewed
   */
  currentSlot: number;
  /**
   * Block data for all blocks that were voted for (for slot lookup)
   */
  votedForBlocks: FctBlockHead[];
  /**
   * Total expected validators (from committee data) - used to show participation rate
   * @optional
   */
  totalExpectedValidators?: number;
}
