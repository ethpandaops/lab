import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData, MarkAreaConfig, MarkLineConfig } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors, getClientLayer } from '@/utils';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import type { FctNodeCpuUtilizationByProcess } from '@/api/types.gen';
import { ANNOTATION_COLORS, type CpuMetric, type AnnotationType, type AnnotationEvent } from './types';

function usToSeconds(us: number): number {
  return us / 1_000_000;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeToSystem(value: number, cores: number): number {
  const divisor = cores > 0 ? cores : 1;
  return value / divisor;
}

const METRIC_LABELS: Record<CpuMetric, string> = {
  mean: 'Mean',
  min: 'Min',
  max: 'Max',
};

const METRIC_OPTIONS = [
  { value: 'mean' as CpuMetric, label: 'Mean' },
  { value: 'min' as CpuMetric, label: 'Min' },
  { value: 'max' as CpuMetric, label: 'Max' },
];

/** Minimum width in seconds for point-event areas so they're visible */
const MIN_AREA_WIDTH_SEC = 0.08;

/** Match a CPU node name to propagation node_id (fuzzy matching) */
function nodeMatches(cpuNodeName: string, propNodeId: string): boolean {
  const short = cpuNodeName.split('/').pop() ?? cpuNodeName;
  return propNodeId === short || propNodeId === cpuNodeName || short.includes(propNodeId) || propNodeId.includes(short);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

interface BucketAgg {
  meanVals: number[];
  minVals: number[];
  maxVals: number[];
  coreVals: number[];
}

interface CpuUtilizationChartProps {
  data: FctNodeCpuUtilizationByProcess[];
  selectedNode: string | null;
  metric: CpuMetric;
  onMetricChange: (metric: CpuMetric) => void;
  slot: number;
  annotations: AnnotationEvent[];
  enabledAnnotations: Set<AnnotationType>;
}

/** Slot phase boundary colors: cyan (block), green (attestation), amber (aggregation) */
const PHASE_BOUNDARY_COLORS = ['#22d3ee', '#22c55e', '#f59e0b'];

interface EChartsTooltipParam {
  marker: string;
  seriesName: string;
  value: [number, number] | number;
  axisValue?: number | string;
}

const BUCKET_SIZE = 0.25;
const ALL_BUCKETS = Array.from({ length: 49 }, (_, i) => i * BUCKET_SIZE);
const toBucket = (offsetSec: number): number => Math.round(offsetSec / BUCKET_SIZE) * BUCKET_SIZE;
const avg = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;

export function CpuUtilizationChart({
  data,
  selectedNode,
  metric,
  onMetricChange,
  slot,
  annotations,
  enabledAnnotations,
}: CpuUtilizationChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, clClient, elClient } = useMemo(() => {
    if (data.length === 0) {
      return { series: [] as SeriesData[], clClient: '', elClient: '' };
    }

    const slotStartUs = Math.min(...data.map(d => d.wallclock_slot_start_date_time ?? 0).filter(v => v > 0));
    const chartSeries: SeriesData[] = [];
    let resolvedClClient = '';
    let resolvedElClient = '';

    const bucketData = (items: FctNodeCpuUtilizationByProcess[]): Map<number, BucketAgg> => {
      const buckets = new Map<number, BucketAgg>();
      for (const d of items) {
        const offset = usToSeconds((d.window_start ?? 0) - slotStartUs);
        const bucket = toBucket(offset);
        if (bucket < 0 || bucket > 12) continue;

        if (!buckets.has(bucket)) {
          buckets.set(bucket, { meanVals: [], minVals: [], maxVals: [], coreVals: [] });
        }
        const b = buckets.get(bucket)!;
        const cores = d.system_cores ?? 1;
        b.meanVals.push(normalizeToSystem(d.mean_core_pct ?? 0, cores));
        b.minVals.push(normalizeToSystem(d.min_core_pct ?? 0, cores));
        b.maxVals.push(normalizeToSystem(d.max_core_pct ?? 0, cores));
        b.coreVals.push(Math.min(d.max_core_pct ?? 0, 100));
      }
      return buckets;
    };

    const toPoints = (buckets: Map<number, BucketAgg>, extract: (b: BucketAgg) => number[]): [number, number][] =>
      ALL_BUCKETS.map(t => [t, buckets.has(t) ? avg(extract(buckets.get(t)!)) : 0] as [number, number]);

    const metricExtract = (b: BucketAgg): number[] => {
      switch (metric) {
        case 'min':
          return b.minVals;
        case 'max':
          return b.maxVals;
        case 'mean':
        default:
          return b.meanVals;
      }
    };

    if (selectedNode) {
      const nodeData = data.filter(d => d.meta_client_name === selectedNode);
      const clData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      resolvedClClient = clData[0]?.client_type ?? '';
      resolvedElClient = elData[0]?.client_type ?? '';

      const clLabel = capitalize(resolvedClClient || 'CL');
      const elLabel = capitalize(resolvedElClient || 'EL');
      const clColor = CHART_CATEGORICAL_COLORS[0];
      const elColor = CHART_CATEGORICAL_COLORS[1];

      const clBuckets = bucketData(clData);
      const elBuckets = bucketData(elData);

      chartSeries.push({
        name: clLabel,
        data: toPoints(clBuckets, b => b.meanVals),
        color: clColor,
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });

      chartSeries.push({
        name: elLabel,
        data: toPoints(elBuckets, b => b.meanVals),
        color: elColor,
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });

      chartSeries.push({
        name: `${clLabel} peak core`,
        data: toPoints(clBuckets, b => b.coreVals),
        color: clColor,
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        initiallyVisible: false,
        smooth: 0.4,
      });
      chartSeries.push({
        name: `${elLabel} peak core`,
        data: toPoints(elBuckets, b => b.coreVals),
        color: elColor,
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        initiallyVisible: false,
        smooth: 0.4,
      });
    } else {
      const clData = data.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = data.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      const clBuckets = bucketData(clData);
      const elBuckets = bucketData(elData);

      chartSeries.push({
        name: 'Consensus Layer',
        data: toPoints(clBuckets, metricExtract),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });

      chartSeries.push({
        name: 'Execution Layer',
        data: toPoints(elBuckets, metricExtract),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });
    }

    return { series: chartSeries, clClient: resolvedClClient, elClient: resolvedElClient };
  }, [data, selectedNode, metric, CHART_CATEGORICAL_COLORS]);

  // Convert annotations to markAreas (chart handles node matching + aggregation)
  const markAreas = useMemo((): MarkAreaConfig[] => {
    const areas: MarkAreaConfig[] = [];

    if (selectedNode) {
      // Single node: find matching events and render exact positions
      for (const anno of annotations) {
        if (!enabledAnnotations.has(anno.type)) continue;
        if (!anno.nodeName || !nodeMatches(selectedNode, anno.nodeName)) continue;

        const startSec = anno.timeMs / 1000;
        if (startSec < 0 || startSec > 12) continue;
        const color = ANNOTATION_COLORS[anno.type];
        const hasRange = anno.endMs != null && Math.abs(anno.endMs - anno.timeMs) > 10;

        if (hasRange) {
          const endSec = Math.min(anno.endMs! / 1000, 12);
          areas.push({ xStart: startSec, xEnd: endSec, color, opacity: 0.12 });
        } else {
          areas.push({
            xStart: startSec - MIN_AREA_WIDTH_SEC / 2,
            xEnd: startSec + MIN_AREA_WIDTH_SEC / 2,
            color,
            opacity: 0.3,
          });
        }
      }
    } else {
      // Aggregate: compute min–p95 range per annotation type
      const byType = new Map<AnnotationType, AnnotationEvent[]>();
      for (const anno of annotations) {
        if (!enabledAnnotations.has(anno.type)) continue;
        if (!byType.has(anno.type)) byType.set(anno.type, []);
        byType.get(anno.type)!.push(anno);
      }

      for (const [type, events] of byType) {
        const color = ANNOTATION_COLORS[type];
        const hasRanges = events.some(e => e.endMs != null);

        if (hasRanges) {
          // Range events (execution, data_columns): min of starts → p95 of ends
          const starts = events.map(e => e.timeMs).sort((a, b) => a - b);
          const ends = events.map(e => e.endMs ?? e.timeMs).sort((a, b) => a - b);
          const startSec = starts[0] / 1000;
          const endSec = percentile(ends, 0.95) / 1000;
          if (startSec >= 0 && startSec <= 12) {
            areas.push({
              xStart: Math.max(0, startSec),
              xEnd: Math.min(12, endSec),
              color,
              opacity: 0.1,
            });
          }
        } else {
          // Point events (block, head): min–p95 spread as area
          const times = events.map(e => e.timeMs).sort((a, b) => a - b);
          const minSec = times[0] / 1000;
          const p95Sec = percentile(times, 0.95) / 1000;
          if (minSec >= 0 && p95Sec <= 12) {
            const width = p95Sec - minSec;
            if (width < MIN_AREA_WIDTH_SEC) {
              // Very tight spread: render as thin band at median
              const medSec = percentile(times, 0.5) / 1000;
              areas.push({
                xStart: medSec - MIN_AREA_WIDTH_SEC / 2,
                xEnd: medSec + MIN_AREA_WIDTH_SEC / 2,
                color,
                opacity: 0.25,
              });
            } else {
              areas.push({ xStart: minSec, xEnd: p95Sec, color, opacity: 0.1 });
            }
          }
        }
      }
    }

    return areas;
  }, [annotations, enabledAnnotations, selectedNode]);

  const markLines = useMemo((): MarkLineConfig[] => {
    if (!enabledAnnotations.has('slot_phases')) return [];

    const lines: MarkLineConfig[] = [];
    let cumulativeSec = 0;

    for (let i = 0; i < DEFAULT_BEACON_SLOT_PHASES.length - 1; i++) {
      cumulativeSec += DEFAULT_BEACON_SLOT_PHASES[i].duration / 1000;
      const nextPhase = DEFAULT_BEACON_SLOT_PHASES[i + 1];
      const color = PHASE_BOUNDARY_COLORS[i + 1] ?? '#6b7280';

      lines.push({
        xValue: cumulativeSec,
        label: nextPhase.label,
        labelPosition: 'insideEndTop',
        color,
        lineStyle: 'dotted',
        lineWidth: 1,
        distance: [0, -8],
      });
    }

    return lines;
  }, [enabledAnnotations]);

  const nodeCount = new Set(data.map(d => d.meta_client_name)).size;
  const shortNodeName = selectedNode?.split('/').pop() ?? '';

  const subtitle = selectedNode
    ? `Slot ${slot} · ${shortNodeName} · % of all CPU cores`
    : `Slot ${slot} · ${METRIC_LABELS[metric]} across ${nodeCount} nodes · % of all CPU cores`;

  const headerActions = selectedNode ? (
    clClient || elClient ? (
      <div className="flex items-center gap-1">
        {clClient && <ClientLogo client={clClient} size={24} />}
        {elClient && <ClientLogo client={elClient} size={24} />}
      </div>
    ) : undefined
  ) : (
    <SelectMenu value={metric} onChange={onMetricChange} options={METRIC_OPTIONS} expandToFit />
  );

  if (data.length === 0) {
    return (
      <PopoutCard title="CPU Utilization" subtitle="No data available" modalSize="xl">
        {({ inModal }) => (
          <div className={inModal ? 'min-h-80' : 'h-64'}>
            <div className="flex h-full items-center justify-center">
              <p className="text-muted">No CPU utilization data available for this slot</p>
            </div>
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title="CPU Utilization" subtitle={subtitle} headerActions={headerActions} modalSize="xl">
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: 'Slot Time (s)',
            min: 0,
            max: 12,
            formatter: (v: number | string) => `${v}s`,
          }}
          yAxis={{
            name: '% of all cores',
            min: 0,
            formatter: (v: number) => `${v.toFixed(1)}%`,
          }}
          height={inModal ? 500 : 350}
          showLegend
          legendPosition="bottom"
          markLines={markLines}
          markAreas={markAreas}
          syncGroup="slot-time"
          tooltipFormatter={(params: unknown) => {
            const items = (Array.isArray(params) ? params : [params]) as EChartsTooltipParam[];
            if (items.length === 0) return '';

            const first = items[0];
            const xVal = Array.isArray(first.value) ? first.value[0] : first.axisValue;
            const timeStr = typeof xVal === 'number' ? `${xVal.toFixed(2)}s` : `${xVal}s`;

            let html = `<div style="font-size:12px;min-width:160px">`;
            html += `<div style="margin-bottom:4px;font-weight:600;color:var(--color-foreground)">${timeStr}</div>`;

            for (const p of items) {
              const val = Array.isArray(p.value) ? p.value[1] : p.value;
              if (val == null) continue;
              html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">`;
              html += `${p.marker}`;
              html += `<span style="flex:1">${p.seriesName}</span>`;
              html += `<span style="font-weight:600">${Number(val).toFixed(1)}%</span>`;
              html += `</div>`;
            }

            html += `</div>`;
            return html;
          }}
        />
      )}
    </PopoutCard>
  );
}
