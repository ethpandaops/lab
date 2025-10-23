import type { FctPreparedBlock } from '@/api/types.gen';

/**
 * Proposed block data for comparison
 */
export interface ProposedBlockData {
  /**
   * Gas used in the execution payload
   */
  execution_payload_gas_used?: number | null;
  /**
   * Base fee per gas in wei (as string)
   */
  execution_payload_base_fee_per_gas?: string | null;
  /**
   * Value of the execution payload in wei (as string)
   */
  execution_payload_value?: string | null;
  /**
   * Value of the consensus payload in wei (as string)
   */
  consensus_payload_value?: string | null;
  /**
   * MEV value in wei (as string) if available
   */
  mev_value?: string | null;
}

/**
 * Props for the PreparedBlocksComparisonChart component
 */
export interface PreparedBlocksComparisonChartProps {
  /**
   * Array of prepared blocks built by the infrastructure
   */
  preparedBlocks: FctPreparedBlock[];
  /**
   * The actually proposed block for comparison (optional)
   */
  proposedBlock?: ProposedBlockData | null;
  /**
   * The timestamp (in milliseconds) when the winning bid occurred (optional)
   * Used to filter prepared blocks that were built before the winning bid
   */
  winningBidTimestamp?: number | null;
}

/**
 * Processed block data with calculated rewards
 */
export interface ProcessedBlock {
  /**
   * Client name (execution client parsed from meta_client_name)
   */
  clientName: string;
  /**
   * Client version
   */
  clientVersion: string;
  /**
   * Total transaction count
   */
  transactionCount: number;
  /**
   * Total reward in ETH
   */
  rewardEth: number;
  /**
   * Raw reward value in wei (as string for precision)
   */
  rewardWei: string;
  /**
   * Whether this is the actual proposed block
   */
  isProposed: boolean;
  /**
   * Original block data
   */
  originalBlock: FctPreparedBlock | ProposedBlockData;
}

/**
 * Chart statistics for the card header
 */
export interface ChartStats {
  /**
   * Total number of prepared blocks
   */
  preparedBlockCount: number;
  /**
   * Name of the best performing execution client
   */
  bestClientName: string | null;
  /**
   * Reward of the best prepared block in ETH
   */
  bestPreparedRewardEth: number;
  /**
   * Reward of the actually proposed block in ETH
   */
  proposedRewardEth: number;
  /**
   * Difference between best prepared and proposed (missed opportunity)
   */
  deltaEth: number;
  /**
   * Percentage difference
   */
  deltaPercent: number;
}
