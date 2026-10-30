import { type JSX, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import type { CallFrameRowProps } from './CallFrameRow.types';

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Truncate address for display (0x12345678...12345678 format)
 */
function truncateAddress(address: string | null): string {
  if (!address) return '—';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

/**
 * Get call type badge styling
 */
function getCallTypeStyles(callType: string): { bg: string; text: string } {
  switch (callType) {
    case 'CREATE':
      return { bg: 'bg-data-orange/10', text: 'text-data-orange' };
    case 'CREATE2':
      return { bg: 'bg-warning/10', text: 'text-warning' };
    case 'DELEGATECALL':
      return { bg: 'bg-data-purple/10', text: 'text-data-purple' };
    case 'STATICCALL':
      return { bg: 'bg-data-cyan/10', text: 'text-data-cyan' };
    case 'CALLCODE':
      return { bg: 'bg-data-pink/10', text: 'text-data-pink' };
    case 'CALL':
    default:
      return { bg: 'bg-data-blue/10', text: 'text-data-blue' };
  }
}

/**
 * CallFrameRow - Table row for call frame display
 *
 * Used in transaction detail page to show call frames in a table format.
 * Renders as a table row (<tr>).
 */
export function CallFrameRow({ frame, totalGas, txHash, blockNumber }: CallFrameRowProps): JSX.Element {
  const callTypeStyles = getCallTypeStyles(frame.callType);
  const navigate = useNavigate();
  const gasPercentage = totalGas > 0 ? (frame.gasSelf / totalGas) * 100 : 0;

  const handleClick = useCallback(() => {
    navigate({
      to: '/ethereum/execution/gas-profiler/tx/$txHash/call/$callId',
      params: { txHash, callId: String(frame.callFrameId) },
      search: { block: blockNumber },
    });
  }, [navigate, txHash, frame.callFrameId, blockNumber]);

  // Display label: function name > contract name > address
  const displayLabel = frame.functionName || frame.targetName || truncateAddress(frame.targetAddress);
  const hasName = frame.functionName || frame.targetName;

  return (
    <tr onClick={handleClick} className="cursor-pointer transition-colors hover:bg-background">
      {/* Depth */}
      <td className="px-3 py-3 text-sm text-muted">{frame.depth}</td>

      {/* Call type + target info */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-medium',
              callTypeStyles.bg,
              callTypeStyles.text
            )}
          >
            {frame.callType}
          </span>
          <span
            className={clsx('truncate text-sm', hasName ? 'text-foreground' : 'font-mono text-muted')}
            title={frame.targetAddress}
          >
            {displayLabel}
          </span>
          {hasName && !frame.functionName && (
            <span className="font-mono text-xs text-muted" title={frame.targetAddress}>
              {frame.targetAddress.slice(0, 10)}...{frame.targetAddress.slice(-8)}
            </span>
          )}
        </div>
      </td>

      {/* Cumulative gas (includes children) */}
      <td className="px-3 py-3 text-right font-mono text-sm text-muted">{formatGas(frame.gasCumulative)}</td>

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

      {/* Gas (self only, excludes children) */}
      <td className="px-3 py-3 text-right font-mono text-sm text-foreground">{formatGas(frame.gasSelf)}</td>
    </tr>
  );
}
