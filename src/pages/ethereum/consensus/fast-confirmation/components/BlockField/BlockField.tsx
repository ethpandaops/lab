import { type JSX, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useThemeColors } from '@/hooks/useThemeColors';
import { hexToRgba } from '@/utils/color';
import { formatEpoch } from '@/utils';
import { type FieldEpoch, type FieldModel, type FieldTier, formatDurationMs } from '../../fast-confirmation.utils';

export interface BlockFieldProps {
  field: FieldModel;
  selectedEpoch: number | null;
  onSelect: (epoch: FieldEpoch) => void;
}

const GUTTER = 64;
const HEADER = 22;

const TIER_LABELS: Array<{ tier: FieldTier; label: string }> = [
  { tier: 'ok', label: 'Every block within a slot' },
  { tier: 'late', label: 'A block took up to 2 slots' },
  { tier: 'slow', label: 'Up to 2 minutes' },
  { tier: 'stalled', label: 'Stalled for minutes' },
  { tier: 'held', label: 'Held until finality' },
];

function tierColors(colors: ReturnType<typeof useThemeColors>): Record<FieldTier, string> {
  return {
    none: 'transparent',
    ok: hexToRgba(colors.success, 0.18),
    late: hexToRgba(colors.warning, 0.5),
    slow: hexToRgba(colors.warning, 0.9),
    stalled: hexToRgba(colors.danger, 0.6),
    held: colors.danger,
  };
}

function utcDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function utcTime(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(11, 16);
}

/**
 * Every epoch the node has scored, one row per UTC day and one column per epoch of the day,
 * coloured by the slowest fast confirmation in that epoch.
 */
export function BlockField({ field, selectedEpoch, onSelect }: BlockFieldProps): JSX.Element {
  const colors = useThemeColors();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ epoch: FieldEpoch; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(0, width - GUTTER);
  const cellW = plotWidth / field.columns;
  const cellH = Math.max(3, Math.min(6, cellW));
  const gap = cellW >= 4 ? 1 : 0;
  const height = HEADER + field.days.length * cellH;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || plotWidth === 0) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = plotWidth * ratio;
    canvas.height = field.days.length * cellH * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, plotWidth, field.days.length * cellH);
    const palette = tierColors(colors);
    for (const e of field.epochs) {
      if (e.tier === 'none') continue;
      ctx.fillStyle = palette[e.tier];
      ctx.fillRect(e.column * cellW, e.day * cellH, Math.max(1, cellW - gap), Math.max(1, cellH - gap));
    }
    const selected = selectedEpoch !== null ? field.byEpoch.get(selectedEpoch) : undefined;
    if (selected) {
      ctx.strokeStyle = colors.foreground;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(selected.column * cellW - 1.5, selected.day * cellH - 1.5, cellW + 2, cellH + 2);
    }
  }, [field, colors, plotWidth, cellW, cellH, gap, selectedEpoch]);

  const epochAt = (clientX: number, clientY: number): FieldEpoch | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const column = Math.floor((clientX - rect.left) / cellW);
    const day = Math.floor((clientY - rect.top) / cellH);
    return field.epochs.find(e => e.day === day && e.column === column && e.tier !== 'none') ?? null;
  };

  const monthRows = field.days
    .map((start, day) => ({ start, day }))
    .filter(({ start }, i) => i === 0 || new Date(start * 1000).getUTCDate() === 1);

  return (
    <div className="flex flex-col gap-4">
      <div ref={wrapRef} className="relative select-none" style={{ height }}>
        {[0, 6, 12, 18].map(h => (
          <span
            key={h}
            className="absolute top-0 text-xs text-muted tabular-nums"
            style={{ left: GUTTER + (h / 24) * plotWidth }}
          >
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
        {monthRows.map(({ start, day }) => (
          <span
            key={start}
            className="absolute left-0 text-xs text-muted tabular-nums"
            style={{ top: HEADER + day * cellH - 4 }}
          >
            {utcDate(start)}
          </span>
        ))}
        <canvas
          ref={canvasRef}
          className="absolute cursor-crosshair"
          style={{ left: GUTTER, top: HEADER, width: plotWidth, height: field.days.length * cellH }}
          onMouseMove={e => {
            const epoch = epochAt(e.clientX, e.clientY);
            setHover(epoch ? { epoch, x: e.nativeEvent.offsetX + GUTTER, y: e.nativeEvent.offsetY + HEADER } : null);
          }}
          onMouseLeave={() => setHover(null)}
          onClick={e => {
            const epoch = epochAt(e.clientX, e.clientY);
            if (epoch) onSelect(epoch);
          }}
        />
        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-64 rounded-sm border border-border bg-surface px-3 py-2 text-xs shadow-sm"
            style={{
              left: Math.min(hover.x + 12, width - 260),
              top: hover.y + 12,
            }}
          >
            <div className="font-semibold text-foreground">
              {utcDate(hover.epoch.startTime)}, {utcTime(hover.epoch.startTime)} UTC
            </div>
            <div className="text-muted">Epoch {formatEpoch(hover.epoch.epoch)}</div>
            <div className={clsx('mt-1', hover.epoch.lateBlocks ? 'text-warning' : 'text-success')}>
              {hover.epoch.lateBlocks
                ? `${hover.epoch.lateBlocks} late block${hover.epoch.lateBlocks > 1 ? 's' : ''}, slowest ${formatDurationMs(hover.epoch.worstMs)}`
                : 'Every block fast confirmed within its slot'}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        {TIER_LABELS.map(({ tier, label }) => (
          <span key={tier} className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs" style={{ background: tierColors(colors)[tier] }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-xs border border-dashed border-border" />
          Node not reporting
        </span>
      </div>
    </div>
  );
}
