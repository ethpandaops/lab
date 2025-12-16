import type { JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { BarChart } from '@/components/Charts/Bar';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot } from '@/utils';
import type { EngineTimingsData } from '../../hooks/useEngineTimingsData';
import type { TimeRange } from '../../IndexPage.types';

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

export interface GetBlobsTabProps {
  data: EngineTimingsData;
  timeRange: TimeRange;
}

/**
 * GetBlobs tab showing detailed engine_getBlobs timing analysis
 */
export function GetBlobsTab({ data, timeRange }: GetBlobsTabProps): JSX.Element {
  const themeColors = useThemeColors();
  const { getBlobsBySlot, getBlobsByElClient, getBlobsDurationHistogram, getBlobsHourly, getBlobsDaily } = data;

  // Determine which aggregated data source to use based on time range
  const useHourlyData = timeRange === 'hour' || timeRange === 'day';

  // Calculate summary stats from pre-aggregated hourly/daily data
  const aggregatedStats = (() => {
    const sourceData = useHourlyData ? getBlobsHourly : getBlobsDaily;

    if (sourceData.length === 0) {
      return { totalObservations: 0, successRate: '0', avgDuration: '0' };
    }

    // Sum up counts from all rows
    let totalObservations = 0;
    let successCount = 0;
    let partialCount = 0;
    let emptyCount = 0;
    let errorCount = 0;
    let unsupportedCount = 0;
    let totalWeightedDuration = 0;

    sourceData.forEach(row => {
      const obs = row.observation_count ?? 0;
      totalObservations += obs;
      successCount += row.success_count ?? 0;
      partialCount += row.partial_count ?? 0;
      emptyCount += row.empty_count ?? 0;
      errorCount += row.error_count ?? 0;
      unsupportedCount += row.unsupported_count ?? 0;
      // Weight duration averages by observation count
      totalWeightedDuration += (row.avg_duration_ms ?? 0) * obs;
    });

    const totalStatusCount = successCount + partialCount + emptyCount + errorCount + unsupportedCount;
    const successRate = totalStatusCount > 0 ? ((successCount / totalStatusCount) * 100).toFixed(1) : '0';
    const avgDuration = totalObservations > 0 ? (totalWeightedDuration / totalObservations).toFixed(0) : '0';

    return { totalObservations, successRate, avgDuration };
  })();

  const { totalObservations, successRate, avgDuration } = aggregatedStats;

  // Prepare slot data for charts (not stats)
  const slotData = [...getBlobsBySlot].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

  const minSlot = slotData.length > 0 ? (slotData[0].slot ?? 0) : 0;
  const maxSlot = slotData.length > 0 ? (slotData[slotData.length - 1].slot ?? 0) : 0;

  // Calculate weighted average blobs per request from slot data (not available in aggregated data)
  const slotTotalObservations = slotData.reduce((sum, s) => sum + (s.observation_count ?? 0), 0);
  const totalWeightedBlobs = slotData.reduce(
    (sum, s) => sum + (s.avg_returned_count ?? 0) * (s.observation_count ?? 0),
    0
  );
  const avgBlobsPerRequest = slotTotalObservations > 0 ? (totalWeightedBlobs / slotTotalObservations).toFixed(1) : '0';

  // Prepare duration histogram data
  const histogramMap = new Map<number, number>();
  getBlobsDurationHistogram.forEach(item => {
    const bucket = item.chunk_duration_ms ?? 0;
    const count = item.observation_count ?? 0;
    histogramMap.set(bucket, (histogramMap.get(bucket) ?? 0) + count);
  });

  const histogramBuckets = Array.from(histogramMap.keys()).sort((a, b) => a - b);
  const histogramLabels = histogramBuckets.map(bucket => `${bucket}ms`);
  const histogramData = histogramBuckets.map(bucket => histogramMap.get(bucket) ?? 0);

  // Calculate status breakdown from slot data for the status distribution chart
  const statusTotals = slotData.reduce(
    (acc, item) => {
      const status = item.status?.toUpperCase() ?? 'UNKNOWN';
      const count = item.observation_count ?? 0;
      switch (status) {
        case 'SUCCESS':
          acc.success += count;
          break;
        case 'PARTIAL':
          acc.partial += count;
          break;
        case 'EMPTY':
          acc.empty += count;
          break;
        case 'ERROR':
          acc.error += count;
          break;
        case 'UNSUPPORTED':
          acc.unsupported += count;
          break;
      }
      return acc;
    },
    { success: 0, partial: 0, empty: 0, error: 0, unsupported: 0 }
  );

  const statusLabels = ['SUCCESS', 'PARTIAL', 'EMPTY', 'ERROR', 'UNSUPPORTED'];
  // Use BarDataItem with per-bar colors
  const statusData = [
    { value: statusTotals.success, color: themeColors.success },
    { value: statusTotals.partial, color: themeColors.warning },
    { value: statusTotals.empty, color: themeColors.muted },
    { value: statusTotals.error, color: themeColors.danger },
    { value: statusTotals.unsupported, color: themeColors.muted },
  ];

  // Prepare blob count distribution (weight by observation count)
  const blobCountMap = new Map<number, number>();
  slotData.forEach(item => {
    const blobCount = item.avg_returned_count ?? 0;
    const roundedCount = Math.round(blobCount);
    const obsCount = item.observation_count ?? 0;
    blobCountMap.set(roundedCount, (blobCountMap.get(roundedCount) ?? 0) + obsCount);
  });

  const blobCountBuckets = Array.from(blobCountMap.keys()).sort((a, b) => a - b);
  const blobCountLabels = blobCountBuckets.map(count => `${count} blobs`);
  const blobCountData = blobCountBuckets.map(count => blobCountMap.get(count) ?? 0);

  // === EL Client Analysis ===
  // Build a map of EL client -> metrics
  const elClientMetrics = new Map<
    string,
    {
      avgDuration: number;
      medianDuration: number;
      p95Duration: number;
      observationCount: number;
    }
  >();

  getBlobsByElClient.forEach(item => {
    const el = (item.meta_execution_implementation ?? 'unknown').toLowerCase();

    const existing = elClientMetrics.get(el);
    const obs = item.observation_count ?? 0;
    const avgDur = item.avg_duration_ms ?? 0;
    const medDur = item.median_duration_ms ?? 0;
    const p95Dur = item.p95_duration_ms ?? 0;

    if (existing) {
      const totalObs = existing.observationCount + obs;
      existing.avgDuration = (existing.avgDuration * existing.observationCount + avgDur * obs) / (totalObs || 1);
      existing.medianDuration = (existing.medianDuration * existing.observationCount + medDur * obs) / (totalObs || 1);
      existing.p95Duration = Math.max(existing.p95Duration, p95Dur);
      existing.observationCount = totalObs;
    } else {
      elClientMetrics.set(el, {
        avgDuration: avgDur,
        medianDuration: medDur,
        p95Duration: p95Dur,
        observationCount: obs,
      });
    }
  });

  const elClientList = Array.from(elClientMetrics.keys()).sort();

  // === Per-Slot Duration by Client ===
  // Group getBlobsByElClient data by client, then by slot
  const clientSlotData = new Map<string, Map<number, number>>();

  getBlobsByElClient.forEach(item => {
    const client = (item.meta_execution_implementation ?? 'unknown').toLowerCase();
    const slot = item.slot ?? 0;
    const duration = item.median_duration_ms ?? 0;

    if (!clientSlotData.has(client)) {
      clientSlotData.set(client, new Map());
    }
    // Use the median duration for this client+slot combination
    clientSlotData.get(client)!.set(slot, duration);
  });

  // Create series for the by-client chart
  const clientColors = [
    themeColors.primary,
    themeColors.success,
    themeColors.warning,
    themeColors.danger,
    themeColors.accent,
    themeColors.secondary,
  ];

  const slotDurationByClientSeries = elClientList.map((client, index) => {
    const slotMap = clientSlotData.get(client) ?? new Map();
    const sortedSlots = Array.from(slotMap.entries()).sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: sortedSlots.map(([slot, duration]) => [slot, duration]) as [number, number][],
      color: clientColors[index % clientColors.length],
    };
  });

  // Find max median duration for color scaling
  let maxMedianDuration = 0;
  elClientMetrics.forEach(metrics => {
    if (metrics.medianDuration > maxMedianDuration) {
      maxMedianDuration = metrics.medianDuration;
    }
  });

  const hasClientData = elClientList.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Stats
        stats={[
          {
            id: 'observations',
            name: 'Observations',
            value: totalObservations.toLocaleString(),
          },
          {
            id: 'success-rate',
            name: 'Success Rate',
            value: `${successRate}%`,
          },
          {
            id: 'avg-duration',
            name: 'Avg Duration',
            value: `${avgDuration} ms`,
          },
          {
            id: 'avg-blobs',
            name: 'Avg Blobs/Request',
            value: avgBlobsPerRequest,
          },
        ]}
      />

      {/* EL Client Duration */}
      {hasClientData && (
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground" id="client-matrix">
              EL Client Duration
            </h4>
            <p className="mb-4 text-sm text-muted">Median engine_getBlobs duration (ms) by execution client</p>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* EL client headers */}
                <div className="mb-2 flex gap-1">
                  {elClientList.map(el => (
                    <div key={el} className="flex min-w-20 flex-1 flex-col items-center gap-1 px-1">
                      <ClientLogo client={el} size={20} />
                      <div className="text-xs font-medium text-foreground">{el}</div>
                    </div>
                  ))}
                </div>

                {/* Duration values row */}
                <div className="flex gap-1">
                  {elClientList.map(el => {
                    const metrics = elClientMetrics.get(el);
                    const medianDuration = metrics?.medianDuration ?? 0;
                    const totalObs = metrics?.observationCount ?? 0;
                    const hasData = totalObs > 0;

                    return (
                      <div
                        key={el}
                        className={clsx(
                          'flex min-w-20 flex-1 flex-col items-center justify-center rounded-xs border p-2 text-sm',
                          hasData ? getIntensityClass(medianDuration, maxMedianDuration) : 'border-border bg-surface/50'
                        )}
                        title={
                          hasData
                            ? `${el}: ${medianDuration.toFixed(0)}ms median, ${totalObs.toLocaleString()} obs`
                            : `${el}: No data`
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

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted">
              <span>Duration:</span>
              <div className="flex items-center gap-1">
                <div className="size-3 rounded-xs border border-success/40 bg-success/20" />
                <span>Fast</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-3 rounded-xs border border-warning/30 bg-warning/10" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-3 rounded-xs border border-danger/30 bg-danger/10" />
                <span>Slow</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Duration Histogram and Per-Slot Duration - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Duration Histogram */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground" id="blob-duration">
              Duration Distribution (50ms buckets)
            </h4>
            <p className="mb-4 text-sm text-muted">Histogram of engine_getBlobs call durations</p>
            {histogramData.length > 0 ? (
              <BarChart
                data={histogramData}
                labels={histogramLabels}
                title="Observations"
                color={themeColors.accent}
                height={375}
              />
            ) : (
              <div className="flex h-[375px] items-center justify-center text-muted">No histogram data available</div>
            )}
          </div>
        </Card>

        {/* Per-Slot Duration by Client Chart */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground">Per-Slot Duration by Client</h4>
            <p className="mb-4 text-sm text-muted">Median duration for each slot, grouped by execution client</p>
            {hasClientData && slotDurationByClientSeries.some(s => s.data.length > 0) ? (
              <MultiLineChart
                series={slotDurationByClientSeries}
                xAxis={{
                  type: 'value',
                  name: 'Slot',
                  min: minSlot,
                  max: maxSlot,
                  formatter: (value: number | string) => formatSlot(Number(value)),
                }}
                yAxis={{
                  name: 'Duration (ms)',
                }}
                height={300}
                showLegend={true}
                enableDataZoom={true}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted">No slot data available</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground">Status Distribution</h4>
            <p className="mb-4 text-sm text-muted">Breakdown of getBlobs response status</p>
            {statusData.some(d => d.value > 0) ? (
              <BarChart data={statusData} labels={statusLabels} title="Count" height={250} orientation="horizontal" />
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted">No status data available</div>
            )}
          </div>
        </Card>

        {/* Blob Count Distribution */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground">Blob Count Distribution</h4>
            <p className="mb-4 text-sm text-muted">Number of blobs per request</p>
            {blobCountData.length > 0 ? (
              <BarChart
                data={blobCountData}
                labels={blobCountLabels}
                title="Slots"
                color={themeColors.accent}
                height={250}
              />
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted">No blob count data available</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
