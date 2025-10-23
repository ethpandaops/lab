import { type JSX, memo } from 'react';
import { BlobDataAvailability } from '../BlobDataAvailability';
import { DataColumnDataAvailability } from '../DataColumnDataAvailability';
import { AttestationArrivals } from '../AttestationArrivals';
import type { BottomBarProps } from './BottomBar.types';

function BottomBarComponent({
  blockVersion,
  blobCount: _blobCount,
  dataColumnBlobCount,
  currentTime,
  deduplicatedBlobData,
  visibleContinentalPropagationData,
  attestationChartValues,
  attestationTotalExpected,
  mode: _mode,
}: BottomBarProps): JSX.Element {
  // Detect block version to choose availability component
  const version = blockVersion?.toLowerCase() ?? '';

  // Determine which availability component to show
  const showBlobAvailability = version.includes('deneb') || version.includes('electra') || !version;
  const showDataColumnAvailability = version.includes('fulu');

  return (
    <div className="grid grid-cols-12 gap-4 border-t border-border bg-background p-4" style={{ height: '320px' }}>
      {/* Columns 1-8: Data Availability Section */}
      <div className="col-span-8 h-full">
        {showBlobAvailability && (
          <BlobDataAvailability
            currentTime={currentTime}
            deduplicatedBlobData={deduplicatedBlobData}
            visibleContinentalPropagationData={visibleContinentalPropagationData}
            maxTime={12000}
          />
        )}

        {showDataColumnAvailability && (
          <DataColumnDataAvailability
            blobCount={dataColumnBlobCount}
            currentTime={currentTime}
            firstSeenData={[]}
            maxTime={12000}
          />
        )}

        {!showBlobAvailability && !showDataColumnAvailability && (
          <div className="flex h-full items-center justify-center rounded-sm bg-surface p-4">
            <p className="text-sm text-muted">Data availability visualization unavailable for this block version</p>
          </div>
        )}
      </div>

      {/* Columns 9-12: Attestation Arrivals */}
      <div className="col-span-4 h-full">
        <AttestationArrivals
          currentTime={currentTime}
          attestationChartValues={attestationChartValues}
          totalExpected={attestationTotalExpected}
        />
      </div>
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: BottomBarProps, nextProps: BottomBarProps): boolean => {
  return (
    prevProps.blockVersion === nextProps.blockVersion &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.deduplicatedBlobData === nextProps.deduplicatedBlobData &&
    prevProps.visibleContinentalPropagationData === nextProps.visibleContinentalPropagationData &&
    prevProps.attestationChartValues === nextProps.attestationChartValues &&
    prevProps.attestationTotalExpected === nextProps.attestationTotalExpected
  );
};

export const BottomBar = memo(BottomBarComponent, arePropsEqual);
