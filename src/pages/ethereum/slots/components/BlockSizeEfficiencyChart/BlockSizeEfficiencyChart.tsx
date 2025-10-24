import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import type { BlockSizeEfficiencyChartProps, BlockMetrics } from './BlockSizeEfficiencyChart.types';

/**
 * BlockSizeEfficiencyChart - Displays execution payload metrics as a stats card
 *
 * Shows key efficiency metrics including transaction count, gas utilization,
 * total bytes, and bytes per transaction. Provides insight into block efficiency
 * and resource usage.
 *
 * @example
 * ```tsx
 * <BlockSizeEfficiencyChart
 *   blockHead={blockHeadData}
 * />
 * ```
 */
export function BlockSizeEfficiencyChart({ blockHead }: BlockSizeEfficiencyChartProps): JSX.Element {
  // Calculate metrics from block head data
  const metrics = useMemo((): BlockMetrics | null => {
    if (!blockHead) return null;

    const transactionCount = blockHead.execution_payload_transactions_count ?? 0;
    const gasUsed = blockHead.execution_payload_gas_used ?? 0;
    const gasLimit = blockHead.execution_payload_gas_limit ?? 0;
    const totalBytes = blockHead.execution_payload_transactions_total_bytes ?? 0;

    // Calculate gas utilization percentage
    const gasUtilization = gasLimit > 0 ? (gasUsed / gasLimit) * 100 : 0;

    // Calculate bytes per transaction (avoid division by zero)
    const bytesPerTransaction = transactionCount > 0 ? totalBytes / transactionCount : 0;

    return {
      transactionCount,
      gasUsed,
      gasLimit,
      gasUtilization,
      totalBytes,
      bytesPerTransaction,
    };
  }, [blockHead]);

  // Format large numbers with commas
  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  // Format bytes as KB or MB
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes.toFixed(2)} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  // Handle empty data
  if (!metrics) {
    return (
      <PopoutCard title="Block Size & Efficiency" modalSize="lg">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-80 items-center justify-center text-muted'
                : 'flex h-48 items-center justify-center text-muted'
            }
          >
            <p>No execution payload data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${formatNumber(metrics.transactionCount)} transactions`;

  return (
    <PopoutCard title="Block Size & Efficiency" subtitle={subtitle} modalSize="lg">
      {({ inModal }) => (
        <div className={inModal ? 'grid h-80 grid-cols-2 gap-6' : 'grid grid-cols-2 gap-6'}>
          {/* Transaction Count */}
          <div>
            <dt className="text-sm/6 font-medium text-muted">Transactions</dt>
            <dd className="mt-1 text-2xl/8 font-semibold text-foreground">{formatNumber(metrics.transactionCount)}</dd>
          </div>

          {/* Gas Utilization */}
          <div>
            <dt className="text-sm/6 font-medium text-muted">Gas Utilization</dt>
            <dd className="mt-1 text-2xl/8 font-semibold text-foreground">
              {formatPercentage(metrics.gasUtilization)}
            </dd>
            <dd className="mt-1 text-xs/5 text-muted">
              {formatNumber(metrics.gasUsed)} / {formatNumber(metrics.gasLimit)}
            </dd>
          </div>

          {/* Total Bytes */}
          <div>
            <dt className="text-sm/6 font-medium text-muted">Total Bytes</dt>
            <dd className="mt-1 text-2xl/8 font-semibold text-foreground">{formatBytes(metrics.totalBytes)}</dd>
            <dd className="mt-1 text-xs/5 text-muted">{formatNumber(metrics.totalBytes)} bytes</dd>
          </div>

          {/* Bytes per Transaction (Efficiency) */}
          <div>
            <dt className="text-sm/6 font-medium text-muted">Avg Bytes/Tx</dt>
            <dd className="mt-1 text-2xl/8 font-semibold text-foreground">
              {formatBytes(metrics.bytesPerTransaction)}
            </dd>
            <dd className="mt-1 text-xs/5 text-muted">Efficiency metric</dd>
          </div>
        </div>
      )}
    </PopoutCard>
  );
}
