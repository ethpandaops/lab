import { type JSX, memo } from 'react';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import { ProgressBar } from '@/components/Navigation/ProgressBar';
import { formatWeiToEth, formatNumber, formatGasPercentage } from '../../utils';
import type { BlockDetailsCardProps } from './BlockDetailsCard.types';

function BlockDetailsCardComponent({
  data,
  currentTime: _currentTime,
  attestationCount,
  attestationPercentage,
  attestationTotalExpected,
}: BlockDetailsCardProps): JSX.Element {
  // Show attestation progress bar only when attestation data is available
  const showAttestationProgress = attestationTotalExpected && attestationTotalExpected > 0;

  return (
    <Card className="min-h-[320px] p-6">
      {/* Prominent Slot Header */}
      <div className="mb-4 border-b border-border pb-4">
        <h2 className="text-3xl font-bold text-foreground">
          <span className="font-mono">{data?.slot.toLocaleString() ?? '—'}</span>
        </h2>
        <p className="text-sm text-muted">Slot</p>
      </div>

      {/* Primary Info Row */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Version:</span>
          <span className="text-sm font-medium text-foreground capitalize">{data?.blockVersion ?? '—'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Status:</span>
          <Badge color={data?.status === 'canonical' ? 'green' : data?.status === 'missed' ? 'red' : 'yellow'}>
            {data?.status ?? '—'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Timing:</span>
          <Badge color={data?.wasOnTime ? 'green' : 'yellow'}>
            {data?.wasOnTime ? 'On time' : data ? 'Late' : '—'}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <div className="text-xs text-muted">Gas Used</div>
          <div className="mt-1 font-mono text-sm text-foreground">
            {data ? formatNumber(data.gasUsed) : '—'}
            <div className="text-xs text-muted">{data ? formatGasPercentage(data.gasUsed, data.gasLimit) : '—'}</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted">Gas Limit</div>
          <div className="mt-1 font-mono text-sm text-foreground">{data ? formatNumber(data.gasLimit) : '—'}</div>
        </div>

        <div>
          <div className="text-xs text-muted">MEV Value</div>
          <div className="mt-1 font-mono text-sm text-foreground">{data ? formatWeiToEth(data.mevValue) : '—'}</div>
        </div>

        <div>
          <div className="text-xs text-muted">Transactions</div>
          <div className="mt-1 font-mono text-sm text-foreground">
            {data ? formatNumber(data.transactionCount) : '—'}
          </div>
        </div>
      </div>

      {/* Attestation Progress Bar - full width, subtle, minimal - always rendered to prevent layout shift */}
      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-1.5 text-xs text-muted">Attestation Progress</div>
        {showAttestationProgress ? (
          <ProgressBar
            progress={attestationPercentage}
            statusMessage={`${attestationCount} / ${attestationTotalExpected} (${attestationPercentage.toFixed(1)}%)`}
            ariaLabel="Attestation Progress"
            fillColor="bg-success"
            disableTransition={true}
          />
        ) : (
          <ProgressBar
            progress={0}
            statusMessage="—"
            ariaLabel="Attestation Progress"
            fillColor="bg-success"
            disableTransition={true}
          />
        )}
      </div>
    </Card>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: BlockDetailsCardProps, nextProps: BlockDetailsCardProps): boolean => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.attestationCount === nextProps.attestationCount &&
    prevProps.attestationPercentage === nextProps.attestationPercentage &&
    prevProps.attestationTotalExpected === nextProps.attestationTotalExpected
  );
};

export const BlockDetailsCard = memo(BlockDetailsCardComponent, arePropsEqual);
