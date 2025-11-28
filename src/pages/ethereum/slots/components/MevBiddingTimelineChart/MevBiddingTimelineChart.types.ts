/**
 * MEV bidding timeline chart type definitions
 */

/**
 * Raw MEV bid data from API
 */
export interface MevBidData {
  chunk_slot_start_diff: number; // Time offset in ms from slot start (0-12000ms)
  value: string; // Bid value in wei (as string to avoid precision loss)
  builder_pubkey: string; // Builder's public key
  relay_names?: string[]; // Relays this bid was available through
  block_hash?: string; // Execution block hash
  earliest_bid_date_time?: number; // Timestamp of earliest bid
}

/**
 * Props for MevBiddingTimelineChart component
 */
export interface MevBiddingTimelineChartProps {
  /**
   * Array of MEV bid data points
   */
  biddingData: MevBidData[];

  /**
   * Winning MEV value in wei (from fct_block_mev)
   */
  winningMevValue?: string;

  /**
   * Winning builder pubkey
   */
  winningBuilder?: string;
}

/**
 * Processed builder data for chart series
 */
export interface BuilderSeries {
  builderPubkey: string;
  displayName: string;
  color: string;
  data: Array<{ time: number; value: number }>; // time in ms, value in ETH
  isWinner: boolean;
}
