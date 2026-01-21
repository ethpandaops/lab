import { type JSX, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { TransactionSummary } from '../../hooks/useBlockTransactions';
import { useTransactionGasData } from '../../hooks/useTransactionGasData';
import { CallTreeSection } from '../CallTreeSection';
import { GasBreakdownCard } from '../GasBreakdownCard';
import { OpcodeDistribution } from '../OpcodeDistribution';
import type { CallTreeNode } from '../../IndexPage.types';

export interface TransactionRowProps {
  /** Transaction summary data */
  transaction: TransactionSummary;
  /** Block number for API queries */
  blockNumber: number;
  /** Gas usage as percentage of block total */
  gasPercentage: number;
  /** Whether this row is expanded */
  isExpanded: boolean;
  /** Callback when row is clicked */
  onClick: () => void;
  /** Gas formatting function */
  formatGas: (value: number) => string;
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string | null): string {
  if (!address) return '—';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * Get call type badge color
 */
function getCallTypeColor(callType: string): string {
  switch (callType) {
    case 'CREATE':
    case 'CREATE2':
      return 'bg-success/10 text-success';
    case 'DELEGATECALL':
      return 'bg-warning/10 text-warning';
    case 'STATICCALL':
      return 'bg-primary/10 text-primary';
    default:
      return 'bg-muted/10 text-muted';
  }
}

/**
 * Expandable transaction row with inline call tree
 */
export function TransactionRow({
  transaction,
  blockNumber,
  gasPercentage,
  isExpanded,
  onClick,
  formatGas,
}: TransactionRowProps): JSX.Element {
  const navigate = useNavigate();

  // Fetch full transaction data when expanded
  const { data: txData, isLoading: txLoading } = useTransactionGasData({
    transactionHash: isExpanded ? transaction.transactionHash : null,
    blockNumber: isExpanded ? blockNumber : null,
  });

  // Navigate to call page when a frame is clicked
  const handleFrameSelect = useCallback(
    (node: CallTreeNode) => {
      const callId = node.metadata?.callFrameId;
      if (callId !== undefined) {
        navigate({
          to: '/ethereum/execution/gas-profiler/tx/$txHash/call/$callId',
          params: { txHash: transaction.transactionHash, callId: String(callId) },
          search: { block: blockNumber },
        });
      }
    },
    [navigate, transaction.transactionHash, blockNumber]
  );

  return (
    <div className={clsx('transition-colors', isExpanded && 'bg-surface/30')}>
      {/* Main row - clickable */}
      <button
        onClick={onClick}
        className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface/50"
      >
        {/* Transaction index */}
        <div className="flex w-8 items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="size-4 text-primary" />
          ) : (
            <ChevronRightIcon className="size-4 text-muted" />
          )}
          <span className="text-xs text-muted">{transaction.transactionIndex}</span>
        </div>

        {/* Transaction hash and target */}
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="truncate font-mono text-sm text-foreground">
            {transaction.transactionHash.slice(0, 18)}...
          </span>
          <span
            className={clsx('shrink-0 rounded-xs px-1.5 py-0.5 text-xs', getCallTypeColor(transaction.rootCallType))}
          >
            {transaction.rootCallType}
          </span>
          {(transaction.targetName || transaction.targetAddress) && (
            <span
              className={clsx('truncate text-xs', transaction.targetName ? 'text-foreground' : 'font-mono text-muted')}
              title={transaction.targetAddress ?? undefined}
            >
              → {transaction.targetName ?? truncateAddress(transaction.targetAddress)}
            </span>
          )}
          {transaction.hasErrors && (
            <ExclamationTriangleIcon className="size-4 shrink-0 text-danger" title="Has errors" />
          )}
        </div>

        {/* Gas used */}
        <div className="w-20 text-right font-mono text-sm text-foreground">{formatGas(transaction.totalGasUsed)}</div>

        {/* Gas percentage bar */}
        <div className="flex w-16 items-center justify-end gap-2">
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary" style={{ width: `${Math.min(gasPercentage, 100)}%` }} />
          </div>
          <span className="w-10 text-right text-xs text-muted">{gasPercentage.toFixed(1)}%</span>
        </div>

        {/* Frame count and depth */}
        <div className="w-20 text-right">
          <span className="text-sm text-foreground">{transaction.frameCount}</span>
          <span className="ml-1 text-xs text-muted">(d:{transaction.maxDepth})</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-surface/20 px-4 py-4">
          {txLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-muted">Loading transaction details...</span>
            </div>
          )}

          {!txLoading && !txData && (
            <div className="py-8 text-center text-sm text-muted">Failed to load transaction details</div>
          )}

          {txData && (
            <div className="space-y-4">
              {/* Gas breakdown */}
              <GasBreakdownCard metadata={txData.metadata} />

              {/* Call tree */}
              <CallTreeSection callTree={txData.callTree} onFrameSelect={handleFrameSelect} />

              {/* Opcode distribution (transaction-level) */}
              {txData.opcodeStats.length > 0 && <OpcodeDistribution opcodeStats={txData.opcodeStats} />}

              {/* External links */}
              <div className="flex gap-2 pt-2">
                <a
                  href={`https://etherscan.io/tx/${transaction.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xs bg-surface px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  Etherscan ↗
                </a>
                <a
                  href={`https://dashboard.tenderly.co/tx/mainnet/${transaction.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xs bg-surface px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  Tenderly ↗
                </a>
                <a
                  href={`https://phalcon.blocksec.com/explorer/tx/eth/${transaction.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xs bg-surface px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  Phalcon ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
