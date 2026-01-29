import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import type { TransactionSummary } from '../../hooks/useBlockTransactions';
import { TransactionRow } from '../TransactionRow';

export interface TransactionListProps {
  /** List of transactions to display */
  transactions: TransactionSummary[];
  /** Currently expanded transaction hash */
  expandedTxHash: string | null;
  /** Callback when a transaction is clicked to expand/collapse */
  onTransactionClick: (txHash: string) => void;
  /** Block number for linking to transaction detail */
  blockNumber: number;
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * List of transactions in a block with expandable call trees
 */
export function TransactionList({
  transactions,
  expandedTxHash,
  onTransactionClick,
  blockNumber,
}: TransactionListProps): JSX.Element {
  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted">No transactions in this block</p>
      </Card>
    );
  }

  // Calculate total gas for percentage calculations
  const totalBlockGas = transactions.reduce((sum, tx) => sum + tx.totalGasUsed, 0);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-surface/50 px-4 py-3 text-xs font-medium text-muted">
        <div className="w-8">#</div>
        <div>Transaction</div>
        <div className="w-20 text-right">Gas</div>
        <div className="w-16 text-right">%</div>
        <div className="w-20 text-right">Calls</div>
      </div>

      {/* Transaction rows */}
      <div className="divide-y divide-border">
        {transactions.map(tx => (
          <TransactionRow
            key={tx.transactionHash}
            transaction={tx}
            blockNumber={blockNumber}
            gasPercentage={(tx.totalGasUsed / totalBlockGas) * 100}
            isExpanded={expandedTxHash === tx.transactionHash}
            onClick={() => onTransactionClick(tx.transactionHash)}
            formatGas={formatGas}
          />
        ))}
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between border-t border-border bg-surface/50 px-4 py-3 text-sm">
        <span className="text-muted">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </span>
        <span className="font-medium text-foreground">{formatGas(totalBlockGas)} gas total</span>
      </div>
    </Card>
  );
}
