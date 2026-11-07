import type { FctAttestationVoteByBlockRoot, FctBlockHead } from '@/api/types.gen';

export interface AttestationVotesBreakdownTableProps {
  /**
   * Head vote count per block root voted for in this slot
   */
  votes: FctAttestationVoteByBlockRoot[];

  /**
   * Current slot number (to identify if vote is for current slot or other)
   */
  currentSlot: number;

  /**
   * Block head data for voted-for blocks
   */
  votedForBlocks: FctBlockHead[];

  /**
   * Expected number of validators for this slot
   */
  expectedValidatorCount: number;

  /**
   * Whether the attestation data is still loading
   */
  isLoading?: boolean;

  /**
   * Shown when there are no votes, in place of the default empty state
   */
  emptyMessage?: string;
}

export interface VoteGroup {
  /** Block root being voted for */
  blockRoot: string;
  /** Number of votes for this block */
  voteCount: number;
  /** Slot number this block belongs to */
  slot: number | undefined;
  /** Whether this is the current slot's block */
  isCurrentSlot: boolean;
  /** Block data for this vote (if available) */
  blockData?: FctBlockHead;
}
