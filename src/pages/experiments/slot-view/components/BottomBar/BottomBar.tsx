import { type JSX, memo } from 'react';
import { BlobDataAvailability } from '../BlobDataAvailability';
import { DataColumnDataAvailability } from '../DataColumnDataAvailability';
import { AttestationArrivals } from '../AttestationArrivals';
import type { BottomBarProps } from './BottomBar.types';

function BottomBarComponent({ slotData, currentTime, mode: _mode }: BottomBarProps): JSX.Element {
  // Detect block version to choose availability component
  const blockVersion = slotData.blockDetails?.blockVersion?.toLowerCase() ?? '';

  // Determine which availability component to show
  const showBlobAvailability = blockVersion.includes('deneb') || blockVersion.includes('electra') || !blockVersion;
  const showDataColumnAvailability = blockVersion.includes('fulu');

  return (
    <div className="grid grid-cols-12 gap-4 border-t border-border bg-background p-4" style={{ height: '320px' }}>
      {/* Columns 1-8: Data Availability Section */}
      <div className="col-span-8 h-full">
        {showBlobAvailability && (
          <BlobDataAvailability
            currentTime={currentTime}
            firstSeenData={slotData.blobFirstSeenData}
            availabilityRateData={slotData.blobAvailabilityRateData}
            continentalPropagationData={slotData.blobContinentalPropagationData}
            maxTime={12000}
          />
        )}

        {showDataColumnAvailability && (
          <DataColumnDataAvailability
            blobCount={slotData.dataColumnBlobCount}
            currentTime={currentTime}
            firstSeenData={slotData.dataColumnFirstSeenData}
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
          data={slotData.attestationData}
          totalExpected={slotData.attestationTotalExpected}
        />
      </div>
    </div>
  );
}

export const BottomBar = memo(BottomBarComponent);
