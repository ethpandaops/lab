import { type JSX, useMemo } from 'react';
import { StackedBar } from '@/components/Charts/StackedBar';
import { Card } from '@/components/Layout/Card';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import type { TransactionMetadata } from '../../IndexPage.types';
import { getEffectiveGasRefund } from '../../utils';

export interface GasBreakdownCardProps {
  /** Transaction metadata with gas values */
  metadata: TransactionMetadata;
  /** Network configuration for fork-aware refund calculation */
  network: Network | null;
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Gas breakdown visualization card showing intrinsic, EVM, and refund breakdown
 */
export function GasBreakdownCard({ metadata, network }: GasBreakdownCardProps): JSX.Element {
  const segments = useMemo(() => {
    const result = [];

    // Add intrinsic gas segment if available
    if (metadata.intrinsicGas !== null && metadata.intrinsicGas > 0) {
      result.push({
        name: 'Intrinsic',
        value: metadata.intrinsicGas,
        color: '#6366f1', // indigo-500
        description: 'Base transaction cost (21000 + calldata)',
      });
    }

    // Add EVM execution gas
    if (metadata.evmGasUsed > 0) {
      result.push({
        name: 'EVM Execution',
        value: metadata.evmGasUsed,
        color: '#3b82f6', // blue-500
        description: 'Gas consumed by opcode execution',
      });
    }

    return result;
  }, [metadata.intrinsicGas, metadata.evmGasUsed]);

  // Calculate total before refund
  const totalBeforeRefund = (metadata.intrinsicGas ?? 0) + metadata.evmGasUsed;

  // Calculate effective refund based on fork rules (EIP-3529 changed cap from 50% to 20%)
  const { effectiveRefund, isCapped, isPostLondon } = getEffectiveGasRefund(
    metadata.gasRefund,
    metadata.receiptGasUsed,
    metadata.blockNumber,
    network
  );

  // Format footer text with fork-appropriate cap description
  const capPercent = isPostLondon ? '20%' : '50%';
  const refundText =
    metadata.gasRefund > 0
      ? `Refund: -${formatGas(effectiveRefund)}${isCapped ? ` (capped at ${capPercent})` : ''}`
      : undefined;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Gas Breakdown</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted">
            Total: <span className="font-medium text-foreground">{formatGas(totalBeforeRefund)}</span>
          </span>
          <span className="text-muted">
            Receipt: <span className="font-medium text-foreground">{formatGas(metadata.receiptGasUsed)}</span>
          </span>
        </div>
      </div>

      {metadata.status === 'failed' && metadata.intrinsicGas === null ? (
        <div className="flex h-[80px] items-center justify-center rounded-xs border border-danger/30 bg-danger/10 text-sm text-danger">
          Failed transaction - intrinsic gas not available
        </div>
      ) : (
        <StackedBar
          segments={segments}
          total={totalBeforeRefund}
          height={80}
          showLabels
          showPercentages
          footerRight={refundText}
          footerRightClassName={metadata.gasRefund > 0 ? 'text-success' : undefined}
          valueFormatter={formatGas}
        />
      )}

      {/* Additional stats */}
      <div className="mt-3 grid grid-cols-4 gap-4 border-t border-border pt-3 text-xs">
        <div>
          <span className="text-muted">Calls</span>
          <p className="font-medium text-foreground">{metadata.frameCount}</p>
        </div>
        <div>
          <span className="text-muted">Max Depth</span>
          <p className="font-medium text-foreground">{metadata.maxDepth}</p>
        </div>
        <div>
          <span className="text-muted">Status</span>
          <p className={metadata.status === 'success' ? 'font-medium text-success' : 'font-medium text-danger'}>
            {metadata.status === 'success' ? 'Success' : 'Failed'}
          </p>
        </div>
        <div>
          <span className="text-muted">Block</span>
          <p className="font-mono font-medium text-foreground">{metadata.blockNumber.toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
}
