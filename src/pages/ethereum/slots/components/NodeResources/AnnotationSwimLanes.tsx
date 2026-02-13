import { type JSX, useMemo } from 'react';
import {
  ANNOTATION_COLORS,
  ANNOTATION_OPTIONS,
  type AnnotationType,
  type AnnotationEvent,
  type HighlightRange,
} from './types';

/** Minimum visual width (fraction of 0–1) so point events remain clickable/visible */
const MIN_MARK_FRAC = 0.08 / 12;
const SLOT_DURATION_MS = 12_000;

/** Annotation types rendered as swim lanes (slot_phases excluded – those stay as chart markLines) */
const LANE_TYPES: Exclude<AnnotationType, 'slot_phases'>[] = ['block', 'head', 'execution', 'data_columns'];

const LANE_LABELS: Record<string, string> = Object.fromEntries(
  ANNOTATION_OPTIONS.filter(o => o.value !== 'slot_phases').map(o => [o.value, o.label])
);

function nodeMatches(nodeName: string, selectedNode: string): boolean {
  const short = nodeName.split('/').pop() ?? nodeName;
  return (
    selectedNode === short || selectedNode === nodeName || short.includes(selectedNode) || selectedNode.includes(short)
  );
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, value));
}

interface AnnotationSwimLanesProps {
  annotations: AnnotationEvent[];
  enabledAnnotations: Set<AnnotationType>;
  selectedNode: string | null;
  /** Left offset of the chart grid in pixels (matches y-axis label area) */
  gridLeft: number;
  /** Right offset of the chart grid in pixels */
  gridRight: number;
  /** Called when a swim lane mark is hovered/unhovered */
  onHighlight?: (range: HighlightRange | null) => void;
}

interface LaneMark {
  leftPct: number;
  widthPct: number;
  color: string;
  opacity: number;
}

export function AnnotationSwimLanes({
  annotations,
  enabledAnnotations,
  selectedNode,
  gridLeft,
  gridRight,
  onHighlight,
}: AnnotationSwimLanesProps): JSX.Element | null {
  const lanes = useMemo(() => {
    const result: { type: string; label: string; marks: LaneMark[] }[] = [];

    for (const laneType of LANE_TYPES) {
      if (!enabledAnnotations.has(laneType)) continue;

      const color = ANNOTATION_COLORS[laneType];
      const marks: LaneMark[] = [];

      if (selectedNode) {
        // Single node: exact event positions
        for (const anno of annotations) {
          if (anno.type !== laneType) continue;
          if (!anno.nodeName || !nodeMatches(anno.nodeName, selectedNode)) continue;

          const hasRange = anno.endMs != null && Math.abs(anno.endMs - anno.timeMs) > 10;
          const rawStartFrac = anno.timeMs / SLOT_DURATION_MS;
          const rawEndFrac = (anno.endMs ?? anno.timeMs) / SLOT_DURATION_MS;
          if (rawEndFrac < 0 || rawStartFrac > 1) continue;

          const startFrac = clampFraction(rawStartFrac);
          const endFrac = clampFraction(rawEndFrac);

          if (hasRange) {
            marks.push({
              leftPct: startFrac * 100,
              widthPct: Math.max((endFrac - startFrac) * 100, MIN_MARK_FRAC * 100),
              color,
              opacity: 0.6,
            });
          } else {
            marks.push({
              leftPct: Math.max(0, startFrac - MIN_MARK_FRAC / 2) * 100,
              widthPct: MIN_MARK_FRAC * 100,
              color,
              opacity: 0.8,
            });
          }
        }
      } else {
        // Aggregate: min–p95 spread
        const events = annotations.filter(a => a.type === laneType);
        if (events.length === 0) continue;

        const hasRanges = events.some(e => e.endMs != null);

        if (hasRanges) {
          const starts = events.map(e => e.timeMs).sort((a, b) => a - b);
          const ends = events.map(e => e.endMs ?? e.timeMs).sort((a, b) => a - b);
          const rawStartFrac = starts[0] / SLOT_DURATION_MS;
          const rawEndFrac = percentile(ends, 0.95) / SLOT_DURATION_MS;
          if (rawEndFrac < 0 || rawStartFrac > 1) continue;

          const startFrac = clampFraction(rawStartFrac);
          const endFrac = clampFraction(rawEndFrac);
          marks.push({
            leftPct: startFrac * 100,
            widthPct: Math.max((endFrac - startFrac) * 100, MIN_MARK_FRAC * 100),
            color,
            opacity: 0.5,
          });
        } else {
          const times = events.map(e => e.timeMs).sort((a, b) => a - b);
          const rawMinFrac = times[0] / SLOT_DURATION_MS;
          const rawP95Frac = percentile(times, 0.95) / SLOT_DURATION_MS;
          if (rawP95Frac < 0 || rawMinFrac > 1) continue;

          const minFrac = clampFraction(rawMinFrac);
          const p95Frac = clampFraction(rawP95Frac);
          const width = p95Frac - minFrac;
          if (width < MIN_MARK_FRAC) {
            const medFrac = clampFraction(percentile(times, 0.5) / SLOT_DURATION_MS);
            marks.push({
              leftPct: Math.max(0, medFrac - MIN_MARK_FRAC / 2) * 100,
              widthPct: MIN_MARK_FRAC * 100,
              color,
              opacity: 0.7,
            });
          } else {
            marks.push({
              leftPct: minFrac * 100,
              widthPct: (p95Frac - minFrac) * 100,
              color,
              opacity: 0.5,
            });
          }
        }
      }

      if (marks.length > 0) {
        result.push({ type: laneType, label: LANE_LABELS[laneType] ?? laneType, marks });
      }
    }

    return result;
  }, [annotations, enabledAnnotations, selectedNode]);

  if (lanes.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-0.5" style={{ paddingRight: gridRight }}>
      {lanes.map(lane => (
        <div key={lane.type} className="flex items-center" style={{ height: 14 }}>
          <span
            className="shrink-0 truncate text-muted"
            style={{ width: gridLeft, fontSize: 9, lineHeight: '14px', textAlign: 'right', paddingRight: 6 }}
          >
            {lane.label}
          </span>
          <div className="relative grow bg-foreground/[0.03]" style={{ height: 10, borderRadius: 2 }}>
            {lane.marks.map((mark, i) => (
              <div
                key={i}
                className="absolute top-0 h-full cursor-pointer"
                style={{
                  left: `${mark.leftPct}%`,
                  width: `${mark.widthPct}%`,
                  backgroundColor: mark.color,
                  opacity: mark.opacity,
                  borderRadius: 1,
                }}
                onMouseEnter={() =>
                  onHighlight?.({
                    startFrac: mark.leftPct / 100,
                    widthFrac: mark.widthPct / 100,
                    color: mark.color,
                  })
                }
                onMouseLeave={() => onHighlight?.(null)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
