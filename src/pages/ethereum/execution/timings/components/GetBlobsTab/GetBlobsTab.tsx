import type { JSX } from 'react';
import { useState } from 'react';
import { Card } from '@/components/Layout/Card';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { EIP7870SpecsBanner } from '@/components/Ethereum/EIP7870SpecsBanner';
import { Stats } from '@/components/DataDisplay/Stats';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { BarChart } from '@/components/Charts/Bar';
import { clientLogoHtml } from '@/components/Charts/chartChrome';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot, getExecutionClientColor, normalizeClientName } from '@/utils';
import type { FctEngineGetBlobsByElClientHourly, FctEngineGetBlobsByElClientDaily } from '@/api/types.gen';
import type { EngineTimingsData } from '../../hooks/useEngineTimingsData';
import { PER_SLOT_CHART_RANGES, HOURLY_CHART_RANGES, TIME_RANGE_CONFIG, type TimeRange } from '../../IndexPage.types';
import { ClientVersionBreakdown } from '../ClientVersionBreakdown';

export interface GetBlobsTabProps {
  data: EngineTimingsData;
  timeRange: TimeRange;
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

const PERCENTILE_OPTIONS = [
  { value: 'p50', label: 'P50' },
  { value: 'p95', label: 'P95' },
] as const;

/** Start of an hourly or daily row's bucket in ms (0 when missing) */
function bucketStartMs(row: { hour_start_date_time?: number; day_start_date?: string }): number {
  if (row.hour_start_date_time) return row.hour_start_date_time * 1000;
  return row.day_start_date ? Date.parse(`${row.day_start_date}T00:00:00Z`) : 0;
}

/**
 * GetBlobs tab showing detailed engine_getBlobs timing analysis
 */
export function GetBlobsTab({ data, timeRange, isLoading }: GetBlobsTabProps): JSX.Element {
  const themeColors = useThemeColors();

  // State for percentile toggle (P50 vs P95) in hourly duration chart
  const [selectedPercentile, setSelectedPercentile] = useState<'p50' | 'p95'>('p50');

  // Show skeleton while loading
  if (isLoading) {
    return <GetBlobsTabSkeleton />;
  }

  const { getBlobsByElClient, getBlobsByElClientHourly, getBlobsByElClientDaily, getBlobsDurationHistogram } = data;

  // Check if we should show per-slot charts (only for short time ranges)
  const showPerSlotCharts = PER_SLOT_CHART_RANGES.includes(timeRange);

  // Long ranges (90d+) only fetch the daily tables, so trends there have one point per day
  const showHourlyCharts = HOURLY_CHART_RANGES.includes(timeRange);
  const rangeConfig = TIME_RANGE_CONFIG[timeRange];
  const rangeSuffix = rangeConfig.seconds === null ? '' : `, ${rangeConfig.label.toLowerCase()}`;

  // Per-client/version rows covering the whole range (hourly up to 31d, daily beyond)
  const summaryRows: (FctEngineGetBlobsByElClientHourly | FctEngineGetBlobsByElClientDaily)[] = showHourlyCharts
    ? getBlobsByElClientHourly
    : getBlobsByElClientDaily;

  // Filter to SUCCESS status only for duration-based charts
  const successBlobsByElClient = getBlobsByElClient.filter(r => r.status?.toUpperCase() === 'SUCCESS');

  // Hourly data is already filtered to SUCCESS status in the SQL query (via quantileIf)
  // so we can use it directly for the summary table

  // Calculate summary stats from hourly/daily data (always available, accurate aggregations)
  const aggregatedStats = (() => {
    let successCount = 0;
    let partialCount = 0;
    let emptyCount = 0;
    let errorCount = 0;
    let unsupportedCount = 0;
    let totalWeightedDuration = 0;
    let totalWeightedBlobs = 0;

    summaryRows.forEach(row => {
      const obs = row.observation_count ?? 0;
      successCount += row.success_count ?? 0;
      partialCount += row.partial_count ?? 0;
      emptyCount += row.empty_count ?? 0;
      errorCount += row.error_count ?? 0;
      unsupportedCount += row.unsupported_count ?? 0;

      // Duration stats (weighted by total observations)
      totalWeightedDuration += (row.avg_duration_ms ?? 0) * obs;
      totalWeightedBlobs += (row.avg_returned_count ?? 0) * obs;
    });

    const totalStatusCount = successCount + partialCount + emptyCount + errorCount + unsupportedCount;
    const successRate = totalStatusCount > 0 ? ((successCount / totalStatusCount) * 100).toFixed(1) : '0';
    const avgDuration = totalStatusCount > 0 ? (totalWeightedDuration / totalStatusCount).toFixed(0) : '0';
    const avgBlobsPerRequest = totalStatusCount > 0 ? (totalWeightedBlobs / totalStatusCount).toFixed(1) : '0';

    return {
      totalObservations: totalStatusCount,
      successRate,
      avgDuration,
      avgBlobsPerRequest,
      statusTotals: {
        success: successCount,
        partial: partialCount,
        empty: emptyCount,
        error: errorCount,
        unsupported: unsupportedCount,
      },
    };
  })();

  const { totalObservations, successRate, avgDuration, avgBlobsPerRequest, statusTotals } = aggregatedStats;

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

  const histogramCard = (
    <PopoutCard
      title="Duration Distribution (50ms buckets)"
      subtitle={`Successful engine_getBlobs calls from every Xatu node${rangeSuffix}`}
      anchorId="blob-duration"
      modalSize="full"
    >
      <div>
        {histogramData.length > 0 ? (
          <BarChart
            data={histogramData}
            labels={histogramLabels}
            showLabel={false}
            color={themeColors.accent}
            height={375}
          />
        ) : (
          <div className="flex h-[375px] items-center justify-center text-muted">No histogram data available</div>
        )}
      </div>
    </PopoutCard>
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
    const el = normalizeClientName(item.meta_execution_implementation ?? 'unknown');

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
    const client = normalizeClientName(item.meta_execution_implementation ?? 'unknown');
    const slot = item.slot ?? 0;
    const duration = item.median_duration_ms ?? 0;

    if (!clientSlotData.has(client)) {
      clientSlotData.set(client, new Map());
    }
    // Use the median duration for this client+slot combination
    clientSlotData.get(client)!.set(slot, duration);
  });

  const slotDurationByClientSeries = elClientList.map((client, index) => {
    const slotMap = clientSlotData.get(client) ?? new Map();
    const sortedSlots = Array.from(slotMap.entries()).sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: sortedSlots.map(([slot, duration]) => [slot, duration]) as [number, number][],
      color: getExecutionClientColor(client, index),
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

  // === Trend Series (for longer time ranges) ===
  // Group hourly/daily data by client and bucket, aggregating across versions with weighted average
  const trendClientData = new Map<string, Map<number, { totalP50: number; totalP95: number; totalObs: number }>>();
  const trendClients = new Set<string>();

  summaryRows.forEach(row => {
    const client = normalizeClientName(row.meta_execution_implementation ?? 'unknown');
    trendClients.add(client);

    const timestampMs = bucketStartMs(row);
    const p50 = row.p50_duration_ms ?? 0;
    const p95 = row.p95_duration_ms ?? 0;
    const obs = row.observation_count ?? 0;

    if (timestampMs > 0 && obs > 0 && p50 > 0) {
      if (!trendClientData.has(client)) {
        trendClientData.set(client, new Map());
      }
      const clientHours = trendClientData.get(client)!;

      // Aggregate by hour - weighted by observation count
      const existing = clientHours.get(timestampMs);
      if (existing) {
        existing.totalP50 += p50 * obs;
        existing.totalP95 += p95 * obs;
        existing.totalObs += obs;
      } else {
        clientHours.set(timestampMs, { totalP50: p50 * obs, totalP95: p95 * obs, totalObs: obs });
      }
    }
  });

  // Sort clients for consistent coloring and create series
  const trendClientList = Array.from(trendClients).sort();

  // Calculate time bounds for the hourly chart
  let trendMinTime = Infinity;
  let trendMaxTime = -Infinity;

  const trendP50Series = trendClientList.map((client, index) => {
    const clientHours = trendClientData.get(client) ?? new Map();
    const dataPoints: [number, number][] = [];

    clientHours.forEach((agg, timestampMs) => {
      const avgP50 = agg.totalObs > 0 ? agg.totalP50 / agg.totalObs : 0;
      dataPoints.push([timestampMs, avgP50]);

      // Track min/max for axis bounds
      if (timestampMs < trendMinTime) trendMinTime = timestampMs;
      if (timestampMs > trendMaxTime) trendMaxTime = timestampMs;
    });

    // Sort by timestamp
    dataPoints.sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: dataPoints,
      color: getExecutionClientColor(client, index),
    };
  });

  // P95 Duration series
  const trendP95Series = trendClientList.map((client, index) => {
    const clientHours = trendClientData.get(client) ?? new Map();
    const dataPoints: [number, number][] = [];

    clientHours.forEach((agg, timestampMs) => {
      const avgP95 = agg.totalObs > 0 ? agg.totalP95 / agg.totalObs : 0;
      dataPoints.push([timestampMs, avgP95]);
    });

    dataPoints.sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: dataPoints,
      color: getExecutionClientColor(client, index),
    };
  });

  // Ensure valid bounds (fallback to now if no data)
  if (trendMinTime === Infinity) trendMinTime = Date.now() - 3600000;
  if (trendMaxTime === -Infinity) trendMaxTime = Date.now();

  // Axis and tooltip labels for the trend charts' hourly/daily buckets
  const formatTrendAxis = (value: number | string): string => {
    const date = new Date(Number(value));
    if (timeRange === '24hours') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const formatTrendBucket = (ms: number): string =>
    showHourlyCharts
      ? new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  // === Success Rate Trend Series (for longer time ranges) ===
  // Group hourly/daily data by client and bucket, calculating success rate
  const successRateClientData = new Map<string, Map<number, { successCount: number; totalCount: number }>>();

  summaryRows.forEach(row => {
    const client = normalizeClientName(row.meta_execution_implementation ?? 'unknown');
    const timestampMs = bucketStartMs(row);
    const successCount = row.success_count ?? 0;
    const totalCount = row.observation_count ?? 0;

    if (timestampMs > 0 && totalCount > 0) {
      if (!successRateClientData.has(client)) {
        successRateClientData.set(client, new Map());
      }
      const clientHours = successRateClientData.get(client)!;

      // Aggregate by hour - sum counts
      const existing = clientHours.get(timestampMs);
      if (existing) {
        existing.successCount += successCount;
        existing.totalCount += totalCount;
      } else {
        clientHours.set(timestampMs, { successCount, totalCount });
      }
    }
  });

  const successRateTrendSeries = trendClientList.map((client, index) => {
    const clientHours = successRateClientData.get(client) ?? new Map();
    const dataPoints: [number, number][] = [];

    clientHours.forEach((counts, timestampMs) => {
      const rate = counts.totalCount > 0 ? (counts.successCount / counts.totalCount) * 100 : 0;
      dataPoints.push([timestampMs, rate]);
    });

    // Sort by timestamp
    dataPoints.sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: dataPoints,
      color: getExecutionClientColor(client, index),
    };
  });

  return (
    <div className="space-y-6">
      {/* Hardware specs banner */}
      <EIP7870SpecsBanner />

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
      <PopoutCard
        title="EL Client Duration"
        subtitle="engine_getBlobs duration (ms) by execution client and version"
        anchorId="client-duration"
        modalSize="full"
      >
        {() => (
          <ClientVersionBreakdown
            data={successBlobsByElClient}
            hourlyData={summaryRows}
            showBlobCount
            hideObservations
            hideRange
            noCard
          />
        )}
      </PopoutCard>

      {/* Per-slot charts (short time ranges) or hourly/daily trend charts */}
      {showPerSlotCharts ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {histogramCard}

          {/* Per-Slot Duration by Client Chart */}
          <PopoutCard
            title="Per-Slot Duration by Client"
            subtitle="Median duration for each slot"
            anchorId="blob-slot-duration"
            modalSize="full"
          >
            <div>
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
          </PopoutCard>
        </div>
      ) : (
        /* Hourly (daily for 90d+) trend charts for longer time ranges */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Hourly Duration (P50/P95 toggle) */}
          <PopoutCard
            title={`${showHourlyCharts ? 'Hourly' : 'Daily'} ${selectedPercentile === 'p50' ? 'P50' : 'P95'} Duration by Client`}
            anchorId="blob-hourly-duration"
            modalSize="full"
            headerActions={
              <SegmentedControl
                ariaLabel="Percentile"
                options={PERCENTILE_OPTIONS}
                value={selectedPercentile}
                onChange={setSelectedPercentile}
              />
            }
          >
            <div>
              {(selectedPercentile === 'p50' ? trendP50Series : trendP95Series).length > 0 &&
              (selectedPercentile === 'p50' ? trendP50Series : trendP95Series).some(s => s.data.length > 0) ? (
                <MultiLineChart
                  series={selectedPercentile === 'p50' ? trendP50Series : trendP95Series}
                  xAxis={{
                    type: 'value',
                    name: 'Time',
                    min: trendMinTime,
                    max: trendMaxTime,
                    formatter: formatTrendAxis,
                  }}
                  yAxis={{
                    name: `${selectedPercentile === 'p50' ? 'P50' : 'P95'} Duration (ms)`,
                  }}
                  height={300}
                  showLegend={true}
                  enableDataZoom={true}
                  tooltipFormatter={(params: unknown) => {
                    const dataPoints = Array.isArray(params) ? params : [params];
                    if (dataPoints.length === 0) return '';

                    // Get timestamp from first data point
                    const firstPoint = dataPoints[0] as { value?: [number, number]; axisValue?: number };
                    const timestamp = firstPoint.value?.[0] ?? firstPoint.axisValue ?? 0;
                    const timeStr = formatTrendBucket(timestamp);

                    let html = `<div style="font-weight: 600; margin-bottom: 8px;">${timeStr}</div>`;
                    dataPoints.forEach((point: unknown) => {
                      const p = point as { seriesName?: string; value?: [number, number]; color?: string };
                      const value = p.value?.[1];
                      if (value !== undefined && value !== null) {
                        html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">`;
                        html += `<span style="display: inline-block; width: 10px; height: 10px; background: ${p.color}; border-radius: 50%;"></span>`;
                        html += clientLogoHtml(p.seriesName ?? '');
                        html += `<span>${p.seriesName}:</span>`;
                        html += `<span style="font-weight: 600; margin-left: auto;">${Math.round(value)} ms</span>`;
                        html += `</div>`;
                      }
                    });
                    return html;
                  }}
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted">No data available</div>
              )}
            </div>
          </PopoutCard>

          {/* Success Rate Over Time */}
          <PopoutCard
            title="Success Rate Over Time"
            subtitle={`Percentage of successful getBlobs calls per ${showHourlyCharts ? 'hour' : 'day'} by client`}
            anchorId="blob-success-rate"
            modalSize="full"
          >
            <div>
              {successRateTrendSeries.length > 0 && successRateTrendSeries.some(s => s.data.length > 0) ? (
                <MultiLineChart
                  series={successRateTrendSeries}
                  xAxis={{
                    type: 'value',
                    name: 'Time',
                    min: trendMinTime,
                    max: trendMaxTime,
                    formatter: formatTrendAxis,
                  }}
                  yAxis={{
                    name: 'Success Rate (%)',
                    max: 100,
                    min: 0,
                  }}
                  height={300}
                  showLegend={true}
                  enableDataZoom={true}
                  tooltipFormatter={(params: unknown) => {
                    const dataPoints = Array.isArray(params) ? params : [params];
                    if (dataPoints.length === 0) return '';

                    // Get timestamp from first data point
                    const firstPoint = dataPoints[0] as { value?: [number, number]; axisValue?: number };
                    const timestamp = firstPoint.value?.[0] ?? firstPoint.axisValue ?? 0;
                    const timeStr = formatTrendBucket(timestamp);

                    let html = `<div style="font-weight: 600; margin-bottom: 8px;">${timeStr}</div>`;
                    dataPoints.forEach((point: unknown) => {
                      const p = point as { seriesName?: string; value?: [number, number]; color?: string };
                      const value = p.value?.[1];
                      if (value !== undefined && value !== null) {
                        html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">`;
                        html += `<span style="display: inline-block; width: 10px; height: 10px; background: ${p.color}; border-radius: 50%;"></span>`;
                        html += clientLogoHtml(p.seriesName ?? '');
                        html += `<span>${p.seriesName}:</span>`;
                        html += `<span style="font-weight: 600; margin-left: auto;">${value.toFixed(1)}%</span>`;
                        html += `</div>`;
                      }
                    });
                    return html;
                  }}
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted">No data available</div>
              )}
            </div>
          </PopoutCard>
        </div>
      )}

      {/* Status Breakdown, plus Blob Count Distribution from per-slot data on short time ranges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Breakdown */}
        {!showPerSlotCharts && histogramCard}
        <PopoutCard
          title="Status Distribution"
          subtitle={`engine_getBlobs calls by response status${rangeSuffix}`}
          anchorId="blob-status"
          modalSize="full"
        >
          <div>
            {statusData.some(d => d.value > 0) ? (
              <BarChart data={statusData} labels={statusLabels} height={250} orientation="horizontal" />
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted">No status data available</div>
            )}
          </div>
        </PopoutCard>

        {/* Blob Count Distribution */}
        {showPerSlotCharts && (
          <PopoutCard
            title="Blob Count Distribution"
            subtitle="Number of blobs per request"
            anchorId="blob-count"
            modalSize="full"
          >
            <div>
              {blobCountData.length > 0 ? (
                <BarChart data={blobCountData} labels={blobCountLabels} color={themeColors.accent} height={250} />
              ) : (
                <div className="flex h-[250px] items-center justify-center text-muted">
                  No blob count data available
                </div>
              )}
            </div>
          </PopoutCard>
        )}
      </div>
    </div>
  );
}
