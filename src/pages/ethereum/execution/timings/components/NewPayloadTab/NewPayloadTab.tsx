import type { JSX } from 'react';
import { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { EIP7870SpecsBanner } from '@/components/Ethereum/EIP7870SpecsBanner';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { BarChart } from '@/components/Charts/Bar';
import { ScatterAndLineChart } from '@/components/Charts/ScatterAndLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot, getExecutionClientColor } from '@/utils';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { FctEngineNewPayloadWinrateHourly, IntEngineNewPayloadFastest } from '@/api/types.gen';
import type { EngineTimingsData } from '../../hooks/useEngineTimingsData';
import { PER_SLOT_CHART_RANGES, type TimeRange } from '../../IndexPage.types';
import { ClientVersionBreakdown } from '../ClientVersionBreakdown';

export interface NewPayloadTabProps {
  data: EngineTimingsData;
  timeRange: TimeRange;
}

/**
 * NewPayload tab showing detailed engine_newPayload timing analysis
 */
export function NewPayloadTab({ data, timeRange }: NewPayloadTabProps): JSX.Element {
  const themeColors = useThemeColors();
  const {
    newPayloadDurationHistogram,
    newPayloadByElClient,
    newPayloadByElClientHourly,
    winrateHourly,
    winratePerSlot,
  } = data;

  // Check if we should show per-slot charts (only for short time ranges)
  const showPerSlotCharts = PER_SLOT_CHART_RANGES.includes(timeRange);

  // Filter to VALID status only for duration-based charts
  const validPayloadByElClient = newPayloadByElClient.filter(r => r.status?.toUpperCase() === 'VALID');

  // Hourly data is already filtered to VALID status in the SQL query (via quantileIf)
  // so we can use it directly for the summary table

  // State for scatter chart series visibility
  const [visibleScatterSeries, setVisibleScatterSeries] = useState<Set<string>>(new Set());
  const [scatterSeriesInitialized, setScatterSeriesInitialized] = useState(false);

  // State for percentile toggle (P50 vs P95) in hourly duration chart
  const [selectedPercentile, setSelectedPercentile] = useState<'p50' | 'p95'>('p50');

  // Calculate slot bounds from per-EL-client data (which has per-slot granularity)
  // This avoids needing the slow newPayloadBySlot endpoint
  const slotBounds = (() => {
    let min = Infinity;
    let max = -Infinity;
    validPayloadByElClient.forEach(item => {
      const slot = item.slot ?? 0;
      if (slot < min) min = slot;
      if (slot > max) max = slot;
    });
    return { minSlot: min === Infinity ? 0 : min, maxSlot: max === -Infinity ? 0 : max };
  })();

  const { minSlot, maxSlot } = slotBounds;

  // Prepare duration histogram data (VALID status only)
  // Group histogram data by bucket and sum VALID counts
  const histogramMap = new Map<number, number>();
  newPayloadDurationHistogram.forEach(item => {
    const bucket = item.chunk_duration_ms ?? 0;
    const count = item.valid_count ?? 0;
    histogramMap.set(bucket, (histogramMap.get(bucket) ?? 0) + count);
  });

  const histogramBuckets = Array.from(histogramMap.keys()).sort((a, b) => a - b);
  const histogramLabels = histogramBuckets.map(bucket => `${bucket}ms`);
  const histogramData = histogramBuckets.map(bucket => histogramMap.get(bucket) ?? 0);

  // Calculate status breakdown from per-slot data
  const statusTotals = newPayloadByElClient.reduce(
    (acc, item) => {
      const obs = item.observation_count ?? 0;
      const status = item.status?.toUpperCase() ?? '';

      switch (status) {
        case 'VALID':
          return { ...acc, valid: acc.valid + obs };
        case 'INVALID':
          return { ...acc, invalid: acc.invalid + obs };
        case 'SYNCING':
          return { ...acc, syncing: acc.syncing + obs };
        case 'ACCEPTED':
          return { ...acc, accepted: acc.accepted + obs };
        case 'INVALID_BLOCK_HASH':
          return { ...acc, invalidBlockHash: acc.invalidBlockHash + obs };
        case 'ERROR':
          return { ...acc, error: acc.error + obs };
        default:
          return acc;
      }
    },
    { valid: 0, invalid: 0, syncing: 0, accepted: 0, invalidBlockHash: 0, error: 0 }
  );

  const statusLabels = ['VALID', 'INVALID', 'SYNCING', 'ACCEPTED', 'INVALID_BLOCK_HASH', 'ERROR'];
  // Use BarDataItem with per-bar colors
  const statusData = [
    { value: statusTotals.valid, color: themeColors.success },
    { value: statusTotals.invalid, color: themeColors.danger },
    { value: statusTotals.syncing, color: themeColors.warning },
    { value: statusTotals.accepted, color: themeColors.accent },
    { value: statusTotals.invalidBlockHash, color: themeColors.danger },
    { value: statusTotals.error, color: themeColors.muted },
  ];

  // === Block Complexity vs Duration by Client ===
  // Group scatter data by EL client (VALID status only)
  const clientGasData = new Map<string, [number, number][]>();

  validPayloadByElClient.forEach(item => {
    const client = (item.meta_execution_implementation ?? 'unknown').toLowerCase();
    const gasUsed = item.gas_used;
    const duration = item.median_duration_ms;

    if (gasUsed !== undefined && duration !== undefined) {
      if (!clientGasData.has(client)) {
        clientGasData.set(client, []);
      }
      clientGasData.get(client)!.push([gasUsed / 1_000_000, duration]); // Gas in millions
    }
  });

  const hasBlockComplexityData = clientGasData.size > 0;

  // === EL Client Analysis ===
  // Build a map of EL client -> metrics (VALID status only)
  const elClientMetrics = new Map<
    string,
    {
      avgDuration: number;
      medianDuration: number;
      p95Duration: number;
      observationCount: number;
    }
  >();

  validPayloadByElClient.forEach(item => {
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
  // Group data by client, then by slot (VALID status only)
  const clientSlotData = new Map<string, Map<number, number>>();

  validPayloadByElClient.forEach(item => {
    const client = (item.meta_execution_implementation ?? 'unknown').toLowerCase();
    const slot = item.slot ?? 0;
    const duration = item.median_duration_ms ?? 0;

    if (!clientSlotData.has(client)) {
      clientSlotData.set(client, new Map());
    }
    clientSlotData.get(client)!.set(slot, duration);
  });

  // Create series for the per-slot by-client chart
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
      data: sampledSlots.map(([slot, duration]) => [slot, duration] as [number, number]),
      color: getExecutionClientColor(client, index),
    };
  });

  // === Hourly Trend Series (for longer time ranges) ===
  // Group hourly data by client and hour, aggregating across versions with weighted average
  const hourlyClientData = new Map<
    string,
    Map<number, { totalP50: number; totalP95: number; totalGasUsed: number; totalObs: number }>
  >();
  const hourlyClients = new Set<string>();

  newPayloadByElClientHourly.forEach(row => {
    const client = (row.meta_execution_implementation ?? 'unknown').toLowerCase();
    hourlyClients.add(client);

    const timestamp = row.hour_start_date_time ?? 0;
    const p50 = row.p50_duration_ms ?? 0;
    const p95 = row.p95_duration_ms ?? 0;
    const gasUsed = row.avg_gas_used ?? 0;
    const obs = row.observation_count ?? 0;

    if (timestamp > 0 && obs > 0 && p50 > 0) {
      const timestampMs = timestamp * 1000;

      if (!hourlyClientData.has(client)) {
        hourlyClientData.set(client, new Map());
      }
      const clientHours = hourlyClientData.get(client)!;

      // Aggregate by hour - weighted by observation count
      const existing = clientHours.get(timestampMs);
      if (existing) {
        existing.totalP50 += p50 * obs;
        existing.totalP95 += p95 * obs;
        existing.totalGasUsed += gasUsed * obs;
        existing.totalObs += obs;
      } else {
        clientHours.set(timestampMs, {
          totalP50: p50 * obs,
          totalP95: p95 * obs,
          totalGasUsed: gasUsed * obs,
          totalObs: obs,
        });
      }
    }
  });

  // Sort clients for consistent coloring and create series
  const hourlyClientList = Array.from(hourlyClients).sort();

  // Calculate time bounds for the hourly chart
  let hourlyMinTime = Infinity;
  let hourlyMaxTime = -Infinity;

  const hourlyP50Series = hourlyClientList.map((client, index) => {
    const clientHours = hourlyClientData.get(client) ?? new Map();
    const dataPoints: [number, number][] = [];

    clientHours.forEach((agg, timestampMs) => {
      const avgP50 = agg.totalObs > 0 ? agg.totalP50 / agg.totalObs : 0;
      dataPoints.push([timestampMs, avgP50]);

      // Track min/max for axis bounds
      if (timestampMs < hourlyMinTime) hourlyMinTime = timestampMs;
      if (timestampMs > hourlyMaxTime) hourlyMaxTime = timestampMs;
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
  const hourlyP95Series = hourlyClientList.map((client, index) => {
    const clientHours = hourlyClientData.get(client) ?? new Map();
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
  if (hourlyMinTime === Infinity) hourlyMinTime = Date.now() - 3600000;
  if (hourlyMaxTime === -Infinity) hourlyMaxTime = Date.now();

  // Keep hourlyTrendSeries as alias for backward compatibility
  const hourlyTrendSeries = hourlyP50Series;

  // === Valid Rate Trend Series (for longer time ranges) ===
  // Calculate valid rate per client per hour
  const validRateClientData = new Map<string, Map<number, { validCount: number; totalCount: number }>>();

  newPayloadByElClientHourly.forEach(row => {
    const client = (row.meta_execution_implementation ?? 'unknown').toLowerCase();
    const timestamp = row.hour_start_date_time ?? 0;
    const validCount = row.valid_count ?? 0;
    const totalCount = row.observation_count ?? 0;

    if (timestamp > 0 && totalCount > 0) {
      if (!validRateClientData.has(client)) {
        validRateClientData.set(client, new Map());
      }
      const clientHours = validRateClientData.get(client)!;
      const timestampMs = timestamp * 1000;

      // Aggregate by hour
      const existing = clientHours.get(timestampMs);
      if (existing) {
        existing.validCount += validCount;
        existing.totalCount += totalCount;
      } else {
        clientHours.set(timestampMs, { validCount, totalCount });
      }
    }
  });

  const validRateTrendSeries = hourlyClientList.map((client, index) => {
    const clientHours = validRateClientData.get(client) ?? new Map();
    const dataPoints: [number, number][] = [];

    clientHours.forEach((counts, timestampMs) => {
      const rate = counts.totalCount > 0 ? (counts.validCount / counts.totalCount) * 100 : 0;
      dataPoints.push([timestampMs, rate]);
    });

    dataPoints.sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: dataPoints,
      color: getExecutionClientColor(client, index),
    };
  });

  // Create scatter series for block complexity - using same client order for consistent colors
  const blockComplexitySeries = elClientList.map((client, index) => ({
    name: client,
    data: clientGasData.get(client) ?? [],
    color: getExecutionClientColor(client, index),
    symbolSize: 6,
  }));

  // Initialize scatter series visibility when elClientList changes
  useEffect(() => {
    if (elClientList.length > 0 && !scatterSeriesInitialized) {
      setVisibleScatterSeries(new Set(elClientList));
      setScatterSeriesInitialized(true);
    }
  }, [elClientList, scatterSeriesInitialized]);

  // Toggle scatter series visibility
  const toggleScatterSeries = (name: string): void => {
    setVisibleScatterSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Filter scatter series based on visibility
  const visibleBlockComplexitySeries = blockComplexitySeries.filter(s => visibleScatterSeries.has(s.name));

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
      <EIP7870SpecsBanner />

      {/* Execution Winrate — fastest client per slot */}
      <WinrateSection
        hourlyRecords={winrateHourly}
        perSlotRecords={winratePerSlot}
        allClients={[...new Set([...hourlyClientList, ...elClientList])]}
        timeRange={timeRange}
        showPerSlot={showPerSlotCharts}
      />

      {/* Client Version Breakdown — VALID status only */}
      <PopoutCard
        title="EL Client Duration"
        subtitle="engine_newPayload duration (ms) by execution client and version"
        anchorId="client-duration"
        modalSize="full"
      >
        {() => (
          <ClientVersionBreakdown
            data={validPayloadByElClient}
            hourlyData={newPayloadByElClientHourly}
            hideObservations
            hideRange
            noCard
          />
        )}
      </PopoutCard>

      {/* Per-slot charts — short time ranges only */}
      {showPerSlotCharts && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PopoutCard
            title="Per-Slot Duration by Client"
            subtitle="Median duration for each slot, grouped by execution client"
            anchorId="slot-duration"
            modalSize="full"
          >
            {({ inModal }) =>
              hasClientData && slotDurationByClientSeries.some(s => s.data.length > 0) ? (
                <MultiLineChart
                  series={slotDurationByClientSeries}
                  xAxis={{
                    type: 'value',
                    name: 'Slot',
                    min: minSlot,
                    max: maxSlot,
                    formatter: (value: number | string) => formatSlot(Number(value)),
                  }}
                  yAxis={{ name: 'Duration (ms)' }}
                  height={inModal ? 600 : 300}
                  showLegend
                  enableDataZoom
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted">No slot data available</div>
              )
            }
          </PopoutCard>

          <PopoutCard
            title="Block Complexity vs Duration"
            subtitle="Gas used vs processing time, grouped by execution client"
            anchorId="block-complexity"
            modalSize="full"
          >
            {({ inModal }) =>
              hasBlockComplexityData ? (
                <>
                  <div className="mb-4 border-b border-border pb-4">
                    <div className="mb-2">
                      <span className="text-sm/6 font-medium text-muted">Series:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {blockComplexitySeries.map(s => {
                        const isVisible = visibleScatterSeries.has(s.name);
                        return (
                          <button
                            key={s.name}
                            onClick={() => toggleScatterSeries(s.name)}
                            className={clsx(
                              'flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs/5 transition-colors',
                              isVisible
                                ? 'bg-surface-hover text-foreground'
                                : 'hover:bg-surface-hover/50 bg-surface/50 text-muted/50'
                            )}
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor: isVisible ? s.color : 'transparent',
                                border: `2px solid ${s.color}`,
                              }}
                            />
                            <span className="font-medium">{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <ScatterAndLineChart
                    key={Array.from(visibleScatterSeries).sort().join(',')}
                    scatterSeries={visibleBlockComplexitySeries}
                    xAxisTitle="Gas Used (millions)"
                    yAxisTitle="Duration (ms)"
                    height={inModal ? 600 : 300}
                    showLegend={false}
                    tooltipFormatter={(params: unknown) => {
                      const p = params as { seriesName: string; data: [number, number] };
                      return `<strong>${p.seriesName}</strong><br/>Gas: ${p.data[0].toFixed(1)}M<br/>Duration: ${p.data[1].toFixed(0)}ms`;
                    }}
                  />
                </>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted">No block data available</div>
              )
            }
          </PopoutCard>
        </div>
      )}

      {/* Hourly charts — longer time ranges */}
      {!showPerSlotCharts && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {hourlyTrendSeries.length > 0 && hourlyTrendSeries.some(s => s.data.length > 0) && (
            <PopoutCard
              title={`Hourly ${selectedPercentile === 'p50' ? 'P50' : 'P95'} Duration by Client`}
              subtitle={
                selectedPercentile === 'p50'
                  ? '50th percentile duration over time, grouped by execution client'
                  : '95th percentile duration over time (tail latency)'
              }
              anchorId="hourly-duration"
              modalSize="full"
              headerActions={
                <div className="flex rounded-sm border border-border">
                  <button
                    onClick={() => setSelectedPercentile('p50')}
                    className={clsx(
                      'px-3 py-1 text-xs font-medium transition-colors',
                      selectedPercentile === 'p50'
                        ? 'bg-primary text-white'
                        : 'bg-transparent text-muted hover:text-foreground'
                    )}
                  >
                    P50
                  </button>
                  <button
                    onClick={() => setSelectedPercentile('p95')}
                    className={clsx(
                      'px-3 py-1 text-xs font-medium transition-colors',
                      selectedPercentile === 'p95'
                        ? 'bg-primary text-white'
                        : 'bg-transparent text-muted hover:text-foreground'
                    )}
                  >
                    P95
                  </button>
                </div>
              }
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={selectedPercentile === 'p50' ? hourlyTrendSeries : hourlyP95Series}
                  xAxis={{
                    type: 'value',
                    name: 'Time',
                    min: hourlyMinTime,
                    max: hourlyMaxTime,
                    formatter: (value: number | string) => {
                      const date = new Date(Number(value));
                      if (timeRange === '7days' || timeRange === '31days') {
                        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      }
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    },
                  }}
                  yAxis={{
                    name: `${selectedPercentile === 'p50' ? 'P50' : 'P95'} Duration (ms)`,
                  }}
                  height={inModal ? 600 : 300}
                  showLegend
                  enableDataZoom
                  tooltipFormatter={(params: unknown) => {
                    const dataPoints = Array.isArray(params) ? params : [params];
                    if (dataPoints.length === 0) return '';

                    const firstPoint = dataPoints[0] as { value?: [number, number]; axisValue?: number };
                    const timestamp = firstPoint.value?.[0] ?? firstPoint.axisValue ?? 0;
                    const date = new Date(timestamp);
                    const timeStr = date.toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    let html = `<div style="font-weight: 600; margin-bottom: 8px;">${timeStr}</div>`;
                    dataPoints.forEach((point: unknown) => {
                      const p = point as { seriesName?: string; value?: [number, number]; color?: string };
                      const value = p.value?.[1];
                      if (value !== undefined && value !== null) {
                        html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">`;
                        html += `<span style="display: inline-block; width: 10px; height: 10px; background: ${p.color}; border-radius: 50%;"></span>`;
                        html += `<span>${p.seriesName}:</span>`;
                        html += `<span style="font-weight: 600; margin-left: auto;">${Math.round(value)} ms</span>`;
                        html += `</div>`;
                      }
                    });
                    return html;
                  }}
                />
              )}
            </PopoutCard>
          )}

          {validRateTrendSeries.length > 0 && validRateTrendSeries.some(s => s.data.length > 0) && (
            <PopoutCard
              title="Valid Rate Over Time"
              subtitle="Percentage of VALID responses per hour by client"
              anchorId="valid-rate"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={validRateTrendSeries}
                  xAxis={{
                    type: 'value',
                    name: 'Time',
                    min: hourlyMinTime,
                    max: hourlyMaxTime,
                    formatter: (value: number | string) => {
                      const date = new Date(Number(value));
                      if (timeRange === '7days' || timeRange === '31days') {
                        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      }
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    },
                  }}
                  yAxis={{
                    name: 'Valid Rate (%)',
                    min: 0,
                    max: 100,
                    formatter: (value: number) => `${value}%`,
                  }}
                  height={inModal ? 600 : 300}
                  showLegend
                  tooltipFormatter={(params: unknown) => {
                    const dataPoints = Array.isArray(params) ? params : [params];
                    if (dataPoints.length === 0) return '';

                    const firstPoint = dataPoints[0] as { value?: [number, number]; axisValue?: number };
                    const timestamp = firstPoint.value?.[0] ?? firstPoint.axisValue ?? 0;
                    const date = new Date(timestamp);
                    const timeStr = date.toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    let html = `<div style="font-weight: 600; margin-bottom: 8px;">${timeStr}</div>`;
                    dataPoints.forEach((point: unknown) => {
                      const p = point as { seriesName?: string; value?: [number, number]; color?: string };
                      const value = p.value?.[1];
                      if (value !== undefined && value !== null) {
                        html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">`;
                        html += `<span style="display: inline-block; width: 10px; height: 10px; background: ${p.color}; border-radius: 50%;"></span>`;
                        html += `<span>${p.seriesName}:</span>`;
                        html += `<span style="font-weight: 600; margin-left: auto;">${value.toFixed(1)}%</span>`;
                        html += `</div>`;
                      }
                    });
                    return html;
                  }}
                />
              )}
            </PopoutCard>
          )}
        </div>
      )}

      {/* Duration Histogram and Status Distribution — per-slot data */}
      {showPerSlotCharts && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PopoutCard
            title="Duration Distribution (50ms buckets)"
            subtitle="Histogram of engine_newPayload call durations"
            anchorId="duration-histogram"
            modalSize="full"
          >
            {({ inModal }) =>
              histogramData.length > 0 ? (
                <BarChart
                  data={histogramData}
                  labels={histogramLabels}
                  color={themeColors.primary}
                  height={inModal ? 600 : 300}
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted">No histogram data available</div>
              )
            }
          </PopoutCard>

          <PopoutCard
            title="Status Distribution"
            subtitle="Breakdown of validation status responses"
            anchorId="status-distribution"
            modalSize="full"
          >
            {({ inModal }) =>
              statusData.some(d => d.value > 0) ? (
                <BarChart
                  data={statusData}
                  labels={statusLabels}
                  height={inModal ? 600 : 300}
                  orientation="horizontal"
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted">No status data available</div>
              )
            }
          </PopoutCard>
        </div>
      )}
    </div>
  );
}

/** Standings entry for the podium */
interface WinrateStanding {
  implementation: string;
  totalWins: number;
  winRate: number;
  color: string;
  rank: number;
}

/** Normalize client names: lowercase + go-ethereum → geth */
function normalizeClient(name: string): string {
  const lower = name.toLowerCase();
  return lower === 'go-ethereum' ? 'geth' : lower;
}

/** Build standings from a totals-by-impl map */
function buildStandings(totalsByImpl: Map<string, number>, allClients: string[]): WinrateStanding[] {
  const grandTotal = [...totalsByImpl.values()].reduce((s, c) => s + c, 0);

  for (const client of allClients) {
    const norm = normalizeClient(client);
    if (!totalsByImpl.has(norm)) totalsByImpl.set(norm, 0);
  }

  const sorted = [...totalsByImpl.entries()]
    .map(([impl, wins], i) => ({
      implementation: impl,
      totalWins: wins,
      winRate: grandTotal > 0 ? Number(((wins / grandTotal) * 100).toFixed(1)) : 0,
      color: getExecutionClientColor(impl, i),
      rank: 0,
    }))
    .sort((a, b) => b.totalWins - a.totalWins);

  let currentRank = 1;
  for (let idx = 0; idx < sorted.length; idx++) {
    if (idx > 0 && sorted[idx].totalWins < sorted[idx - 1].totalWins) {
      currentRank = idx + 1;
    }
    sorted[idx].rank = currentRank;
  }

  return sorted;
}

/** Winrate chart + standings for engine_newPayload fastest client per slot */
function WinrateSection({
  hourlyRecords,
  perSlotRecords,
  allClients,
  timeRange,
  showPerSlot,
}: {
  hourlyRecords: FctEngineNewPayloadWinrateHourly[];
  perSlotRecords: IntEngineNewPayloadFastest[];
  allClients: string[];
  timeRange: TimeRange;
  showPerSlot: boolean;
}): JSX.Element | null {
  const { chartConfig, standings } = useMemo(() => {
    if (showPerSlot) {
      // Per-slot mode: each record is a winner for that slot+node_class
      if (!perSlotRecords.length && !allClients.length) return { chartConfig: null, standings: [] };

      // Group by slot → count wins per implementation, track timestamps
      const bySlotAndImpl = new Map<number, Map<string, number>>();
      const slotToTimestamp = new Map<number, number>();
      const allImpls = new Set<string>();

      for (const r of perSlotRecords) {
        const slot = r.slot ?? 0;
        const impl = normalizeClient(r.meta_execution_implementation ?? '');
        if (!impl || !slot) continue;

        allImpls.add(impl);
        if (!bySlotAndImpl.has(slot)) bySlotAndImpl.set(slot, new Map());
        const slotMap = bySlotAndImpl.get(slot)!;
        slotMap.set(impl, (slotMap.get(impl) ?? 0) + 1);

        if (!slotToTimestamp.has(slot) && r.slot_start_date_time) {
          slotToTimestamp.set(slot, r.slot_start_date_time);
        }
      }

      const sortedSlots = [...bySlotAndImpl.keys()].sort((a, b) => a - b);
      if (!sortedSlots.length) return { chartConfig: null, standings: [] };

      // Downsample slots into ~60 buckets for readable chart
      const BUCKET_COUNT = 60;
      const bucketSize = Math.max(1, Math.ceil(sortedSlots.length / BUCKET_COUNT));
      const buckets: { label: string; implCounts: Map<string, number>; total: number }[] = [];

      for (let i = 0; i < sortedSlots.length; i += bucketSize) {
        const bucketSlots = sortedSlots.slice(i, i + bucketSize);
        const implCounts = new Map<string, number>();
        let total = 0;

        for (const slot of bucketSlots) {
          const slotMap = bySlotAndImpl.get(slot)!;
          for (const [impl, count] of slotMap) {
            implCounts.set(impl, (implCounts.get(impl) ?? 0) + count);
            total += count;
          }
        }

        // Use the timestamp of the first slot in the bucket for the label
        const ts = slotToTimestamp.get(bucketSlots[0]) ?? 0;
        const date = new Date(ts * 1000);
        const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        buckets.push({ label, implCounts, total });
      }

      const labels = buckets.map(b => b.label);
      const sortedImpls = [...allImpls].sort();
      const series: SeriesData[] = sortedImpls.map((impl, i) => ({
        name: impl,
        data: buckets.map(b => {
          const count = b.implCounts.get(impl) ?? 0;
          return b.total > 0 ? Number(((count / b.total) * 100).toFixed(2)) : null;
        }),
        color: getExecutionClientColor(impl, i),
        seriesType: 'bar' as const,
        stack: 'winrate',
      }));

      // Standings from per-slot data
      const totalsByImpl = new Map<string, number>();
      for (const r of perSlotRecords) {
        const impl = normalizeClient(r.meta_execution_implementation ?? '');
        if (!impl) continue;
        totalsByImpl.set(impl, (totalsByImpl.get(impl) ?? 0) + 1);
      }

      return { chartConfig: { labels, series }, standings: buildStandings(totalsByImpl, allClients) };
    }

    // Hourly mode (24h / 7d)
    if (!hourlyRecords.length && !allClients.length) return { chartConfig: null, standings: [] };

    const byHourAndImpl = new Map<number, Map<string, number>>();
    const allImpls = new Set<string>();

    for (const r of hourlyRecords) {
      const hour = r.hour_start_date_time ?? 0;
      const impl = normalizeClient(r.meta_execution_implementation ?? '');
      const count = r.win_count ?? 0;
      if (!impl || !hour) continue;

      allImpls.add(impl);
      if (!byHourAndImpl.has(hour)) byHourAndImpl.set(hour, new Map());
      const hourMap = byHourAndImpl.get(hour)!;
      hourMap.set(impl, (hourMap.get(impl) ?? 0) + count);
    }

    const sortedHours = [...byHourAndImpl.keys()].sort((a, b) => a - b);
    if (!sortedHours.length) return { chartConfig: null, standings: [] };

    const totalsByHour = new Map<number, number>();
    for (const hour of sortedHours) {
      const implMap = byHourAndImpl.get(hour)!;
      let total = 0;
      for (const count of implMap.values()) total += count;
      totalsByHour.set(hour, total);
    }

    const labels = sortedHours.map(ts => {
      const date = new Date(ts * 1000);
      if (timeRange === '7days' || timeRange === '31days') {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const sortedImpls = [...allImpls].sort();
    const series: SeriesData[] = sortedImpls.map((impl, i) => ({
      name: impl,
      data: sortedHours.map(hour => {
        const count = byHourAndImpl.get(hour)?.get(impl) ?? 0;
        const total = totalsByHour.get(hour) ?? 0;
        return total > 0 ? Number(((count / total) * 100).toFixed(2)) : null;
      }),
      color: getExecutionClientColor(impl, i),
      seriesType: 'bar' as const,
      stack: 'winrate',
    }));

    const totalsByImpl = new Map<string, number>();
    for (const r of hourlyRecords) {
      const impl = normalizeClient(r.meta_execution_implementation ?? '');
      if (!impl) continue;
      totalsByImpl.set(impl, (totalsByImpl.get(impl) ?? 0) + (r.win_count ?? 0));
    }

    return { chartConfig: { labels, series }, standings: buildStandings(totalsByImpl, allClients) };
  }, [hourlyRecords, perSlotRecords, allClients, timeRange, showPerSlot]);

  if (!chartConfig && standings.length === 0) return null;

  const totalSlots = standings.reduce((s, st) => s + st.totalWins, 0);
  const maxWinRate = standings.length > 0 ? standings[0].winRate : 0;

  return (
    <PopoutCard
      title="Execution Winrate"
      subtitle="Which execution client had the fastest engine_newPayload per slot"
      anchorId="winrate"
      modalSize="full"
    >
      {({ inModal }) => (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Chart — fills available space */}
          <div className="min-w-0 flex-1">
            {chartConfig ? (
              <MultiLineChart
                series={chartConfig.series}
                xAxis={{ type: 'category', labels: chartConfig.labels, name: 'Time' }}
                yAxis={{ name: 'Win Rate (%)', min: 0, max: 100 }}
                height={inModal ? 600 : 350}
                showLegend
                enableDataZoom
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted">
                Waiting for winrate data...
              </div>
            )}
          </div>

          {/* Standings */}
          <div className="w-full shrink-0 lg:w-80">
            <div className="flex flex-col gap-2">
              {standings.map(standing => {
                const medal = MEDAL_CONFIG[standing.rank];
                const isLeader = standing.rank === 1;
                const isTopThree = standing.rank <= 3;
                const barWidth = maxWinRate > 0 ? (standing.winRate / maxWinRate) * 100 : 0;

                return (
                  <div
                    key={standing.implementation}
                    className={clsx(
                      'relative overflow-hidden',
                      isLeader ? 'rounded-sm border px-4 py-4' : 'rounded-xs px-3 py-2',
                      isLeader ? 'border-amber-400/30' : '',
                      !isLeader && isTopThree && medal ? medal.bg : '',
                      !isTopThree ? 'bg-surface/20' : ''
                    )}
                    style={
                      isLeader
                        ? {
                            background: `linear-gradient(135deg, ${standing.color}05 0%, ${standing.color}12 50%, ${standing.color}05 100%)`,
                          }
                        : undefined
                    }
                  >
                    {/* Proportional fill bar */}
                    <div
                      className={clsx('absolute inset-y-0 left-0', isLeader ? 'rounded-sm' : 'rounded-xs')}
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: standing.color,
                        opacity: isLeader ? 0.12 : isTopThree ? 0.1 : 0.06,
                      }}
                    />

                    {/* Left accent bar for top 3 */}
                    {isTopThree && (
                      <div
                        className={clsx('absolute inset-y-0 left-0', isLeader ? 'w-1' : 'w-0.5')}
                        style={{ backgroundColor: standing.color, opacity: isLeader ? 0.8 : 0.5 }}
                      />
                    )}

                    <div className="relative flex items-center gap-3">
                      {/* Medal / Rank */}
                      <span
                        className={clsx(
                          'shrink-0 text-center',
                          isLeader
                            ? 'w-9 text-4xl leading-none'
                            : isTopThree
                              ? 'w-8 text-3xl leading-none'
                              : 'w-5 text-sm/5'
                        )}
                      >
                        {isTopThree && medal ? (
                          medal.emoji
                        ) : (
                          <span className="text-xs/5 font-bold text-muted/50 tabular-nums">{standing.rank}</span>
                        )}
                      </span>

                      {/* Logo */}
                      <ClientLogo
                        client={standing.implementation}
                        size={isLeader ? 36 : isTopThree ? 24 : 18}
                        className={clsx('shrink-0', !isTopThree && 'opacity-40')}
                      />

                      {/* Name + wins */}
                      <div className="min-w-0 flex-1">
                        <div
                          className={clsx(
                            'truncate font-semibold',
                            isLeader
                              ? 'text-base/5 text-foreground'
                              : isTopThree
                                ? 'text-sm/5 text-foreground'
                                : 'text-xs/5 text-muted'
                          )}
                        >
                          {standing.implementation}
                        </div>
                        {isTopThree && (
                          <div className="text-[10px]/4 text-muted/60">{standing.totalWins.toLocaleString()} wins</div>
                        )}
                      </div>

                      {/* Win rate */}
                      <span
                        className={clsx(
                          'shrink-0 font-black tracking-tight tabular-nums',
                          isLeader ? 'text-2xl/7 text-foreground' : '',
                          !isLeader && isTopThree && medal ? `text-lg/6 ${medal.text}` : '',
                          !isTopThree ? 'text-sm/5 font-bold text-muted/70' : ''
                        )}
                      >
                        {standing.winRate > 0 ? `${standing.winRate}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Slot count */}
            {totalSlots > 0 && (
              <div className="mt-3 text-center text-[10px] text-muted/40 tabular-nums">
                {totalSlots.toLocaleString()} slots analyzed
              </div>
            )}
          </div>
        </div>
      )}
    </PopoutCard>
  );
}

/** Medal styling per position (gold / silver / bronze) */
const MEDAL_CONFIG: Record<number, { bg: string; text: string; emoji: string }> = {
  1: { bg: 'bg-amber-400/10', text: 'text-amber-400', emoji: '🥇' },
  2: { bg: 'bg-neutral-300/8', text: 'text-neutral-300', emoji: '🥈' },
  3: { bg: 'bg-amber-600/8', text: 'text-amber-500', emoji: '🥉' },
};
