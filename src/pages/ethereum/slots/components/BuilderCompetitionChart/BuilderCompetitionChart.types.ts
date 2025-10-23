import type { FctMevBidCountByBuilder } from '@/api/types.gen';

/**
 * Props for the BuilderCompetitionChart component
 */
export interface BuilderCompetitionChartProps {
  /**
   * Array of builder bid count data for the slot
   */
  builderData: FctMevBidCountByBuilder[];
  /**
   * Optional: The public key of the winning builder (if known)
   */
  winningBuilder?: string | null;
}

/**
 * Processed builder data for chart display
 */
export interface BuilderChartData {
  /**
   * Builder public key (truncated for display)
   */
  name: string;
  /**
   * Full builder public key
   */
  fullPubkey: string;
  /**
   * Total number of bids from this builder
   */
  bidCount: number;
  /**
   * Whether this builder won the block
   */
  isWinner: boolean;
}
