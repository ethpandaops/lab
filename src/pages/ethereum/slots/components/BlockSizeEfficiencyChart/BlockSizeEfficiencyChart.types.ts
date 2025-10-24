import type { FctBlockHead } from '@/api/types.gen';

/**
 * Props for the BlockSizeEfficiencyChart component
 */
export interface BlockSizeEfficiencyChartProps {
  /**
   * Block head data containing execution payload metrics
   */
  blockHead: FctBlockHead | null | undefined;
}

/**
 * Processed metrics for display
 */
export interface BlockMetrics {
  /**
   * Total number of transactions in the block
   */
  transactionCount: number;
  /**
   * Gas used in the execution payload
   */
  gasUsed: number;
  /**
   * Gas limit for the execution payload
   */
  gasLimit: number;
  /**
   * Gas utilization percentage (0-100)
   */
  gasUtilization: number;
  /**
   * Total bytes in the execution payload
   */
  totalBytes: number;
  /**
   * Average bytes per transaction (efficiency metric)
   */
  bytesPerTransaction: number;
}
