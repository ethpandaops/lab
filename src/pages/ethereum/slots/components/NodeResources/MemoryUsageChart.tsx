import { type JSX, useCallback, useMemo, useState } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData, MarkLineConfig } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors, getClientLayer } from '@/utils';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import type { FctNodeMemoryUsageByProcess } from '@/api/types.gen';
import { type AnnotationType, type AnnotationEvent, type HighlightRange } from './types';
import { AnnotationSwimLanes } from './AnnotationSwimLanes';

function usToSeconds(us: number): number {
  return us / 1_000_000;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

export type MemoryMetric = 'vm_rss' | 'rss_anon' | 'rss_file' | 'vm_swap';

const METRIC_LABELS: Record<MemoryMetric, string> = {
  vm_rss: 'RSS Total',
  rss_anon: 'RSS Anon',
  rss_file: 'RSS File',
  vm_swap: 'Swap',
};

const METRIC_OPTIONS = [
  { value: 'vm_rss' as MemoryMetric, label: 'RSS Total' },
  { value: 'rss_anon' as MemoryMetric, label: 'RSS Anon' },
  { value: 'rss_file' as MemoryMetric, label: 'RSS File' },
  { value: 'vm_swap' as MemoryMetric, label: 'Swap' },
];

const BUCKET_SIZE = 0.25;
const ALL_BUCKETS = Array.from({ length: 49 }, (_, i) => i * BUCKET_SIZE);
const toBucket = (offsetSec: number): number => Math.round(offsetSec / BUCKET_SIZE) * BUCKET_SIZE;
const avg = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;

function extractMetric(d: FctNodeMemoryUsageByProcess, metric: MemoryMetric): number {
  switch (metric) {
    case 'vm_rss':
      return d.vm_rss_bytes ?? 0;
    case 'rss_anon':
      return d.rss_anon_bytes ?? 0;
    case 'rss_file':
      return d.rss_file_bytes ?? 0;
    case 'vm_swap':
      return d.vm_swap_bytes ?? 0;
  }
}

interface MemoryUsageChartProps {
  data: FctNodeMemoryUsageByProcess[];
  selectedNode: string | null;
  metric: MemoryMetric;
  onMetricChange: (metric: MemoryMetric) => void;
  slot: number;
  annotations: AnnotationEvent[];
  enabledAnnotations: Set<AnnotationType>;
  highlight: HighlightRange | null;
  onHighlight: (range: HighlightRange | null) => void;
}

const PHASE_BOUNDARY_COLORS = ['#22d3ee', '#22c55e', '#f59e0b'];

interface EChartsTooltipParam {
  marker: string;
  seriesName: string;
  value: [number, number] | number;
  axisValue?: number | string;
}

export function MemoryUsageChart({
  data,
  selectedNode,
  metric,
  onMetricChange,
  slot,
  annotations,
  enabledAnnotations,
  highlight,
  onHighlight,
}: MemoryUsageChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const [gridOffsets, setGridOffsets] = useState({ left: 60, right: 24, height: 350 });
  const handleChartReady = useCallback(
    (instance: {
      convertToPixel: (finder: { gridIndex: number }, value: number[]) => number[];
      getDom: () => HTMLElement | null;
    }) => {
      try {
        const px0 = instance.convertToPixel({ gridIndex: 0 }, [0, 0]);
        const px12 = instance.convertToPixel({ gridIndex: 0 }, [12, 0]);
        const width = instance.getDom()?.clientWidth ?? 0;
        if (px0 && px12 && width > 0) {
          setGridOffsets({ left: Math.round(px0[0]), right: Math.round(width - px12[0]), height: Math.round(px0[1]) });
        }
      } catch {
        /* use defaults */
      }
    },
    []
  );

  const { series, clClient, elClient } = useMemo(() => {
    if (data.length === 0) {
      return { series: [] as SeriesData[], clClient: '', elClient: '' };
    }

    const slotStartUs = Math.min(...data.map(d => d.wallclock_slot_start_date_time ?? 0).filter(v => v > 0));
    const chartSeries: SeriesData[] = [];
    let resolvedClClient = '';
    let resolvedElClient = '';

    const bucketData = (items: FctNodeMemoryUsageByProcess[]): Map<number, number[]> => {
      const buckets = new Map<number, number[]>();
      for (const d of items) {
        const offset = usToSeconds((d.window_start ?? 0) - slotStartUs) + BUCKET_SIZE;
        const bucket = toBucket(offset);
        if (bucket < 0 || bucket > 12) continue;

        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket)!.push(bytesToMB(extractMetric(d, metric)));
      }
      return buckets;
    };

    const toPoints = (buckets: Map<number, number[]>): [number, number][] => {
      const points: [number, number][] = ALL_BUCKETS.map(
        t => [t, buckets.has(t) ? avg(buckets.get(t)!) : NaN] as [number, number]
      );
      // Gauge metric: forward-fill gaps, backward-fill leading empties
      const firstKnown = points.find(p => !isNaN(p[1]))?.[1] ?? 0;
      let last = firstKnown;
      for (const p of points) {
        if (isNaN(p[1])) {
          p[1] = last;
        } else {
          last = p[1];
        }
      }
      return points;
    };

    if (selectedNode) {
      const nodeData = data.filter(d => d.meta_client_name === selectedNode);
      const clData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      resolvedClClient = clData[0]?.client_type ?? '';
      resolvedElClient = elData[0]?.client_type ?? '';

      chartSeries.push({
        name: capitalize(resolvedClClient || 'CL'),
        data: toPoints(bucketData(clData)),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });

      chartSeries.push({
        name: capitalize(resolvedElClient || 'EL'),
        data: toPoints(bucketData(elData)),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });
    } else {
      const clData = data.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = data.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      chartSeries.push({
        name: 'Consensus Layer',
        data: toPoints(bucketData(clData)),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });

      chartSeries.push({
        name: 'Execution Layer',
        data: toPoints(bucketData(elData)),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });
    }

    return { series: chartSeries, clClient: resolvedClClient, elClient: resolvedElClient };
  }, [data, selectedNode, metric, CHART_CATEGORICAL_COLORS]);

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
    ? `Slot ${slot} · ${shortNodeName} · ${METRIC_LABELS[metric]}`
    : `Slot ${slot} · Mean across ${nodeCount} nodes · ${METRIC_LABELS[metric]}`;

  const headerActions = (
    <div className="flex items-center gap-2">
      {selectedNode && clClient && <ClientLogo client={clClient} size={24} />}
      {selectedNode && elClient && <ClientLogo client={elClient} size={24} />}
      <SelectMenu value={metric} onChange={onMetricChange} options={METRIC_OPTIONS} expandToFit />
    </div>
  );

  if (data.length === 0) {
    return (
      <PopoutCard title="Memory Usage" subtitle="No data available" modalSize="xl">
        {({ inModal }) => (
          <div className={inModal ? 'min-h-80' : 'h-64'}>
            <div className="flex h-full items-center justify-center">
              <p className="text-muted">No memory usage data available for this slot</p>
            </div>
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title="Memory Usage" subtitle={subtitle} headerActions={headerActions} modalSize="xl">
      {({ inModal }) => (
        <>
          <div className="relative">
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
                name: 'MB',
                min: 0,
                formatter: (v: number) => `${v.toFixed(0)} MB`,
              }}
              height={inModal ? 500 : 350}
              showLegend
              legendPosition="bottom"
              markLines={markLines}
              syncGroup="slot-time"
              onChartReady={handleChartReady}
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
                  html += `<span style="font-weight:600">${Number(val).toFixed(1)} MB</span>`;
                  html += `</div>`;
                }

                html += `</div>`;
                return html;
              }}
            />
            {highlight && (
              <div
                className="pointer-events-none absolute top-0"
                style={{
                  left: gridOffsets.left,
                  right: gridOffsets.right,
                  height: gridOffsets.height,
                }}
              >
                <div
                  className="absolute inset-y-0"
                  style={{
                    left: `${highlight.startFrac * 100}%`,
                    width: `${highlight.widthFrac * 100}%`,
                    backgroundColor: highlight.color,
                    opacity: 0.12,
                  }}
                />
              </div>
            )}
          </div>
          <AnnotationSwimLanes
            annotations={annotations}
            enabledAnnotations={enabledAnnotations}
            selectedNode={selectedNode}
            gridLeft={gridOffsets.left}
            gridRight={gridOffsets.right}
            onHighlight={onHighlight}
          />
        </>
      )}
    </PopoutCard>
  );
}
