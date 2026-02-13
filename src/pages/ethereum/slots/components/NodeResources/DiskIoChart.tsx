import { type JSX, useCallback, useMemo, useState } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData, MarkLineConfig } from '@/components/Charts/MultiLine/MultiLine.types';
import { getDataVizColors, getClientLayer } from '@/utils';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';
import {
  type EChartsTooltipParam,
  SLOT_BUCKET_SIZE,
  ALL_SLOT_BUCKETS,
  PHASE_BOUNDARY_COLORS,
  usToSeconds,
  capitalize,
  bytesToKB,
  toSlotBucket,
  avg,
} from '@/utils/node-resources';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { FctNodeDiskIoByProcess } from '@/api/types.gen';
import { type AnnotationType, type AnnotationEvent, type HighlightRange } from './types';
import { AnnotationSwimLanes } from './AnnotationSwimLanes';

interface DiskIoChartProps {
  data: FctNodeDiskIoByProcess[];
  selectedNode: string | null;
  slot: number;
  annotations: AnnotationEvent[];
  enabledAnnotations: Set<AnnotationType>;
  highlight: HighlightRange | null;
  onHighlight: (range: HighlightRange | null) => void;
}

export function DiskIoChart({
  data,
  selectedNode,
  slot,
  annotations,
  enabledAnnotations,
  highlight,
  onHighlight,
}: DiskIoChartProps): JSX.Element {
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

    const bucketData = (items: FctNodeDiskIoByProcess[]): Map<number, number[]> => {
      const buckets = new Map<number, number[]>();
      for (const d of items) {
        const offset = usToSeconds((d.window_start ?? 0) - slotStartUs) + SLOT_BUCKET_SIZE;
        const bucket = toSlotBucket(offset);
        if (bucket < 0 || bucket > 12) continue;

        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket)!.push(bytesToKB(d.io_bytes ?? 0));
      }
      return buckets;
    };

    const toPoints = (buckets: Map<number, number[]>): [number, number][] =>
      ALL_SLOT_BUCKETS.map(t => [t, buckets.has(t) ? avg(buckets.get(t)!) : 0] as [number, number]);

    if (selectedNode) {
      const nodeData = data.filter(d => d.meta_client_name === selectedNode);
      const clData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = nodeData.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      resolvedClClient = clData[0]?.client_type ?? '';
      resolvedElClient = elData[0]?.client_type ?? '';

      const clLabel = capitalize(resolvedClClient || 'CL');
      const elLabel = capitalize(resolvedElClient || 'EL');

      const clRead = clData.filter(d => d.rw === 'read');
      const clWrite = clData.filter(d => d.rw === 'write');
      const elRead = elData.filter(d => d.rw === 'read');
      const elWrite = elData.filter(d => d.rw === 'write');

      chartSeries.push({
        name: `${clLabel} Read`,
        data: toPoints(bucketData(clRead)),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });
      chartSeries.push({
        name: `${clLabel} Write`,
        data: toPoints(bucketData(clWrite)),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        smooth: 0.4,
      });
      chartSeries.push({
        name: `${elLabel} Read`,
        data: toPoints(bucketData(elRead)),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });
      chartSeries.push({
        name: `${elLabel} Write`,
        data: toPoints(bucketData(elWrite)),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        smooth: 0.4,
      });
    } else {
      const clData = data.filter(d => getClientLayer(d.client_type ?? '') === 'CL');
      const elData = data.filter(d => getClientLayer(d.client_type ?? '') === 'EL');

      const clRead = clData.filter(d => d.rw === 'read');
      const clWrite = clData.filter(d => d.rw === 'write');
      const elRead = elData.filter(d => d.rw === 'read');
      const elWrite = elData.filter(d => d.rw === 'write');

      chartSeries.push({
        name: 'CL Read',
        data: toPoints(bucketData(clRead)),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });
      chartSeries.push({
        name: 'CL Write',
        data: toPoints(bucketData(clWrite)),
        color: CHART_CATEGORICAL_COLORS[0],
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        smooth: 0.4,
      });
      chartSeries.push({
        name: 'EL Read',
        data: toPoints(bucketData(elRead)),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 2,
        showArea: true,
        areaOpacity: 0.08,
        smooth: 0.4,
      });
      chartSeries.push({
        name: 'EL Write',
        data: toPoints(bucketData(elWrite)),
        color: CHART_CATEGORICAL_COLORS[1],
        lineWidth: 1.5,
        lineStyle: 'dashed',
        showArea: false,
        smooth: 0.4,
      });
    }

    return { series: chartSeries, clClient: resolvedClClient, elClient: resolvedElClient };
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
    ? `Slot ${slot} · ${shortNodeName} · Disk I/O`
    : `Slot ${slot} · Mean across ${nodeCount} nodes · Disk I/O`;

  const headerActions =
    selectedNode && (clClient || elClient) ? (
      <div className="flex items-center gap-1">
        {clClient && <ClientLogo client={clClient} size={24} />}
        {elClient && <ClientLogo client={elClient} size={24} />}
      </div>
    ) : undefined;

  if (data.length === 0) {
    return (
      <PopoutCard title="Disk I/O" subtitle="No data available" modalSize="xl">
        {({ inModal }) => (
          <div className={inModal ? 'min-h-80' : 'h-64'}>
            <div className="flex h-full items-center justify-center">
              <p className="text-muted">No disk I/O data available for this slot</p>
            </div>
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title="Disk I/O" subtitle={subtitle} headerActions={headerActions} modalSize="xl">
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
                name: 'KB',
                min: 0,
                formatter: (v: number) => `${v.toFixed(0)} KB`,
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
                  html += `<span style="font-weight:600">${Number(val).toFixed(1)} KB</span>`;
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
