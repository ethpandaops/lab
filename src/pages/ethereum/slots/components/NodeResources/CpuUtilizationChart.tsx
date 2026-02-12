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

/** Get the normalized metric value (0-100% of total system) from a data point */
function getMetricValue(d: FctNodeCpuUtilization, metric: CpuMetric): number {
  const cores = d.system_cores ?? 1;
  const divisor = cores > 0 ? cores : 1;
  switch (metric) {
    case 'min':
      return (d.min_core_pct ?? 0) / divisor;
    case 'max':
      return (d.max_core_pct ?? 0) / divisor;
    case 'mean':
    default:
      return (d.mean_core_pct ?? 0) / divisor;
  }
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

interface CpuUtilizationChartProps {
  data: FctNodeCpuUtilization[];
  selectedNode: string | null;
  blockPropagationData: BlockArrival[];
  metric: CpuMetric;
}

export function CpuUtilizationChart({
  data,
  selectedNode,
  blockPropagationData,
  metric,
}: CpuUtilizationChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const { series, markLines, clClient, elClient } = useMemo(() => {
    if (data.length === 0) {
      return { series: [] as SeriesData[], markLines: [] as MarkLineConfig[], clClient: '', elClient: '' };
    }

    // Derive slot start time from data (microseconds)
    const slotStartUs = Math.min(...data.map(d => d.wallclock_slot_start_date_time ?? 0).filter(v => v > 0));

    const chartSeries: SeriesData[] = [];
    let resolvedClClient = '';
    let resolvedElClient = '';

    // Bucket size for time aggregation (seconds)
    const BUCKET_SIZE = 0.25;
    const toBucket = (offsetSec: number): number => Math.round(offsetSec / BUCKET_SIZE) * BUCKET_SIZE;

    const buildLine = (
      items: FctNodeCpuUtilization[],
      label: string,
      color: string,
      getValue: CpuMetric | ((d: FctNodeCpuUtilization) => number),
      opts?: {
        lineWidth?: number;
        showArea?: boolean;
        areaOpacity?: number;
        lineStyle?: 'solid' | 'dashed' | 'dotted';
      }
    ): void => {
      const extractValue =
        typeof getValue === 'function' ? getValue : (d: FctNodeCpuUtilization) => getMetricValue(d, getValue);

      const byBucket = new Map<number, number[]>();
      items.forEach(d => {
        const offset = usToSeconds((d.window_start ?? 0) - slotStartUs);
        const bucket = toBucket(offset);
        if (bucket < 0 || bucket > 12) return;
        if (!byBucket.has(bucket)) byBucket.set(bucket, []);
        byBucket.get(bucket)!.push(extractValue(d));
      });

      const points = Array.from(byBucket.entries())
        .sort(([a], [b]) => a - b)
        .map(([offset, values]) => [offset, values.reduce((s, v) => s + v, 0) / values.length] as [number, number]);

      if (points.length > 0) {
        chartSeries.push({
          name: label,
          data: points,
          color,
          lineWidth: opts?.lineWidth ?? 2,
          showArea: opts?.showArea ?? true,
          areaOpacity: opts?.areaOpacity ?? 0.08,
          lineStyle: opts?.lineStyle,
        });
      }
    };

    if (selectedNode) {
      const nodeData = data.filter(d => d.meta_client_name === selectedNode);
      const clData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      resolvedClClient = clData[0]?.client_type ?? '';
      resolvedElClient = elData[0]?.client_type ?? '';

      const clLabel = resolvedClClient || 'CL';
      const elLabel = resolvedElClient || 'EL';
      const clColor = CHART_CATEGORICAL_COLORS[0];
      const elColor = CHART_CATEGORICAL_COLORS[1];

      const coreExtract = (d: FctNodeCpuUtilization) => Math.min(d.max_core_pct ?? 0, 100);

      // CL system utilization: mean (solid), min (dotted), max (dashed)
      buildLine(clData, `${clLabel} sys mean`, clColor, 'mean', { lineWidth: 2, showArea: true, areaOpacity: 0.06 });
      buildLine(clData, `${clLabel} sys min`, clColor, 'min', {
        lineWidth: 1.5,
        showArea: false,
        lineStyle: 'dotted',
      });
      buildLine(clData, `${clLabel} sys max`, clColor, 'max', {
        lineWidth: 1.5,
        showArea: false,
        lineStyle: 'dashed',
      });

      // EL system utilization: mean (solid), min (dotted), max (dashed)
      buildLine(elData, `${elLabel} sys mean`, elColor, 'mean', { lineWidth: 2, showArea: true, areaOpacity: 0.06 });
      buildLine(elData, `${elLabel} sys min`, elColor, 'min', {
        lineWidth: 1.5,
        showArea: false,
        lineStyle: 'dotted',
      });
      buildLine(elData, `${elLabel} sys max`, elColor, 'max', {
        lineWidth: 1.5,
        showArea: false,
        lineStyle: 'dashed',
      });

      // Hottest single core per client (raw, not divided by system_cores)
      const singleCoreColor = CHART_CATEGORICAL_COLORS[2] ?? '#e5a00d';
      buildLine(clData, `${clLabel} hottest core`, singleCoreColor, coreExtract, {
        lineWidth: 1.5,
        showArea: false,
        lineStyle: 'dashed',
      });
      buildLine(elData, `${elLabel} hottest core`, singleCoreColor, coreExtract, {
        lineWidth: 1.5,
        showArea: false,
        lineStyle: 'dotted',
      });
    } else {
      const clData = data.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = data.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      buildLine(clData, 'Consensus Layer', CHART_CATEGORICAL_COLORS[0], metric);
      buildLine(elData, 'Execution Layer', CHART_CATEGORICAL_COLORS[1], metric);
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
    ? `${shortNodeName} · sys% = total system, hottest core = single core peak`
    : `${METRIC_LABELS[metric]} across ${nodeCount} nodes · % of total system`;

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
            name: 'CPU %',
            min: 0,
            formatter: (v: number) => `${v.toFixed(1)}%`,
          }}
          height={inModal ? 500 : 350}
          showLegend
          legendPosition="bottom"
          markLines={markLines}
          syncGroup="slot-time"
          valueDecimals={1}
          tooltipFormatter={(params: unknown) => {
            const items = Array.isArray(params) ? params : [params];
            if (items.length === 0) return '';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const first = items[0] as any;
            const xVal = Array.isArray(first.value) ? first.value[0] : first.axisValue;
            const timeStr = typeof xVal === 'number' ? `${xVal.toFixed(3)}s` : `${xVal}s`;

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
