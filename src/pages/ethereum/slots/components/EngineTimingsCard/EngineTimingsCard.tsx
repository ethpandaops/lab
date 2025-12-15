import type { JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { SlotEngineTimingsData } from '../../hooks/useSlotEngineTimings';

/**
 * Helper to get intensity class based on value relative to max
 */
function getIntensityClass(value: number, max: number): string {
  if (max === 0) return 'bg-surface border-border text-muted';

  const ratio = value / max;

  // Use a color scale from green (fast) to red (slow)
  if (ratio <= 0.25) return 'bg-success/20 border-success/40 text-success';
  if (ratio <= 0.5) return 'bg-success/10 border-success/30 text-foreground';
  if (ratio <= 0.75) return 'bg-warning/10 border-warning/30 text-foreground';
  return 'bg-danger/10 border-danger/30 text-danger';
}

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
  if (!isLoading && !data?.newPayload && !data?.getBlobs) {
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

  const { newPayload, newPayloadByClient, getBlobs, getBlobsByClient } = data!;

  // Build client metrics map for newPayload
  const clientMetrics = new Map<
    string,
    {
      medianDuration: number;
      observationCount: number;
    }
  >();

  newPayloadByClient.forEach(item => {
    const client = (item.meta_execution_implementation ?? 'unknown').toLowerCase();
    const existing = clientMetrics.get(client);
    const obs = item.observation_count ?? 0;
    const medDur = item.median_duration_ms ?? 0;

    if (existing) {
      const totalObs = existing.observationCount + obs;
      existing.medianDuration = (existing.medianDuration * existing.observationCount + medDur * obs) / (totalObs || 1);
      existing.observationCount = totalObs;
    } else {
      clientMetrics.set(client, {
        medianDuration: medDur,
        observationCount: obs,
      });
    }
  });

  const clientList = Array.from(clientMetrics.keys()).sort();

  // Find max median duration for color scaling
  let maxMedianDuration = 0;
  clientMetrics.forEach(metrics => {
    if (metrics.medianDuration > maxMedianDuration) {
      maxMedianDuration = metrics.medianDuration;
    }
  });

  // Build client metrics map for getBlobs
  const getBlobsClientMetrics = new Map<
    string,
    {
      medianDuration: number;
      observationCount: number;
    }
  >();

  getBlobsByClient.forEach(item => {
    const client = (item.meta_execution_implementation ?? 'unknown').toLowerCase();
    const existing = getBlobsClientMetrics.get(client);
    const obs = item.observation_count ?? 0;
    const medDur = item.median_duration_ms ?? 0;

    if (existing) {
      const totalObs = existing.observationCount + obs;
      existing.medianDuration = (existing.medianDuration * existing.observationCount + medDur * obs) / (totalObs || 1);
      existing.observationCount = totalObs;
    } else {
      getBlobsClientMetrics.set(client, {
        medianDuration: medDur,
        observationCount: obs,
      });
    }
  });

  const getBlobsClientList = Array.from(getBlobsClientMetrics.keys()).sort();

  let maxGetBlobsDuration = 0;
  getBlobsClientMetrics.forEach(metrics => {
    if (metrics.medianDuration > maxGetBlobsDuration) {
      maxGetBlobsDuration = metrics.medianDuration;
    }
  });

  const hasNewPayloadData = newPayload && (newPayload.observation_count ?? 0) > 0;
  const hasGetBlobsData = getBlobs && (getBlobs.observation_count ?? 0) > 0;
  const hasClientData = clientList.length > 0;
  const hasGetBlobsClientData = getBlobsClientList.length > 0;

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
            <MiniStat label="Observations" value={(newPayload.observation_count ?? 0).toLocaleString()} />
            <MiniStat label="Median" value={`${(newPayload.median_duration_ms ?? 0).toFixed(0)} ms`} />
            <MiniStat label="P95" value={`${(newPayload.p95_duration_ms ?? 0).toFixed(0)} ms`} />
          </div>

          {/* Per-Client Breakdown */}
          {hasClientData && (
            <div>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* Client headers */}
                  <div className="mb-2 flex gap-1">
                    {clientList.map(client => (
                      <div key={client} className="flex min-w-16 flex-1 flex-col items-center gap-1 px-1">
                        <ClientLogo client={client} size={18} />
                        <div className="text-xs font-medium text-foreground">{client}</div>
                      </div>
                    ))}
                  </div>

                  {/* Duration values */}
                  <div className="flex gap-1">
                    {clientList.map(client => {
                      const metrics = clientMetrics.get(client);
                      const medianDuration = metrics?.medianDuration ?? 0;
                      const totalObs = metrics?.observationCount ?? 0;
                      const hasData = totalObs > 0;

                      return (
                        <div
                          key={client}
                          className={clsx(
                            'flex min-w-16 flex-1 flex-col items-center justify-center rounded-xs border p-2 text-sm',
                            hasData
                              ? getIntensityClass(medianDuration, maxMedianDuration)
                              : 'border-border bg-surface/50'
                          )}
                          title={
                            hasData
                              ? `${client}: ${medianDuration.toFixed(0)}ms median, ${totalObs.toLocaleString()} obs`
                              : `${client}: No data`
                          }
                        >
                          {hasData ? (
                            <>
                              <span className="font-semibold">{medianDuration.toFixed(0)}</span>
                              <span className="text-xs opacity-70">ms</span>
                            </>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
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
                <MiniStat label="Observations" value={(getBlobs!.observation_count ?? 0).toLocaleString()} />
                <MiniStat label="Median" value={`${(getBlobs!.median_duration_ms ?? 0).toFixed(0)} ms`} />
                <MiniStat label="Avg Blobs" value={(getBlobs!.avg_returned_count ?? 0).toFixed(1)} />
              </div>

              {/* Per-Client Breakdown */}
              {hasGetBlobsClientData && (
                <div>
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      {/* Client headers */}
                      <div className="mb-2 flex gap-1">
                        {getBlobsClientList.map(client => (
                          <div key={client} className="flex min-w-16 flex-1 flex-col items-center gap-1 px-1">
                            <ClientLogo client={client} size={18} />
                            <div className="text-xs font-medium text-foreground">{client}</div>
                          </div>
                        ))}
                      </div>

                      {/* Duration values */}
                      <div className="flex gap-1">
                        {getBlobsClientList.map(client => {
                          const metrics = getBlobsClientMetrics.get(client);
                          const medianDuration = metrics?.medianDuration ?? 0;
                          const totalObs = metrics?.observationCount ?? 0;
                          const hasData = totalObs > 0;

                          return (
                            <div
                              key={client}
                              className={clsx(
                                'flex min-w-16 flex-1 flex-col items-center justify-center rounded-xs border p-2 text-sm',
                                hasData
                                  ? getIntensityClass(medianDuration, maxGetBlobsDuration)
                                  : 'border-border bg-surface/50'
                              )}
                              title={
                                hasData
                                  ? `${client}: ${medianDuration.toFixed(0)}ms median, ${totalObs.toLocaleString()} obs`
                                  : `${client}: No data`
                              }
                            >
                              {hasData ? (
                                <>
                                  <span className="font-semibold">{medianDuration.toFixed(0)}</span>
                                  <span className="text-xs opacity-70">ms</span>
                                </>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
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
