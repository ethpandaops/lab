import { type JSX, memo } from 'react';
import { Card } from '@/components/Layout/Card';
import { ProgressBar } from '@/components/Navigation/ProgressBar';
import type { BlockDetailsCardProps } from './BlockDetailsCard.types';

function BlockDetailsCardComponent({
  data: _data,
  currentTime: _currentTime,
  attestationCount,
  attestationPercentage,
  attestationTotalExpected,
}: BlockDetailsCardProps): JSX.Element {
  // Show attestation progress bar only when attestation data is available
  const showAttestationProgress = attestationTotalExpected && attestationTotalExpected > 0;

  return (
    <Card className="p-4">
      {/* Attestation Progress Bar */}
      <div className="mb-1 text-xs text-muted">Attestation Progress</div>
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
