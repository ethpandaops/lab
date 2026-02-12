import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData, MarkLineConfig } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { FctNodeCpuUtilization } from '@/api/types.gen';
import type { CpuMetric } from './NodeResourcesPanel';
import type { AnnotationType, AnnotationEvent } from './types';

const CL_CLIENTS = new Set(['lighthouse', 'lodestar', 'nimbus', 'prysm', 'teku', 'grandine']);
const EL_CLIENTS = new Set(['besu', 'erigon', 'geth', 'nethermind', 'reth']);

function getClientLayer(clientType: string): 'CL' | 'EL' | null {
  const lower = clientType.toLowerCase();
  if (CL_CLIENTS.has(lower)) return 'CL';
  if (EL_CLIENTS.has(lower)) return 'EL';
  return null;
}

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

const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  block: '#f59e0b',
  head: '#8b5cf6',
  execution: '#ef4444',
  data_columns: '#10b981',
};

const ANNOTATION_LABELS: Record<AnnotationType, string> = {
  block: 'Block',
  head: 'Head',
  execution: 'Exec',
  data_columns: 'DA',
};

interface BucketAgg {
  meanVals: number[];
  minVals: number[];
  maxVals: number[];
  coreVals: number[];
}

interface CpuUtilizationChartProps {
  data: FctNodeCpuUtilization[];
  selectedNode: string | null;
  metric: CpuMetric;
  slot: number;
  annotations: AnnotationEvent[];
  enabledAnnotations: Set<AnnotationType>;
}

const BUCKET_SIZE = 0.25;
const toBucket = (offsetSec: number): number => Math.round(offsetSec / BUCKET_SIZE) * BUCKET_SIZE;
const avg = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;

export function CpuUtilizationChart({
  data,
  selectedNode,
  metric,
  slot,
  annotations,
  enabledAnnotations,
}: CpuUtilizationChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, markLines, clClient, elClient } = useMemo(() => {
    if (data.length === 0) {
      return { series: [] as SeriesData[], markLines: [] as MarkLineConfig[], clClient: '', elClient: '' };
    }

    const slotStartUs = Math.min(...data.map(d => d.wallclock_slot_start_date_time ?? 0).filter(v => v > 0));
    const chartSeries: SeriesData[] = [];
    let resolvedClClient = '';
    let resolvedElClient = '';

    const bucketData = (items: FctNodeCpuUtilization[]): Map<number, BucketAgg> => {
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
      Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([t, b]) => [t, avg(extract(b))] as [number, number]);

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

      // CL mean line with gradient fill
      chartSeries.push({
        name: clLabel,
        data: toPoints(clBuckets, b => b.meanVals),
        color: clColor,
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
      });

      // EL mean line with gradient fill
      chartSeries.push({
        name: elLabel,
        data: toPoints(elBuckets, b => b.meanVals),
        color: elColor,
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
      });

      // Peak core (hidden by default)
      chartSeries.push({
        name: `${clLabel} peak core`,
        data: toPoints(clBuckets, b => b.coreVals),
        color: clColor,
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        initiallyVisible: false,
      });
      chartSeries.push({
        name: `${elLabel} peak core`,
        data: toPoints(elBuckets, b => b.coreVals),
        color: elColor,
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        initiallyVisible: false,
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
      });

      chartSeries.push({
        name: 'Execution Layer',
        data: toPoints(elBuckets, metricExtract),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
      });
    }

    // Build annotation markLines
    const chartMarkLines: MarkLineConfig[] = [];

    for (const anno of annotations) {
      if (!enabledAnnotations.has(anno.type)) continue;

      const timeSec = anno.timeMs / 1000;
      if (timeSec < 0 || timeSec > 12) continue;

      const color = ANNOTATION_COLORS[anno.type];
      const prefix = ANNOTATION_LABELS[anno.type];
      const label = anno.label ? `${prefix}: ${anno.label}` : prefix;

      if (anno.endMs != null) {
        // Range annotation: show start and end markLines
        const endSec = anno.endMs / 1000;
        if (endSec >= 0 && endSec <= 12) {
          chartMarkLines.push({
            xValue: timeSec,
            label: `${label} start`,
            color,
            lineStyle: 'dashed',
            lineWidth: 1,
          });
          chartMarkLines.push({
            xValue: endSec,
            label: `${label} end`,
            color,
            lineStyle: 'dashed',
            lineWidth: 1,
          });
        }
      } else {
        chartMarkLines.push({
          xValue: timeSec,
          label,
          color,
          lineStyle: 'dashed',
          lineWidth: 1,
        });
      }
    }

    return { series: chartSeries, markLines: chartMarkLines, clClient: resolvedClClient, elClient: resolvedElClient };
  }, [data, selectedNode, metric, CHART_CATEGORICAL_COLORS, annotations, enabledAnnotations]);

  const nodeCount = new Set(data.map(d => d.meta_client_name)).size;
  const shortNodeName = selectedNode?.split('/').pop() ?? '';

  const subtitle = selectedNode
    ? `Slot ${slot} · ${shortNodeName} · % of all CPU cores`
    : `Slot ${slot} · ${METRIC_LABELS[metric]} across ${nodeCount} nodes · % of all CPU cores`;

  const headerActions =
    selectedNode && (clClient || elClient) ? (
      <div className="flex items-center gap-1">
        {clClient && <ClientLogo client={clClient} size={24} />}
        {elClient && <ClientLogo client={elClient} size={24} />}
      </div>
    ) : undefined;

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
          syncGroup="slot-time"
          tooltipFormatter={(params: unknown) => {
            const items = Array.isArray(params) ? params : [params];
            if (items.length === 0) return '';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const first = items[0] as any;
            const xVal = Array.isArray(first.value) ? first.value[0] : first.axisValue;
            const timeStr = typeof xVal === 'number' ? `${xVal.toFixed(2)}s` : `${xVal}s`;

            let html = `<div style="font-size:12px;min-width:160px">`;
            html += `<div style="margin-bottom:4px;font-weight:600;color:var(--color-foreground)">${timeStr}</div>`;

            for (const item of items) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = item as any;
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
