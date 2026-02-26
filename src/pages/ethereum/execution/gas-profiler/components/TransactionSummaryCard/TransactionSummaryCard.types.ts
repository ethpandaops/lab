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
  /** Receipt size in bytes (from int_transaction_receipt_size) */
  receiptBytes?: number | null;
  /** Whether to show the receipt column (only when receipt data exists for the block) */
  showReceiptColumn?: boolean;
}
