import { type JSX, useCallback, useMemo, useState } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData, MarkLineConfig } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors } from '@/utils';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';
import type { FctNodeNetworkIoByProcess } from '@/api/types.gen';
import { type AnnotationType, type AnnotationEvent, type HighlightRange } from './types';
import { getByteScale, formatScaled, seriesMax } from './utils';
import { AnnotationSwimLanes } from './AnnotationSwimLanes';

function usToSeconds(us: number): number {
  return us / 1_000_000;
}

function bytesToKB(bytes: number): number {
  return bytes / 1024;
}

/** Port labels that are hidden by default (internal/API traffic) */
const HIDDEN_PORTS = new Set(['cl_beacon_api', 'el_json_rpc', 'el_engine_api', 'el_ws', 'cl_grpc']);

/** Well-known abbreviations and expansions for port label segments */
const PORT_LABEL_TOKENS: Record<string, string> = {
  cl: 'CL',
  el: 'EL',
  p2p: 'P2P',
  tcp: 'TCP',
  udp: 'UDP',
  api: 'API',
  rpc: 'RPC',
  grpc: 'gRPC',
  ws: 'WebSocket',
  json: 'JSON',
  io: 'I/O',
};

/** Convert a snake_case port label to a human-readable name */
function formatPortLabel(label: string): string {
  return label
    .split('_')
    .map(part => PORT_LABEL_TOKENS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const BUCKET_SIZE = 0.25;
const ALL_BUCKETS = Array.from({ length: 49 }, (_, i) => i * BUCKET_SIZE);
const toBucket = (offsetSec: number): number => Math.round(offsetSec / BUCKET_SIZE) * BUCKET_SIZE;
const avg = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;

interface NetworkIoChartProps {
  data: FctNodeNetworkIoByProcess[];
  selectedNode: string | null;
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

export function NetworkIoChart({
  data,
  selectedNode,
  slot,
  annotations,
  enabledAnnotations,
  highlight,
  onHighlight,
}: NetworkIoChartProps): JSX.Element {
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

  const { series, displayUnit } = useMemo(() => {
    if (data.length === 0) return { series: [] as SeriesData[], displayUnit: 'KB' };

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
        const offset = usToSeconds((d.window_start ?? 0) - slotStartUs) + BUCKET_SIZE;
        const bucket = toBucket(offset);
        if (bucket < 0 || bucket > 12) continue;

        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket)!.push(bytesToKB(d.io_bytes ?? 0));
      }

      if (buckets.size === 0) continue;

      const points: [number, number][] = ALL_BUCKETS.map(
        t => [t, buckets.has(t) ? avg(buckets.get(t)!) : 0] as [number, number]
      );

      const label = formatPortLabel(port);
      const color = CHART_CATEGORICAL_COLORS[i % CHART_CATEGORICAL_COLORS.length];

      chartSeries.push({
        name: label,
        data: points,
        color,
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.06,
        smooth: 0.4,
        initiallyVisible: !HIDDEN_PORTS.has(port),
      });
    }

    // Scale data to appropriate unit so ECharts picks nice round ticks
    const maxKB = seriesMax(chartSeries);
    const { divisor, unit } = getByteScale(maxKB, 'KB');
    if (divisor > 1) {
      for (const s of chartSeries) {
        for (const p of s.data as [number, number][]) {
          p[1] /= divisor;
        }
      }
    }

    return { series: chartSeries, displayUnit: unit };
  }, [data, selectedNode, CHART_CATEGORICAL_COLORS]);

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
                name: displayUnit,
                min: 0,
                formatter: (v: number) => formatScaled(v, displayUnit),
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
                  html += `<span style="font-weight:600">${formatScaled(Number(val), displayUnit)}</span>`;
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
