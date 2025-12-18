import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { BarChart } from '@/components/Charts/Bar';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot } from '@/utils';
import type { EngineTimingsData } from '../../hooks/useEngineTimingsData';
import { ClientVersionBreakdown } from '../ClientVersionBreakdown';

export interface GetBlobsTabProps {
  data: EngineTimingsData;
  isLoading?: boolean;
}

/**
 * Loading skeleton for the getBlobs tab
 */
function GetBlobsTabSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <div className="space-y-2 p-4">
              <LoadingContainer className="h-3 w-20 rounded-xs" />
              <LoadingContainer className="h-8 w-24 rounded-xs" />
            </div>
          </Card>
        ))}
      </div>

      {/* Client breakdown skeleton */}
      <Card>
        <div className="space-y-4 p-4">
          <LoadingContainer className="h-5 w-40 rounded-xs" />
          <LoadingContainer className="h-48 w-full rounded-xs" />
        </div>
      </Card>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <div className="space-y-4 p-4">
              <LoadingContainer className="h-5 w-32 rounded-xs" />
              <LoadingContainer className="h-[375px] w-full rounded-xs" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * GetBlobs tab showing detailed engine_getBlobs timing analysis
 */
export function GetBlobsTab({ data, isLoading }: GetBlobsTabProps): JSX.Element {
  const themeColors = useThemeColors();

  // Show skeleton while loading
  if (isLoading) {
    return <GetBlobsTabSkeleton />;
  }

  const { getBlobsByElClient, getBlobsDurationHistogram, getBlobsHourly, getBlobsDaily } = data;

  // Filter to SUCCESS status only for duration-based charts
  const successBlobsByElClient = getBlobsByElClient.filter(r => r.status?.toUpperCase() === 'SUCCESS');

  // Determine which aggregated data source to use based on time range
  // Always use hourly data since all time ranges are < 24 hours
  const useHourlyData = true;

  // Calculate summary stats from pre-aggregated hourly/daily data
  const aggregatedStats = (() => {
    const sourceData = useHourlyData ? getBlobsHourly : getBlobsDaily;

    if (sourceData.length === 0) {
      return { totalObservations: 0, successRate: '0', avgDuration: '0' };
    }

    // Sum up counts from all rows
    let successCount = 0;
    let partialCount = 0;
    let emptyCount = 0;
    let errorCount = 0;
    let unsupportedCount = 0;
    let totalWeightedDuration = 0;

    sourceData.forEach(row => {
      const success = row.success_count ?? 0;
      successCount += success;
      partialCount += row.partial_count ?? 0;
      emptyCount += row.empty_count ?? 0;
      errorCount += row.error_count ?? 0;
      unsupportedCount += row.unsupported_count ?? 0;
      // Weight duration averages by success count (durations are SUCCESS only from backend)
      totalWeightedDuration += (row.avg_duration_ms ?? 0) * success;
    });

    const totalStatusCount = successCount + partialCount + emptyCount + errorCount + unsupportedCount;
    const successRate = totalStatusCount > 0 ? ((successCount / totalStatusCount) * 100).toFixed(1) : '0';
    const avgDuration = successCount > 0 ? (totalWeightedDuration / successCount).toFixed(0) : '0';

    // Use successCount for observations to match the table which shows SUCCESS only
    return { totalObservations: successCount, successRate, avgDuration };
  })();

  const { totalObservations, successRate, avgDuration } = aggregatedStats;

  // Calculate slot bounds from per-EL-client data (which has per-slot granularity)
  const slotBounds = (() => {
    let min = Infinity;
    let max = -Infinity;
    successBlobsByElClient.forEach(item => {
      const slot = item.slot ?? 0;
      if (slot < min) min = slot;
      if (slot > max) max = slot;
    });
    return { minSlot: min === Infinity ? 0 : min, maxSlot: max === -Infinity ? 0 : max };
  })();

  const { minSlot, maxSlot } = slotBounds;

  // Calculate weighted average blobs per request from per-EL-client data (SUCCESS only)
  const successTotalObs = successBlobsByElClient.reduce((sum, s) => sum + (s.observation_count ?? 0), 0);
  const totalWeightedBlobs = successBlobsByElClient.reduce(
    (sum, s) => sum + (s.avg_returned_count ?? 0) * (s.observation_count ?? 0),
    0
  );
  const avgBlobsPerRequest = successTotalObs > 0 ? (totalWeightedBlobs / successTotalObs).toFixed(1) : '0';

  // Prepare duration histogram data (SUCCESS status only)
  const histogramMap = new Map<number, number>();
  getBlobsDurationHistogram.forEach(item => {
    const bucket = item.chunk_duration_ms ?? 0;
    const count = item.success_count ?? 0;
    histogramMap.set(bucket, (histogramMap.get(bucket) ?? 0) + count);
  });

  const histogramBuckets = Array.from(histogramMap.keys()).sort((a, b) => a - b);
  const histogramLabels = histogramBuckets.map(bucket => `${bucket}ms`);
  const histogramData = histogramBuckets.map(bucket => histogramMap.get(bucket) ?? 0);

  // Calculate status breakdown from pre-aggregated hourly data
  const statusTotals = getBlobsHourly.reduce(
    (acc, item) => ({
      success: acc.success + (item.success_count ?? 0),
      partial: acc.partial + (item.partial_count ?? 0),
      empty: acc.empty + (item.empty_count ?? 0),
      error: acc.error + (item.error_count ?? 0),
      unsupported: acc.unsupported + (item.unsupported_count ?? 0),
    }),
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

  // Prepare blob count distribution from per-EL-client data (SUCCESS only to match table)
  const blobCountMap = new Map<number, number>();
  successBlobsByElClient.forEach(item => {
    const blobCount = item.avg_returned_count ?? 0;
    const roundedCount = Math.round(blobCount);
    const obsCount = item.observation_count ?? 0;
    blobCountMap.set(roundedCount, (blobCountMap.get(roundedCount) ?? 0) + obsCount);
  });

  const blobCountBuckets = Array.from(blobCountMap.keys()).sort((a, b) => a - b);
  const blobCountLabels = blobCountBuckets.map(count => `${count} blobs`);
  const blobCountData = blobCountBuckets.map(count => blobCountMap.get(count) ?? 0);

  // === EL Client Analysis ===
  // Build a map of EL client -> metrics (SUCCESS status only)
  const elClientMetrics = new Map<
    string,
    {
      avgDuration: number;
      medianDuration: number;
      p95Duration: number;
      observationCount: number;
    }
  >();

  successBlobsByElClient.forEach(item => {
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
      existing.p95Duration = (existing.p95Duration * existing.observationCount + p95Dur * obs) / (totalObs || 1);
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
  // Group data by client, then by slot (SUCCESS status only)
  const clientSlotData = new Map<string, Map<number, number>>();

  successBlobsByElClient.forEach(item => {
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

  // Downsample to ~400 points max per series to keep chart performant
  const MAX_POINTS_PER_SERIES = 400;

  const slotDurationByClientSeries = elClientList.map((client, index) => {
    const slotMap = clientSlotData.get(client) ?? new Map();
    const sortedSlots = Array.from(slotMap.entries()).sort((a, b) => a[0] - b[0]);

    // Downsample if needed - take every Nth point to stay under max
    let sampledSlots = sortedSlots;
    if (sortedSlots.length > MAX_POINTS_PER_SERIES) {
      const step = Math.ceil(sortedSlots.length / MAX_POINTS_PER_SERIES);
      sampledSlots = sortedSlots.filter((_, i) => i % step === 0);
    }

    return {
      name: client,
      data: sampledSlots.map(([slot, duration]) => [slot, duration]) as [number, number][],
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

      {/* Client Version Breakdown - only SUCCESS status */}
      <ClientVersionBreakdown
        data={successBlobsByElClient}
        title="EL Client Duration"
        description="Median engine_getBlobs duration (ms) by execution client and version"
        showBlobCount
        hideObservations
      />

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
