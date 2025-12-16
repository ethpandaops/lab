import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { BarChart } from '@/components/Charts/Bar';
import { ScatterAndLineChart } from '@/components/Charts/ScatterAndLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot } from '@/utils';
import type { EngineTimingsData } from '../../hooks/useEngineTimingsData';
import type { TimeRange } from '../../IndexPage.types';
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
  const { newPayloadBySlot, newPayloadDurationHistogram, newPayloadByElClient } = data;

  // Filter to VALID status only for duration-based charts
  const validPayloadByElClient = newPayloadByElClient.filter(r => r.status?.toUpperCase() === 'VALID');

  // State for scatter chart series visibility
  const [visibleScatterSeries, setVisibleScatterSeries] = useState<Set<string>>(new Set());
  const [scatterSeriesInitialized, setScatterSeriesInitialized] = useState(false);

  // Determine which aggregated data source to use based on time range
  const useHourlyData = timeRange === 'hour' || timeRange === 'day';
  const { newPayloadHourly, newPayloadDaily } = data;

  // Calculate summary stats from pre-aggregated hourly/daily data
  // These endpoints provide observation counts and weighted averages already computed server-side
  const aggregatedStats = (() => {
    const sourceData = useHourlyData ? newPayloadHourly : newPayloadDaily;

    if (sourceData.length === 0) {
      return { totalObservations: 0, validRate: '0', avgDuration: '0', avgP95Duration: '0' };
    }

    // Sum up counts from all rows
    let totalObservations = 0;
    let validCount = 0;
    let invalidCount = 0;
    let syncingCount = 0;
    let acceptedCount = 0;
    let invalidBlockHashCount = 0;
    let totalWeightedDuration = 0;
    let totalWeightedP95 = 0;

    sourceData.forEach(row => {
      const obs = row.observation_count ?? 0;
      totalObservations += obs;
      validCount += row.valid_count ?? 0;
      invalidCount += row.invalid_count ?? 0;
      syncingCount += row.syncing_count ?? 0;
      acceptedCount += row.accepted_count ?? 0;
      invalidBlockHashCount += row.invalid_block_hash_count ?? 0;
      // Weight duration averages by observation count
      totalWeightedDuration += (row.avg_duration_ms ?? 0) * obs;
      totalWeightedP95 += (row.avg_p95_duration_ms ?? 0) * obs;
    });

    const totalStatusCount = validCount + invalidCount + syncingCount + acceptedCount + invalidBlockHashCount;
    const validRate = totalStatusCount > 0 ? ((validCount / totalStatusCount) * 100).toFixed(1) : '0';
    const avgDuration = totalObservations > 0 ? (totalWeightedDuration / totalObservations).toFixed(0) : '0';
    const avgP95Duration = totalObservations > 0 ? (totalWeightedP95 / totalObservations).toFixed(0) : '0';

    return { totalObservations, validRate, avgDuration, avgP95Duration };
  })();

  const { totalObservations, validRate, avgDuration, avgP95Duration } = aggregatedStats;

  // Prepare slot data for charts (not stats)
  const slotData = [...newPayloadBySlot].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

  const minSlot = slotData.length > 0 ? (slotData[0].slot ?? 0) : 0;
  const maxSlot = slotData.length > 0 ? (slotData[slotData.length - 1].slot ?? 0) : 0;

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

  // Calculate status breakdown from slot data for the status distribution chart
  const statusTotals = slotData.reduce(
    (acc, item) => {
      const status = item.status?.toUpperCase() ?? 'UNKNOWN';
      const count = item.observation_count ?? 0;
      switch (status) {
        case 'VALID':
          acc.valid += count;
          break;
        case 'INVALID':
          acc.invalid += count;
          break;
        case 'SYNCING':
          acc.syncing += count;
          break;
        case 'ACCEPTED':
          acc.accepted += count;
          break;
        case 'INVALID_BLOCK_HASH':
          acc.invalidBlockHash += count;
          break;
        case 'ERROR':
          acc.error += count;
          break;
      }
      return acc;
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

  // Shared color palette for client charts
  const clientColors = [
    themeColors.primary,
    themeColors.success,
    themeColors.warning,
    themeColors.danger,
    themeColors.accent,
    themeColors.secondary,
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
  // Group data by client, then by slot (VALID status only)
  const clientSlotData = new Map<string, Map<number, number>>();

  validPayloadByElClient.forEach(item => {
    const client = (item.meta_execution_implementation ?? 'unknown').toLowerCase();
    const slot = item.slot ?? 0;
    const duration = item.median_duration_ms ?? 0;

    if (!clientSlotData.has(client)) {
      clientSlotData.set(client, new Map());
    }
    // Use the median duration for this client+slot combination
    clientSlotData.get(client)!.set(slot, duration);
  });

  // Create series for the per-slot by-client chart
  const slotDurationByClientSeries = elClientList.map((client, index) => {
    const slotMap = clientSlotData.get(client) ?? new Map();
    const sortedSlots = Array.from(slotMap.entries()).sort((a, b) => a[0] - b[0]);

    return {
      name: client,
      data: sortedSlots.map(([slot, duration]) => [slot, duration]) as [number, number][],
      color: clientColors[index % clientColors.length],
    };
  });

  // Create scatter series for block complexity - using same client order for consistent colors
  const blockComplexitySeries = elClientList.map((client, index) => ({
    name: client,
    data: clientGasData.get(client) ?? [],
    color: clientColors[index % clientColors.length],
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
      {/* Summary Stats */}
      <Stats
        stats={[
          {
            id: 'observations',
            name: 'Observations',
            value: totalObservations.toLocaleString(),
          },
          {
            id: 'valid-rate',
            name: 'Valid Rate',
            value: `${validRate}%`,
          },
          {
            id: 'avg-duration',
            name: 'Avg Duration',
            value: `${avgDuration} ms`,
          },
          {
            id: 'p95-duration',
            name: 'P95 Duration',
            value: `${avgP95Duration} ms`,
          },
        ]}
      />

      {/* Client Version Breakdown - only VALID status */}
      <ClientVersionBreakdown
        data={validPayloadByElClient}
        title="EL Client Duration"
        description="Median engine_newPayload duration (ms) by execution client and version"
      />

      {/* Per-Slot Duration by Client and Block Complexity - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Per-Slot Duration by Client Chart */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground" id="slot-duration">
              Per-Slot Duration by Client
            </h4>
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

        {/* Block Complexity vs Duration by Client */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground">Block Complexity vs Duration</h4>
            <p className="mb-4 text-sm text-muted">Gas used vs processing time, grouped by execution client</p>
            {hasBlockComplexityData ? (
              <>
                {/* Custom Series Legend - matching MultiLineChart style */}
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
                            className="h-2 w-2 rounded-full"
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
                  height={300}
                  showLegend={false}
                  tooltipFormatter={(params: unknown) => {
                    const p = params as { seriesName: string; data: [number, number] };
                    return `<strong>${p.seriesName}</strong><br/>Gas: ${p.data[0].toFixed(1)}M<br/>Duration: ${p.data[1].toFixed(0)}ms`;
                  }}
                />
              </>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted">No block data available</div>
            )}
          </div>
        </Card>
      </div>

      {/* Duration Histogram and Status Distribution - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Duration Histogram */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground" id="duration-histogram">
              Duration Distribution (50ms buckets)
            </h4>
            <p className="mb-4 text-sm text-muted">Histogram of engine_newPayload call durations</p>
            {histogramData.length > 0 ? (
              <BarChart
                data={histogramData}
                labels={histogramLabels}
                title="Observations"
                color={themeColors.primary}
                height={300}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted">No histogram data available</div>
            )}
          </div>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <div className="p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground">Status Distribution</h4>
            <p className="mb-4 text-sm text-muted">Breakdown of validation status responses</p>
            {statusData.some(d => d.value > 0) ? (
              <BarChart data={statusData} labels={statusLabels} title="Count" height={300} orientation="horizontal" />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted">No status data available</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
