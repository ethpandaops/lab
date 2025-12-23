import { useState, type JSX } from 'react';
import clsx from 'clsx';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import type { SlotEngineTimingsData } from '../../hooks/useSlotEngineTimings';
import { ClientVersionBreakdown } from '@/pages/ethereum/execution/timings/components/ClientVersionBreakdown';
import { ReferenceNodesInfoDialog } from '@/pages/ethereum/execution/timings/components/ReferenceNodesInfoDialog';

export interface EngineTimingsCardProps {
  data: SlotEngineTimingsData | null;
  isLoading: boolean;
  hasBlobsInSlot: boolean;
  /** Slot number for expandable row feature */
  slot?: number;
}

/**
 * Card displaying engine API timing data for a specific slot.
 * Shows newPayload and getBlobs metrics with per-EL-client breakdown.
 */
export function EngineTimingsCard({
  data,
  isLoading,
  hasBlobsInSlot,
  slot,
}: EngineTimingsCardProps): JSX.Element | null {
  const [showRefNodeInfo, setShowRefNodeInfo] = useState(false);

  // Don't render anything if no data and not loading
  if (!isLoading && !data?.newPayloadByStatus?.length && !data?.getBlobsByStatus?.length) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Engine API Timings</h3>
          <p className="text-sm text-muted">How execution clients processed this block</p>
        </div>
        <div className="space-y-3">
          <div className="h-16 animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30 bg-[length:200%_100%]" />
          <div className="h-16 animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30 bg-[length:200%_100%]" />
        </div>
      </Card>
    );
  }

  const { newPayloadByStatus, newPayloadByClient, getBlobsByStatus, getBlobsByClient } = data!;

  // Filter to VALID status only for summary stats
  const newPayloadValidRows = newPayloadByStatus.filter(r => r.status?.toUpperCase() === 'VALID');

  // Aggregate newPayload stats from VALID status rows only (weighted by observation count)
  const newPayloadTotalObs = newPayloadValidRows.reduce((sum, r) => sum + (r.observation_count ?? 0), 0);
  const newPayloadWeightedMedian = newPayloadValidRows.reduce(
    (sum, r) => sum + (r.median_duration_ms ?? 0) * (r.observation_count ?? 0),
    0
  );
  const newPayloadMedian = newPayloadTotalObs > 0 ? newPayloadWeightedMedian / newPayloadTotalObs : 0;
  // Calculate min/max for range display
  let newPayloadMin = Infinity;
  let newPayloadMax = 0;
  newPayloadValidRows.forEach(r => {
    const min = r.min_duration_ms ?? 0;
    const max = r.max_duration_ms ?? 0;
    if (min > 0 && min < newPayloadMin) newPayloadMin = min;
    if (max > newPayloadMax) newPayloadMax = max;
  });
  if (newPayloadMin === Infinity) newPayloadMin = 0;

  // Aggregate getBlobs stats from SUCCESS status rows only (weighted by observation count)
  const getBlobsSuccessRows = getBlobsByStatus.filter(r => r.status?.toUpperCase() === 'SUCCESS');
  const getBlobsTotalObs = getBlobsSuccessRows.reduce((sum, r) => sum + (r.observation_count ?? 0), 0);
  const getBlobsWeightedMedian = getBlobsSuccessRows.reduce(
    (sum, r) => sum + (r.median_duration_ms ?? 0) * (r.observation_count ?? 0),
    0
  );
  const getBlobsMedian = getBlobsTotalObs > 0 ? getBlobsWeightedMedian / getBlobsTotalObs : 0;
  // Calculate min/max for range display
  let getBlobsMin = Infinity;
  let getBlobsMax = 0;
  getBlobsSuccessRows.forEach(r => {
    const min = r.min_duration_ms ?? 0;
    const max = r.max_duration_ms ?? 0;
    if (min > 0 && min < getBlobsMin) getBlobsMin = min;
    if (max > getBlobsMax) getBlobsMax = max;
  });
  if (getBlobsMin === Infinity) getBlobsMin = 0;

  const hasNewPayloadData = newPayloadTotalObs > 0 || newPayloadByClient.length > 0;
  const hasGetBlobsData = getBlobsTotalObs > 0;
  const hasClientData = newPayloadByClient.length > 0;
  const getBlobsSuccessByClient = getBlobsByClient.filter(r => r.status?.toUpperCase() === 'SUCCESS');
  const hasGetBlobsClientData = getBlobsSuccessByClient.length > 0;

  // Don't render if no data at all
  if (!hasNewPayloadData && !hasGetBlobsData) {
    return null;
  }

  const showGetBlobsSection = hasBlobsInSlot || hasGetBlobsData;
  const showBothSections = hasNewPayloadData && showGetBlobsSection;

  return (
    <div className={clsx('grid gap-6', showBothSections ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
      {/* newPayload Section */}
      {hasNewPayloadData && (
        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">engine_newPayload</h3>
              <p className="text-sm text-muted">Block validation timing</p>
            </div>
            <button
              onClick={() => setShowRefNodeInfo(true)}
              className="rounded-xs p-1 text-muted transition-colors hover:text-foreground"
              aria-label="Learn more about reference nodes"
            >
              <InformationCircleIcon className="size-5" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <MiniStat label="Median" value={`${newPayloadMedian.toFixed(0)} ms`} />
            <MiniStat label="Range" value={`${newPayloadMin} – ${newPayloadMax} ms`} />
          </div>

          {/* Per-Client Breakdown - all statuses, expand to see details */}
          {hasClientData && (
            <ClientVersionBreakdown
              data={newPayloadByClient}
              noCard
              hideObservations
              hideRange
              expandable
              slot={slot}
              durationStatusFilter="VALID"
            />
          )}
        </Card>
      )}

      {/* getBlobs Section - show if there's timing data or if slot has blobs */}
      {showGetBlobsSection && (
        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">engine_getBlobs</h3>
              <p className="text-sm text-muted">Blob retrieval timing</p>
            </div>
            <button
              onClick={() => setShowRefNodeInfo(true)}
              className="rounded-xs p-1 text-muted transition-colors hover:text-foreground"
              aria-label="Learn more about reference nodes"
            >
              <InformationCircleIcon className="size-5" />
            </button>
          </div>

          {hasGetBlobsData ? (
            <>
              {/* Summary Stats */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <MiniStat label="Median" value={`${getBlobsMedian.toFixed(0)} ms`} />
                <MiniStat label="Range" value={`${getBlobsMin} – ${getBlobsMax} ms`} />
              </div>

              {/* Per-Client Breakdown - only SUCCESS status */}
              {hasGetBlobsClientData && (
                <ClientVersionBreakdown
                  data={getBlobsSuccessByClient}
                  noCard
                  hideObservations
                  hideRange
                  showBlobCount
                  blobCountLabel="Blobs"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted">No timing data available for this slot</p>
          )}
        </Card>
      )}

      {/* Reference Node Info Dialog */}
      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />
    </div>
  );
}
