import type { FctMevBidCountByRelay } from '@/api/types.gen';

/**
 * Props for the RelayDistributionChart component
 */
export interface RelayDistributionChartProps {
  /**
   * Array of relay bid count data for the slot
   */
  relayData: FctMevBidCountByRelay[];
  /**
   * Optional: The name of the winning relay (if known)
   */
  winningRelay?: string | null;
}

/**
 * Processed relay data for chart display
 */
export interface RelayChartData {
  /**
   * Relay name
   */
  name: string;
  /**
   * Total number of bids from this relay
   */
  bidCount: number;
  /**
   * Whether this relay won the block
   */
  isWinner: boolean;
}
