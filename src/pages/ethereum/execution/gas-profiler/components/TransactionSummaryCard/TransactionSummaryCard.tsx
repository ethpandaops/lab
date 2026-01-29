import { type JSX, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { TransactionSummaryCardProps } from './TransactionSummaryCard.types';

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string | null): string {
  if (!address) return '—';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * Get call type badge styling
 */
function getCallTypeStyles(callType: string): { bg: string; text: string } {
  switch (callType) {
    case 'CREATE':
      return { bg: 'bg-orange-500/10', text: 'text-orange-500' };
    case 'CREATE2':
      return { bg: 'bg-amber-500/10', text: 'text-amber-500' };
    case 'DELEGATECALL':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400' };
    case 'STATICCALL':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400' };
    case 'CALL':
    default:
      return { bg: 'bg-blue-500/10', text: 'text-blue-400' };
  }
}

/**
 * TransactionSummaryCard - Table row for transaction display
 *
 * Used in block listings to show key transaction information at a glance.
 * Renders as a table row (<tr>).
 */
export function TransactionSummaryCard({
  transaction,
  blockNumber,
  gasPercentage,
}: TransactionSummaryCardProps): JSX.Element {
  const callTypeStyles = getCallTypeStyles(transaction.rootCallType);
  const navigate = useNavigate();

  // Detect simple transfers (totalGasUsed === intrinsicGas means no EVM execution)
  const isSimpleTransfer = transaction.intrinsicGas !== null && transaction.totalGasUsed === transaction.intrinsicGas;

  const handleClick = useCallback(() => {
    navigate({
      to: '/ethereum/execution/gas-profiler/tx/$txHash',
      params: { txHash: transaction.transactionHash },
      search: { block: blockNumber },
    });
  }, [navigate, transaction.transactionHash, blockNumber]);

  return (
    <tr onClick={handleClick} className="cursor-pointer transition-colors hover:bg-background">
      {/* Transaction index */}
      <td className="px-3 py-3 font-mono text-sm text-muted">{transaction.transactionIndex}</td>

      {/* Transaction hash, call type, and target */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-foreground" title={transaction.transactionHash}>
            {transaction.transactionHash.slice(0, 6)}...{transaction.transactionHash.slice(-4)}
          </span>
          {isSimpleTransfer ? (
            <span className="shrink-0 rounded-xs bg-cyan-500/10 px-1.5 py-0.5 text-xs font-medium text-cyan-400">
              Transfer
            </span>
          ) : (
            <span
              className={clsx(
                'shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-medium',
                callTypeStyles.bg,
                callTypeStyles.text
              )}
            >
              {transaction.rootCallType}
            </span>
          )}
          {(transaction.targetName || transaction.targetAddress) && (
            <span
              className={clsx('truncate text-xs', transaction.targetName ? 'text-foreground' : 'font-mono text-muted')}
              title={transaction.targetAddress ?? undefined}
            >
              → {transaction.targetName ?? truncateAddress(transaction.targetAddress)}
            </span>
          )}
          {transaction.hasErrors && (
            <ExclamationTriangleIcon className="size-4 shrink-0 text-danger" title="Transaction failed" />
          )}
        </div>
      </td>

      {/* Gas used */}
      <td className="px-3 py-3 text-right font-mono text-sm text-foreground">{formatGas(transaction.totalGasUsed)}</td>

      {/* Gas percentage with mini bar */}
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-border">
            <div
              className={clsx(
                'h-full rounded-full',
                gasPercentage > 30 ? 'bg-warning' : gasPercentage > 10 ? 'bg-primary' : 'bg-primary/60'
              )}
              style={{ width: `${Math.min(gasPercentage, 100)}%` }}
            />
          </div>
          <span className="w-12 text-right text-xs text-muted">{gasPercentage.toFixed(1)}%</span>
        </div>
      </td>

      {/* Calls (frame count) */}
      <td className="px-3 py-3 text-right text-sm text-foreground">{transaction.frameCount}</td>

      {/* Max depth */}
      <td className="px-3 py-3 text-right text-sm text-foreground">{transaction.maxDepth}</td>
    </tr>
  );
}
