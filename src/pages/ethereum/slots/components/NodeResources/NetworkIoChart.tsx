import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData, MarkAreaConfig, MarkLineConfig } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';
import type { FctNodeNetworkIoByProcess } from '@/api/types.gen';
import { ANNOTATION_COLORS, type AnnotationType, type AnnotationEvent } from './types';

function usToSeconds(us: number): number {
  return us / 1_000_000;
}

function bytesToKB(bytes: number): number {
  return bytes / 1024;
}

/** Port labels that are hidden by default (internal/API traffic) */
const HIDDEN_PORTS = new Set(['cl_beacon_api', 'el_json_rpc', 'el_engine_api', 'el_ws', 'cl_grpc']);

const PORT_LABELS: Record<string, string> = {
  el_p2p_tcp: 'EL P2P',
  cl_p2p_tcp: 'CL P2P',
  cl_discovery: 'CL Discovery',
  el_discovery: 'EL Discovery',
  cl_beacon_api: 'CL Beacon API',
  el_json_rpc: 'EL JSON-RPC',
  el_engine_api: 'EL Engine API',
  el_ws: 'EL WebSocket',
  cl_grpc: 'CL gRPC',
  unknown: 'Unknown',
};

const MIN_AREA_WIDTH_SEC = 0.08;

function nodeMatches(cpuNodeName: string, propNodeId: string): boolean {
  const short = cpuNodeName.split('/').pop() ?? cpuNodeName;
  return propNodeId === short || propNodeId === cpuNodeName || short.includes(propNodeId) || propNodeId.includes(short);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

const BUCKET_SIZE = 0.25;
const toBucket = (offsetSec: number): number => Math.round(offsetSec / BUCKET_SIZE) * BUCKET_SIZE;
const avg = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;

interface NetworkIoChartProps {
  data: FctNodeNetworkIoByProcess[];
  selectedNode: string | null;
  slot: number;
  annotations: AnnotationEvent[];
  enabledAnnotations: Set<AnnotationType>;
}

const PHASE_BOUNDARY_COLORS = ['#22d3ee', '#22c55e', '#f59e0b'];

interface EChartsTooltipParam {
  marker: string;
  seriesName: string;
  value: [number, number] | number;
  axisValue?: number | string;
}

export function NetworkIoChart({
  data,
  selectedNode,
  slot,
  annotations,
  enabledAnnotations,
}: NetworkIoChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  const series = useMemo(() => {
    if (data.length === 0) return [] as SeriesData[];

    const slotStartUs = Math.min(...data.map(d => d.wallclock_slot_start_date_time ?? 0).filter(v => v > 0));
    const chartSeries: SeriesData[] = [];

    // Group by port_label, aggregate tx+rx bytes per bucket
    const ports = new Set(data.map(d => d.port_label).filter(Boolean) as string[]);
    const sortedPorts = Array.from(ports).sort();

    for (let i = 0; i < sortedPorts.length; i++) {
      const port = sortedPorts[i];
      const portData = data.filter(d => d.port_label === port);

      let filteredPortData = portData;
      if (selectedNode) {
        filteredPortData = portData.filter(d => d.meta_client_name === selectedNode);
      }

      // Bucket and aggregate tx+rx bytes
      const buckets = new Map<number, number[]>();
      for (const d of filteredPortData) {
        const offset = usToSeconds((d.window_start ?? 0) - slotStartUs);
        const bucket = toBucket(offset);
        if (bucket < 0 || bucket > 12) continue;

        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket)!.push(bytesToKB(d.io_bytes ?? 0));
      }

      const points: [number, number][] = Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([t, vals]) => [t, avg(vals)] as [number, number]);

      if (points.length === 0) continue;

      const label = PORT_LABELS[port] ?? port;
      const color = CHART_CATEGORICAL_COLORS[i % CHART_CATEGORICAL_COLORS.length];

      chartSeries.push({
        name: label,
        data: points,
        color,
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.06,
        initiallyVisible: !HIDDEN_PORTS.has(port),
      });
    }

    return chartSeries;
  }, [data, selectedNode, CHART_CATEGORICAL_COLORS]);

  const markAreas = useMemo((): MarkAreaConfig[] => {
    const areas: MarkAreaConfig[] = [];

    if (selectedNode) {
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
          const starts = events.map(e => e.timeMs).sort((a, b) => a - b);
          const ends = events.map(e => e.endMs ?? e.timeMs).sort((a, b) => a - b);
          const startSec = starts[0] / 1000;
          const endSec = percentile(ends, 0.95) / 1000;
          if (startSec >= 0 && startSec <= 12) {
            areas.push({ xStart: Math.max(0, startSec), xEnd: Math.min(12, endSec), color, opacity: 0.1 });
          }
        } else {
          const times = events.map(e => e.timeMs).sort((a, b) => a - b);
          const minSec = times[0] / 1000;
          const p95Sec = percentile(times, 0.95) / 1000;
          if (minSec >= 0 && p95Sec <= 12) {
            const width = p95Sec - minSec;
            if (width < MIN_AREA_WIDTH_SEC) {
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
    ? `Slot ${slot} · ${shortNodeName} · Network traffic by port`
    : `Slot ${slot} · Mean across ${nodeCount} nodes · Network traffic by port`;

  if (data.length === 0) {
    return (
      <PopoutCard title="Network I/O" subtitle="No data available" modalSize="xl">
        {({ inModal }) => (
          <div className={inModal ? 'min-h-80' : 'h-64'}>
            <div className="flex h-full items-center justify-center">
              <p className="text-muted">No network I/O data available for this slot</p>
            </div>
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title="Network I/O" subtitle={subtitle} modalSize="xl">
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
            name: 'KB',
            min: 0,
            formatter: (v: number) => `${v.toFixed(0)} KB`,
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
              html += `<span style="font-weight:600">${Number(val).toFixed(1)} KB</span>`;
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
