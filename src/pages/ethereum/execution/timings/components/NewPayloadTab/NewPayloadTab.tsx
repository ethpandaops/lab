import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type { JSX } from 'react';
import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { EIP7870SpecsBanner } from '@/components/Ethereum/EIP7870SpecsBanner';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { BarChart } from '@/components/Charts/Bar';
import { clientLogoHtml } from '@/components/Charts/chartChrome';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot, getExecutionClientColor, normalizeClientName } from '@/utils';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type {
  FctEngineNewPayloadByElClientHourly,
  FctEngineNewPayloadByElClientDaily,
  FctEngineNewPayloadWinrateHourly,
  FctEngineNewPayloadWinrateDaily,
  IntEngineNewPayloadFastestExecutionByNodeClass,
} from '@/api/types.gen';
import type { EngineTimingsData } from '@/pages/ethereum/execution/timings/hooks/useEngineTimingsData';
import {
  PER_SLOT_CHART_RANGES,
  HOURLY_CHART_RANGES,
  TIME_RANGE_CONFIG,
  type TimeRange,
} from '@/pages/ethereum/execution/timings/IndexPage.types';
import { ClientVersionBreakdown } from '@/pages/ethereum/execution/timings/components/ClientVersionBreakdown';

export interface NewPayloadTabProps {
  data: EngineTimingsData;
  timeRange: TimeRange;
}

/** node_class of the ethPandaOps reference fleet; every other node has an empty node_class */
const REFERENCE_NODE_CLASS = 'eip7870-block-builder';

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
 * NewPayload tab showing detailed engine_newPayload timing analysis
 */
export function NewPayloadTab({ data, timeRange }: NewPayloadTabProps): JSX.Element {
  const themeColors = useThemeColors();
  const {
    newPayloadDurationHistogram,
    newPayloadPercentiles,
    newPayloadByElClient,
    newPayloadByElClientHourly,
    newPayloadByElClientDaily,
    winrateHourly,
    winrateDaily,
    winratePerSlot,
  } = data;

  // Check if we should show per-slot charts (only for short time ranges)
  const showPerSlotCharts = PER_SLOT_CHART_RANGES.includes(timeRange);

  // Long ranges (90d+) only fetch the daily tables, so trends there have one point per day
  const showHourlyCharts = HOURLY_CHART_RANGES.includes(timeRange);
  const rangeConfig = TIME_RANGE_CONFIG[timeRange];
  const rangeSuffix = rangeConfig.seconds === null ? '' : `, ${rangeConfig.label.toLowerCase()}`;

  // Per-client/version rows covering the whole range (hourly up to 31d, daily beyond)
  const summaryRows: (FctEngineNewPayloadByElClientHourly | FctEngineNewPayloadByElClientDaily)[] = showHourlyCharts
    ? newPayloadByElClientHourly
    : newPayloadByElClientDaily;

  // Filter to VALID status only for duration-based charts
  const validPayloadByElClient = newPayloadByElClient.filter(r => r.status?.toUpperCase() === 'VALID');

  // Hourly data is already filtered to VALID status in the SQL query (via quantileIf)
  // so we can use it directly for the summary table

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

  // Calculate status breakdown from the hourly/daily rows covering the whole range
  const statusTotals = summaryRows.reduce(
    (acc, row) => ({
      valid: acc.valid + (row.valid_count ?? 0),
      invalid: acc.invalid + (row.invalid_count ?? 0),
      syncing: acc.syncing + (row.syncing_count ?? 0),
      accepted: acc.accepted + (row.accepted_count ?? 0),
    }),
    { valid: 0, invalid: 0, syncing: 0, accepted: 0 }
  );

  const statusLabels = ['VALID', 'INVALID', 'SYNCING', 'ACCEPTED'];
  // Use BarDataItem with per-bar colors
  const statusData = [
    { value: statusTotals.valid, color: themeColors.success },
    { value: statusTotals.invalid, color: themeColors.danger },
    { value: statusTotals.syncing, color: themeColors.warning },
    { value: statusTotals.accepted, color: themeColors.muted },
  ];

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
  // Group data by client, then by slot (VALID status only)
  const clientSlotData = new Map<string, Map<number, number>>();

  validPayloadByElClient.forEach(item => {
    const client = normalizeClientName(item.meta_execution_implementation ?? 'unknown');
    const slot = item.slot ?? 0;
    const duration = item.median_duration_ms ?? 0;

    if (!clientSlotData.has(client)) {
      clientSlotData.set(client, new Map());
    }
    clientSlotData.get(client)!.set(slot, duration);
  });

  // Create series for the per-slot by-client chart
  const slotDurationByClientSeries = elClientList.map((client, index) => {
    const slotMap = clientSlotData.get(client) ?? new Map();
    const sortedSlots = Array.from(slotMap.entries()).sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: sortedSlots.map(([slot, duration]) => [slot, duration] as [number, number]),
      color: getExecutionClientColor(client, index),
    };
  });

  // === Trend Series (for longer time ranges) ===
  // Group hourly/daily data by client and bucket, aggregating across versions with weighted average
  const trendClientData = new Map<
    string,
    Map<number, { totalP50: number; totalP95: number; totalGasUsed: number; totalObs: number }>
  >();
  const trendClients = new Set<string>();

  summaryRows.forEach(row => {
    const client = normalizeClientName(row.meta_execution_implementation ?? 'unknown');
    trendClients.add(client);

    const timestampMs = bucketStartMs(row);
    const p50 = row.p50_duration_ms ?? 0;
    const p95 = row.p95_duration_ms ?? 0;
    const gasUsed = row.avg_gas_used ?? 0;
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

  // === Valid Rate Trend Series (for longer time ranges) ===
  // Calculate valid rate per client per hour (per day for 90d+)
  const validRateClientData = new Map<string, Map<number, { validCount: number; totalCount: number }>>();

  summaryRows.forEach(row => {
    const client = normalizeClientName(row.meta_execution_implementation ?? 'unknown');
    const timestampMs = bucketStartMs(row);
    const validCount = row.valid_count ?? 0;
    const totalCount = row.observation_count ?? 0;

    if (timestampMs > 0 && totalCount > 0) {
      if (!validRateClientData.has(client)) {
        validRateClientData.set(client, new Map());
      }
      const clientHours = validRateClientData.get(client)!;

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

  const validRateTrendSeries = trendClientList.map((client, index) => {
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

  // Find max median duration for color scaling
  let maxMedianDuration = 0;
  elClientMetrics.forEach(metrics => {
    if (metrics.medianDuration > maxMedianDuration) {
      maxMedianDuration = metrics.medianDuration;
    }
  });

  const hasClientData = elClientList.length > 0;

  // Compute winrate from raw per-slot data when the dedicated winrate table is empty
  // For 1h/6h views, the int_engine_new_payload_fastest table may not have data,
  // so we derive the fastest client per slot from the already-fetched per-slot data
  const computedWinratePerSlot = useMemo(() => {
    if (winratePerSlot.length > 0 || !showPerSlotCharts || validPayloadByElClient.length === 0) {
      return winratePerSlot;
    }

    // Aggregate by (slot, node class, client) → weighted average duration
    const slotClientAgg = new Map<
      string,
      {
        slot: number;
        nodeClass: string;
        client: string;
        totalDurObs: number;
        totalObs: number;
        timestamp: number;
      }
    >();

    for (const r of validPayloadByElClient) {
      const slot = r.slot ?? 0;
      const nodeClass = r.node_class ?? '';
      const client = normalizeClientName(r.meta_execution_implementation ?? '');
      const duration = r.avg_duration_ms ?? 0;
      const obs = r.observation_count ?? 0;
      const timestamp = r.slot_start_date_time ?? 0;
      if (!slot || !client || !obs || !duration) continue;

      const key = `${slot}|${nodeClass}|${client}`;
      const existing = slotClientAgg.get(key);
      if (existing) {
        existing.totalDurObs += duration * obs;
        existing.totalObs += obs;
      } else {
        slotClientAgg.set(key, { slot, nodeClass, client, totalDurObs: duration * obs, totalObs: obs, timestamp });
      }
    }

    // For each slot and node class, find the client with the lowest weighted average duration
    const slotWinner = new Map<
      string,
      { slot: number; nodeClass: string; client: string; avgDuration: number; timestamp: number }
    >();

    for (const agg of slotClientAgg.values()) {
      const avgDuration = agg.totalDurObs / agg.totalObs;
      const key = `${agg.slot}|${agg.nodeClass}`;
      const existing = slotWinner.get(key);
      if (!existing || avgDuration < existing.avgDuration) {
        slotWinner.set(key, { ...agg, avgDuration });
      }
    }

    return Array.from(slotWinner.values()).map(data => ({
      slot: data.slot,
      slot_start_date_time: data.timestamp,
      node_class: data.nodeClass,
      meta_execution_implementation: data.client,
    }));
  }, [winratePerSlot, showPerSlotCharts, validPayloadByElClient]);

  // A slot has one winner per node class, so each class gets its own winrate
  const winrateByClass = useMemo(() => {
    type ClassRecords = {
      hourly: FctEngineNewPayloadWinrateHourly[];
      daily: FctEngineNewPayloadWinrateDaily[];
      perSlot: IntEngineNewPayloadFastestExecutionByNodeClass[];
    };
    const groups = new Map<string, ClassRecords>();
    const group = (nodeClass: string | undefined): ClassRecords => {
      const key = nodeClass ?? '';
      if (!groups.has(key)) groups.set(key, { hourly: [], daily: [], perSlot: [] });
      return groups.get(key)!;
    };

    if (showPerSlotCharts) computedWinratePerSlot.forEach(r => group(r.node_class).perSlot.push(r));
    else if (showHourlyCharts) winrateHourly.forEach(r => group(r.node_class).hourly.push(r));
    else winrateDaily.forEach(r => group(r.node_class).daily.push(r));

    if (groups.size === 0) group(REFERENCE_NODE_CLASS);

    return [...groups.entries()].sort(
      ([a], [b]) => Number(b === REFERENCE_NODE_CLASS) - Number(a === REFERENCE_NODE_CLASS)
    );
  }, [showPerSlotCharts, showHourlyCharts, computedWinratePerSlot, winrateHourly, winrateDaily]);

  return (
    <div className="space-y-6">
      <EIP7870SpecsBanner />

      {/* Execution Winrate — fastest client per slot, one section per node class */}
      {winrateByClass.map(([nodeClass, records]) => (
        <WinrateSection
          key={nodeClass}
          nodeClass={nodeClass}
          hourlyRecords={records.hourly}
          dailyRecords={records.daily}
          perSlotRecords={records.perSlot}
          allClients={[...new Set([...trendClientList, ...elClientList])]}
          timeRange={timeRange}
          showPerSlot={showPerSlotCharts}
          showDaily={!showHourlyCharts}
        />
      ))}

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
            hourlyData={summaryRows}
            percentiles={newPayloadPercentiles}
            hideRange
            noCard
          />
        )}
      </PopoutCard>

      {/* Per-slot charts — short time ranges only */}
      {showPerSlotCharts && (
        <div>
          <PopoutCard
            title="Per-Slot Duration by Client"
            subtitle="Median duration for each slot"
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
                <div className="flex h-75 items-center justify-center text-muted">No slot data available</div>
              )
            }
          </PopoutCard>
        </div>
      )}

      {/* Hourly (daily for 90d+) charts — longer time ranges */}
      {!showPerSlotCharts && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {trendP50Series.length > 0 && trendP50Series.some(s => s.data.length > 0) && (
            <PopoutCard
              title={`${showHourlyCharts ? 'Hourly' : 'Daily'} ${selectedPercentile === 'p50' ? 'P50' : 'P95'} Duration by Client`}
              anchorId="hourly-duration"
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
              {({ inModal }) => (
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
                  height={inModal ? 600 : 300}
                  showLegend
                  enableDataZoom
                  tooltipFormatter={(params: unknown) => {
                    const dataPoints = Array.isArray(params) ? params : [params];
                    if (dataPoints.length === 0) return '';

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
              )}
            </PopoutCard>
          )}

          {validRateTrendSeries.length > 0 && validRateTrendSeries.some(s => s.data.length > 0) && (
            <PopoutCard
              title="Valid Rate Over Time"
              subtitle={`Percentage of VALID responses per ${showHourlyCharts ? 'hour' : 'day'} by client`}
              anchorId="valid-rate"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={validRateTrendSeries}
                  xAxis={{
                    type: 'value',
                    name: 'Time',
                    min: trendMinTime,
                    max: trendMaxTime,
                    formatter: formatTrendAxis,
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
              )}
            </PopoutCard>
          )}
        </div>
      )}

      {/* Duration Histogram and Status Distribution */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PopoutCard
          title="Duration Distribution (50ms buckets)"
          subtitle={`VALID engine_newPayload calls from every Xatu node${rangeSuffix}`}
          anchorId="duration-histogram"
          modalSize="full"
        >
          {({ inModal }) =>
            histogramData.length > 0 ? (
              <BarChart
                data={histogramData}
                labels={histogramLabels}
                showLabel={false}
                color={themeColors.primary}
                height={inModal ? 600 : 300}
              />
            ) : (
              <div className="flex h-75 items-center justify-center text-muted">No histogram data available</div>
            )
          }
        </PopoutCard>

        <PopoutCard
          title="Status Distribution"
          subtitle={`engine_newPayload calls by response status${rangeSuffix}`}
          anchorId="status-distribution"
          modalSize="full"
        >
          {({ inModal }) =>
            statusData.some(d => d.value > 0) ? (
              <BarChart data={statusData} labels={statusLabels} height={inModal ? 600 : 300} orientation="horizontal" />
            ) : (
              <div className="flex h-75 items-center justify-center text-muted">No status data available</div>
            )
          }
        </PopoutCard>
      </div>
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
  let previousWins: number | undefined;
  for (const [idx, standing] of sorted.entries()) {
    if (previousWins !== undefined && standing.totalWins < previousWins) {
      currentRank = idx + 1;
    }
    standing.rank = currentRank;
    previousWins = standing.totalWins;
  }

  return sorted;
}

/** Winrate chart + standings for engine_newPayload fastest client per slot */
function WinrateSection({
  nodeClass,
  hourlyRecords,
  dailyRecords,
  perSlotRecords,
  allClients,
  timeRange,
  showPerSlot,
  showDaily,
}: {
  nodeClass: string;
  hourlyRecords: FctEngineNewPayloadWinrateHourly[];
  dailyRecords: FctEngineNewPayloadWinrateDaily[];
  perSlotRecords: IntEngineNewPayloadFastestExecutionByNodeClass[];
  allClients: string[];
  timeRange: TimeRange;
  showPerSlot: boolean;
  showDaily: boolean;
}): JSX.Element | null {
  const { chartConfig, standings, tooltipLabels } = useMemo(() => {
    if (showPerSlot) {
      // Per-slot mode: each record is a winner for that slot+node_class
      if (!perSlotRecords.length && !allClients.length)
        return { chartConfig: null, standings: [], tooltipLabels: [] as string[] };

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
      const buckets: {
        label: string;
        tooltipLabel: string;
        implCounts: Map<string, number>;
        total: number;
      }[] = [];

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
        const firstSlot = bucketSlots[0];
        const ts = firstSlot === undefined ? 0 : (slotToTimestamp.get(firstSlot) ?? 0);
        const date = new Date(ts * 1000);
        const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const tooltipLabel = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} UTC`;

        buckets.push({ label, tooltipLabel, implCounts, total });
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

      const tooltipLabels = buckets.map(b => b.tooltipLabel);

      return {
        chartConfig: { labels, series },
        standings: buildStandings(totalsByImpl, allClients),
        tooltipLabels,
      };
    }

    // Daily mode (90d+): one bar per day, win_count normalized by that day's total
    // Ties award full credit to each tied client, so totals may exceed slot counts
    if (showDaily) {
      if (!dailyRecords.length && !allClients.length)
        return { chartConfig: null, standings: [], tooltipLabels: [] as string[] };

      const byDayAndImpl = new Map<string, Map<string, number>>();
      const allImpls = new Set<string>();

      for (const r of dailyRecords) {
        const day = r.day_start_date ?? '';
        const impl = normalizeClient(r.meta_execution_implementation ?? '');
        const count = r.win_count ?? 0;
        if (!impl || !day) continue;

        allImpls.add(impl);
        if (!byDayAndImpl.has(day)) byDayAndImpl.set(day, new Map());
        const dayMap = byDayAndImpl.get(day)!;
        dayMap.set(impl, (dayMap.get(impl) ?? 0) + count);
      }

      // YYYY-MM-DD strings sort chronologically
      const sortedDays = [...byDayAndImpl.keys()].sort();
      if (!sortedDays.length) return { chartConfig: null, standings: [] };

      const totalsByDay = new Map<string, number>();
      for (const day of sortedDays) {
        const implMap = byDayAndImpl.get(day)!;
        let total = 0;
        for (const count of implMap.values()) total += count;
        totalsByDay.set(day, total);
      }

      const labels = sortedDays.map(day => {
        const date = new Date(day + 'T00:00:00Z');
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });
      });

      const tooltipLabels = sortedDays.map(day => {
        const date = new Date(day + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      });

      const sortedImpls = [...allImpls].sort();
      const series: SeriesData[] = sortedImpls.map((impl, i) => ({
        name: impl,
        data: sortedDays.map(day => {
          const count = byDayAndImpl.get(day)?.get(impl) ?? 0;
          const total = totalsByDay.get(day) ?? 0;
          return total > 0 ? Number(((count / total) * 100).toFixed(2)) : null;
        }),
        color: getExecutionClientColor(impl, i),
        seriesType: 'bar' as const,
        stack: 'winrate',
      }));

      const totalsByImpl = new Map<string, number>();
      for (const r of dailyRecords) {
        const impl = normalizeClient(r.meta_execution_implementation ?? '');
        if (!impl) continue;
        totalsByImpl.set(impl, (totalsByImpl.get(impl) ?? 0) + (r.win_count ?? 0));
      }

      return {
        chartConfig: { labels, series },
        standings: buildStandings(totalsByImpl, allClients),
        tooltipLabels,
      };
    }

    // Hourly mode (24h / 7d / 31d)
    if (!hourlyRecords.length && !allClients.length)
      return { chartConfig: null, standings: [], tooltipLabels: [] as string[] };

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

    const tooltipLabels = sortedHours.map(ts => {
      const date = new Date(ts * 1000);
      const nextHour = new Date((ts + 3600) * 1000);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      const startTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      });
      const endTime = nextHour.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      });
      return `${dateStr}, ${startTime} – ${endTime} UTC`;
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

    return {
      chartConfig: { labels, series },
      standings: buildStandings(totalsByImpl, allClients),
      tooltipLabels,
    };
  }, [hourlyRecords, dailyRecords, perSlotRecords, allClients, timeRange, showPerSlot, showDaily]);

  // Custom tooltip formatter that shows full timestamps instead of abbreviated axis labels
  const winrateTooltipFormatter = useMemo(() => {
    if (!tooltipLabels || tooltipLabels.length === 0) return undefined;

    return (params: unknown): string => {
      const dataPoints = Array.isArray(params) ? params : [params];
      if (dataPoints.length === 0) return '';

      const firstPoint = dataPoints[0] as { dataIndex?: number };
      const idx = firstPoint?.dataIndex ?? 0;
      const label = tooltipLabels[idx] ?? '';

      let html = `<div style="margin-bottom: 4px; font-weight: 600;">${label}</div>`;

      const sortedPoints = dataPoints
        .map(point => {
          const p = point as { marker?: string; seriesName?: string; value?: number | (number | null)[] };
          const yValue = Array.isArray(p.value) ? p.value[1] : p.value;
          return { ...p, yValue: yValue as number | null };
        })
        .filter(p => p.marker && p.seriesName && p.yValue !== null && p.yValue !== undefined && p.yValue !== 0)
        .sort((a, b) => (b.yValue ?? 0) - (a.yValue ?? 0));

      for (const p of sortedPoints) {
        html += `<div style="display: flex; align-items: center; gap: 8px;">`;
        html += p.marker;
        html += clientLogoHtml(p.seriesName ?? '');
        html += `<span>${p.seriesName}:</span>`;
        html += `<span style="font-weight: 600; margin-left: auto;">${Number(p.yValue).toFixed(1)}%</span>`;
        html += `</div>`;
      }

      return html;
    };
  }, [tooltipLabels]);

  if (!chartConfig && standings.length === 0) return null;

  const totalWins = standings.reduce((s, st) => s + st.totalWins, 0);
  const maxWinRate = standings[0]?.winRate ?? 0;

  return (
    <PopoutCard
      title={
        nodeClass === REFERENCE_NODE_CLASS
          ? 'Execution Winrate: Reference Xatu nodes'
          : 'Execution Winrate: Other Xatu nodes'
      }
      subtitle="Fastest engine_newPayload per slot"
      anchorId={nodeClass === REFERENCE_NODE_CLASS ? 'winrate' : 'winrate-other'}
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
                tooltipFormatter={winrateTooltipFormatter}
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
                      isLeader ? 'border-border' : '',
                      !isLeader && isTopThree && medal ? medal.bg : '',
                      !isTopThree ? 'bg-surface-20' : ''
                    )}
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
                          'shrink-0 text-center font-semibold tabular-nums',
                          isLeader ? 'w-9 text-2xl/8' : isTopThree ? 'w-8 text-xl/7' : 'w-5 text-xs/5',
                          isTopThree && medal ? medal.text : 'text-muted-50'
                        )}
                      >
                        {standing.rank}
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
                          <div className="text-2xs/4 text-muted-60">{standing.totalWins.toLocaleString()} wins</div>
                        )}
                      </div>

                      {/* Win rate */}
                      <span
                        className={clsx(
                          'shrink-0 font-semibold tracking-tight tabular-nums',
                          isLeader ? 'text-2xl/7 text-foreground' : '',
                          !isLeader && isTopThree && medal ? `text-lg/6 ${medal.text}` : '',
                          !isTopThree ? 'text-sm/5 text-muted-70' : ''
                        )}
                      >
                        {standing.winRate > 0 ? `${standing.winRate}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Wins in total; a tie counts for every tied client */}
            {totalWins > 0 && (
              <div className="mt-3 text-center text-2xs text-muted-40 tabular-nums">
                {totalWins.toLocaleString()} wins
              </div>
            )}
          </div>
        </div>
      )}
    </PopoutCard>
  );
}

/** Rank styling for the podium positions (neutral: a rank is not a status) */
const MEDAL_CONFIG: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-muted-10', text: 'text-foreground' },
  2: { bg: 'bg-muted-10', text: 'text-foreground' },
  3: { bg: 'bg-muted-5', text: 'text-foreground' },
};
