import type { TransactionSummary } from '../../hooks/useBlockTransactions';

/**
 * Props for TransactionSummaryCard component
 */
export interface TransactionSummaryCardProps {
  /** Transaction summary data */
  transaction: TransactionSummary;
  /** Block number for navigation */
  blockNumber: number;
  /** Gas usage as percentage of block total */
  gasPercentage: number;
}
