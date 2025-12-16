import type { JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import type { SlotEngineTimingsData } from '../../hooks/useSlotEngineTimings';
import { ClientVersionBreakdown } from '@/pages/ethereum/execution/timings/components/ClientVersionBreakdown';

export interface EngineTimingsCardProps {
  data: SlotEngineTimingsData | null;
  isLoading: boolean;
  hasBlobsInSlot: boolean;
}

/**
 * Card displaying engine API timing data for a specific slot.
 * Shows newPayload and getBlobs metrics with per-EL-client breakdown.
 */
export function EngineTimingsCard({ data, isLoading, hasBlobsInSlot }: EngineTimingsCardProps): JSX.Element | null {
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

  // Aggregate newPayload stats from status rows (weighted by observation count)
  const newPayloadTotalObs = newPayloadByStatus.reduce((sum, r) => sum + (r.observation_count ?? 0), 0);
  const newPayloadWeightedMedian = newPayloadByStatus.reduce(
    (sum, r) => sum + (r.median_duration_ms ?? 0) * (r.observation_count ?? 0),
    0
  );
  const newPayloadMedian = newPayloadTotalObs > 0 ? newPayloadWeightedMedian / newPayloadTotalObs : 0;
  const newPayloadWeightedP95 = newPayloadByStatus.reduce(
    (sum, r) => sum + (r.p95_duration_ms ?? 0) * (r.observation_count ?? 0),
    0
  );
  const newPayloadP95 = newPayloadTotalObs > 0 ? newPayloadWeightedP95 / newPayloadTotalObs : 0;

  // Aggregate getBlobs stats from SUCCESS status rows only (weighted by observation count)
  const getBlobsSuccessRows = getBlobsByStatus.filter(r => r.status?.toUpperCase() === 'SUCCESS');
  const getBlobsTotalObs = getBlobsSuccessRows.reduce((sum, r) => sum + (r.observation_count ?? 0), 0);
  const getBlobsWeightedMedian = getBlobsSuccessRows.reduce(
    (sum, r) => sum + (r.median_duration_ms ?? 0) * (r.observation_count ?? 0),
    0
  );
  const getBlobsMedian = getBlobsTotalObs > 0 ? getBlobsWeightedMedian / getBlobsTotalObs : 0;
  const getBlobsWeightedP95 = getBlobsSuccessRows.reduce(
    (sum, r) => sum + (r.p95_duration_ms ?? 0) * (r.observation_count ?? 0),
    0
  );
  const getBlobsP95 = getBlobsTotalObs > 0 ? getBlobsWeightedP95 / getBlobsTotalObs : 0;

  const hasNewPayloadData = newPayloadTotalObs > 0;
  const hasGetBlobsData = getBlobsTotalObs > 0;
  const hasClientData = newPayloadByClient.length > 0;
  const hasGetBlobsClientData = getBlobsByClient.length > 0;

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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">engine_newPayload</h3>
            <p className="text-sm text-muted">Block validation timing</p>
          </div>

          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <MiniStat label="Observations" value={newPayloadTotalObs.toLocaleString()} />
            <MiniStat label="Median" value={`${newPayloadMedian.toFixed(0)} ms`} />
            <MiniStat label="P95" value={`${newPayloadP95.toFixed(0)} ms`} />
          </div>

          {/* Per-Client Breakdown */}
          {hasClientData && (
            <ClientVersionBreakdown
              data={newPayloadByClient}
              noCard
              hideObservations
              hideP95
              durationLabel="Duration"
            />
          )}
        </Card>
      )}

      {/* getBlobs Section - show if there's timing data or if slot has blobs */}
      {showGetBlobsSection && (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">engine_getBlobs</h3>
            <p className="text-sm text-muted">Blob retrieval timing</p>
          </div>

          {hasGetBlobsData ? (
            <>
              {/* Summary Stats */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <MiniStat label="Observations" value={getBlobsTotalObs.toLocaleString()} />
                <MiniStat label="Median" value={`${getBlobsMedian.toFixed(0)} ms`} />
                <MiniStat label="P95" value={`${getBlobsP95.toFixed(0)} ms`} />
              </div>

              {/* Per-Client Breakdown - only show SUCCESS status */}
              {hasGetBlobsClientData && (
                <ClientVersionBreakdown
                  data={getBlobsByClient.filter(r => r.status?.toUpperCase() === 'SUCCESS')}
                  noCard
                  hideObservations
                  hideP95
                  durationLabel="Duration"
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
    </div>
  );
}
