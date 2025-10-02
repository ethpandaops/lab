import { memo } from 'react';
import BottomPanel from '@/components/beacon/BottomPanel/index';
import { DataAvailabilityPanel } from '@/components/beacon/DataAvailabilityPanel';

interface AttestationPoint {
  time: number;
  totalValidators: number;
}

interface SlotViewBottomPanelsProps {
  blobTimings: {
    blobSeen?: Record<string, Record<string, number>>;
    blobFirstSeenP2p?: Record<string, Record<string, number>>;
    blockSeen?: Record<string, number>;
    blockFirstSeenP2p?: Record<string, number>;
  };
  currentTime: number;
  dataAvailabilityNodes?: Record<
    string,
    {
      geo: {
        continent?: string;
      };
    }
  >;
  attestationProgress: AttestationPoint[];
  totalValidators: number;
  attestationThreshold: number;
  loading: boolean;
  isMissing: boolean;
  attestationWindows?: Array<{
    start_ms: number;
    end_ms: number;
    validator_indices: number[];
  }>;
  maxPossibleValidators: number;
  isInModal?: boolean;
}

function SlotViewBottomPanelsComponent({
  blobTimings,
  currentTime,
  dataAvailabilityNodes,
  attestationProgress,
  totalValidators,
  attestationThreshold,
  loading,
  isMissing,
  attestationWindows,
  maxPossibleValidators,
  isInModal = false,
}: SlotViewBottomPanelsProps) {
  return (
    <div className={`flex h-[calc(25vh)] flex-col ${isInModal ? '' : 'hidden md:flex'}`}>
      <div className="h-full border-t border-subtle bg-surface/90 backdrop-blur-md">
        <div className="grid h-full w-full grid-cols-1 md:grid-cols-3">
          {/* Data Availability Section */}
          <div className="col-span-1 md:col-span-2 border-r border-subtle p-4">
            <DataAvailabilityPanel
              blobTimings={blobTimings}
              currentTime={currentTime}
              nodes={dataAvailabilityNodes}
            />
          </div>

          {/* Attestation Section */}
          <div className="p-4">
            <BottomPanel
              attestationProgress={attestationProgress}
              totalValidators={totalValidators}
              attestationThreshold={attestationThreshold}
              currentTime={currentTime}
              loading={loading}
              isMissing={isMissing}
              attestationWindows={attestationWindows}
              maxPossibleValidators={maxPossibleValidators}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const SlotViewBottomPanels = memo(
  SlotViewBottomPanelsComponent,
  (prev, next) =>
    prev.currentTime === next.currentTime &&
    prev.blobTimings === next.blobTimings &&
    prev.dataAvailabilityNodes === next.dataAvailabilityNodes &&
    prev.attestationProgress === next.attestationProgress &&
    prev.totalValidators === next.totalValidators &&
    prev.attestationThreshold === next.attestationThreshold &&
    prev.loading === next.loading &&
    prev.isMissing === next.isMissing &&
    prev.attestationWindows === next.attestationWindows &&
    prev.maxPossibleValidators === next.maxPossibleValidators &&
    prev.isInModal === next.isInModal,
);
