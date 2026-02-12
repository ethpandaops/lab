import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData, MarkLineConfig } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { FctNodeCpuUtilization } from '@/api/types.gen';
import type { CpuMetric } from './NodeResourcesPanel';

const CL_CLIENTS = new Set(['lighthouse', 'lodestar', 'nimbus', 'prysm', 'teku', 'grandine']);
const EL_CLIENTS = new Set(['besu', 'erigon', 'geth', 'nethermind', 'reth']);

function getClientLayer(clientType: string): 'CL' | 'EL' | null {
  const lower = clientType.toLowerCase();
  if (CL_CLIENTS.has(lower)) return 'CL';
  if (EL_CLIENTS.has(lower)) return 'EL';
  return null;
}

/** Convert API microsecond timestamp to seconds */
function usToSeconds(us: number): number {
  return us / 1_000_000;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Normalize a metric value to % of total system CPU */
function normalizeToSystem(value: number, cores: number): number {
  const divisor = cores > 0 ? cores : 1;
  return value / divisor;
}

const METRIC_LABELS: Record<CpuMetric, string> = {
  mean: 'Mean',
  min: 'Min',
  max: 'Max',
};

interface BlockArrival {
  seen_slot_start_diff: number;
  node_id: string;
}

/** Aggregated bucket data for a single time window */
interface BucketAgg {
  meanVals: number[];
  minVals: number[];
  maxVals: number[];
  coreVals: number[];
}

interface CpuUtilizationChartProps {
  data: FctNodeCpuUtilization[];
  selectedNode: string | null;
  blockPropagationData: BlockArrival[];
  metric: CpuMetric;
  slot: number;
}

const BUCKET_SIZE = 0.25;
const toBucket = (offsetSec: number): number => Math.round(offsetSec / BUCKET_SIZE) * BUCKET_SIZE;
const avg = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;

export function CpuUtilizationChart({
  data,
  selectedNode,
  blockPropagationData,
  metric,
  slot,
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

    /** Bucket data points by time offset, collecting all metric values per bucket */
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

    /** Convert bucketed data to sorted [time, value] points */
    const toPoints = (buckets: Map<number, BucketAgg>, extract: (b: BucketAgg) => number[]): [number, number][] =>
      Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([t, b]) => [t, avg(extract(b))] as [number, number]);

    /** Add a band (min-max range) as two stacked series */
    const addBand = (buckets: Map<number, BucketAgg>, stackId: string, color: string): void => {
      const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a - b);
      const basePoints = sorted.map(([t, b]) => [t, avg(b.minVals)] as [number, number]);
      const widthPoints = sorted.map(([t, b]) => {
        const lo = avg(b.minVals);
        const hi = avg(b.maxVals);
        return [t, Math.max(0, hi - lo)] as [number, number];
      });

      chartSeries.push({
        name: `_${stackId}_base`,
        data: basePoints,
        stack: stackId,
        showArea: true,
        areaOpacity: 0,
        lineWidth: 0,
        color,
        visible: false,
      });
      chartSeries.push({
        name: `_${stackId}_width`,
        data: widthPoints,
        stack: stackId,
        showArea: true,
        areaOpacity: 0.12,
        lineWidth: 0,
        color,
        visible: false,
      });
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

      // CL: min-max band, then mean line on top
      addBand(clBuckets, 'cl_range', clColor);
      chartSeries.push({
        name: `${clLabel}`,
        data: toPoints(clBuckets, b => b.meanVals),
        color: clColor,
        lineWidth: 2,
        showArea: false,
      });

      // EL: min-max band, then mean line on top
      addBand(elBuckets, 'el_range', elColor);
      chartSeries.push({
        name: `${elLabel}`,
        data: toPoints(elBuckets, b => b.meanVals),
        color: elColor,
        lineWidth: 2,
        showArea: false,
      });

      // Busiest single core per client
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
      // Aggregate view: CL/EL with selected metric
      const clData = data.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = data.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

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

      const clBuckets = bucketData(clData);
      const elBuckets = bucketData(elData);

      addBand(clBuckets, 'cl_range', CHART_CATEGORICAL_COLORS[0]);
      chartSeries.push({
        name: 'Consensus Layer',
        data: toPoints(clBuckets, metricExtract),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 2,
        showArea: false,
      });

      addBand(elBuckets, 'el_range', CHART_CATEGORICAL_COLORS[1]);
      chartSeries.push({
        name: 'Execution Layer',
        data: toPoints(elBuckets, metricExtract),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 2,
        showArea: false,
      });
    }

    // Block arrival markLines
    const chartMarkLines: MarkLineConfig[] = [];

    if (blockPropagationData.length > 0) {
      if (selectedNode) {
        const shortNodeName = selectedNode.split('/').pop() ?? selectedNode;
        const nodeArrival = blockPropagationData.find(
          p =>
            p.node_id === shortNodeName ||
            p.node_id === selectedNode ||
            shortNodeName.includes(p.node_id) ||
            p.node_id.includes(shortNodeName)
        );
        if (nodeArrival) {
          chartMarkLines.push({
            xValue: nodeArrival.seen_slot_start_diff / 1000,
            label: 'Block Arrival',
            color: 'var(--color-warning)',
            lineStyle: 'dashed',
            lineWidth: 1,
          });
        } else {
          const arrivalTimes = blockPropagationData.map(p => p.seen_slot_start_diff).sort((a, b) => a - b);
          const p50Index = Math.floor(arrivalTimes.length * 0.5);
          chartMarkLines.push({
            xValue: arrivalTimes[p50Index] / 1000,
            label: 'Block p50',
            color: 'var(--color-warning)',
            lineStyle: 'dotted',
            lineWidth: 1,
          });
        }
      } else {
        const arrivalTimes = blockPropagationData.map(p => p.seen_slot_start_diff).sort((a, b) => a - b);
        if (arrivalTimes.length > 0) {
          const p50Index = Math.floor(arrivalTimes.length * 0.5);
          chartMarkLines.push({
            xValue: arrivalTimes[p50Index] / 1000,
            label: 'Block p50',
            color: 'var(--color-warning)',
            lineStyle: 'dashed',
            lineWidth: 1,
          });
        }
      }
    }

    return { series: chartSeries, markLines: chartMarkLines, clClient: resolvedClClient, elClient: resolvedElClient };
  }, [data, selectedNode, blockPropagationData, metric, CHART_CATEGORICAL_COLORS]);

  const nodeCount = new Set(data.map(d => d.meta_client_name)).size;
  const shortNodeName = selectedNode?.split('/').pop() ?? '';

  const subtitle = selectedNode
    ? `Slot ${slot} · ${shortNodeName} · shaded = min/max range, dashed = busiest core`
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

            // Filter out hidden band series from tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const visible = items.filter((p: any) => !String(p.seriesName).startsWith('_'));
            if (visible.length === 0) return '';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const first = visible[0] as any;
            const xVal = Array.isArray(first.value) ? first.value[0] : first.axisValue;
            const timeStr = typeof xVal === 'number' ? `${xVal.toFixed(2)}s` : `${xVal}s`;

            let html = `<div style="font-size:12px;min-width:160px">`;
            html += `<div style="margin-bottom:4px;font-weight:600;color:var(--color-foreground)">${timeStr}</div>`;

            for (const item of visible) {
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
