import type { JSX } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { SPAN_COLORS } from './constants';
import { formatMs, msToPercent } from './utils';
import type { TraceSpan } from './SlotProgressTimeline.types';

interface TimelineRowProps {
  span: TraceSpan;
  rowHeight: number;
  labelWidth: number;
  isHovered: boolean;
  isCollapsed: boolean;
  childCount: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onToggleCollapse: () => void;
}

/**
 * Renders a single row in the timeline trace view.
 */
export function TimelineRow({
  span,
  rowHeight,
  labelWidth,
  isHovered,
  isCollapsed,
  childCount,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onToggleCollapse,
}: TimelineRowProps): JSX.Element {
  const colors = SPAN_COLORS[span.category];
  const startPercent = msToPercent(span.startMs);
  const endPercent = msToPercent(span.endMs);
  const widthPercent = Math.max(endPercent - startPercent, 0.5);
  const duration = span.endMs - span.startMs;

  return (
    <div
      className={clsx(
        'relative flex items-center border-b border-border/30 transition-colors',
        isHovered && 'bg-surface/80'
      )}
      style={{ height: rowHeight }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {/* Label column */}
      <div
        className={clsx(
          'flex shrink-0 items-center gap-1 px-2 font-mono text-xs',
          span.collapsible && 'cursor-pointer hover:bg-surface/50'
        )}
        style={{ width: labelWidth, paddingLeft: 8 + span.depth * 16 }}
        onClick={span.collapsible ? onToggleCollapse : undefined}
        title={span.collapsible ? (isCollapsed ? `Expand (${childCount} items)` : 'Collapse') : undefined}
      >
        {span.collapsible ? (
          <span className="text-muted transition-colors group-hover:text-foreground">{isCollapsed ? '▶' : '▼'}</span>
        ) : (
          span.depth > 0 && <span className="text-muted">{'└'}</span>
        )}
        {span.clientName && <ClientLogo client={span.clientName} size={14} className="shrink-0" />}
        <span className={clsx('truncate', span.isLate ? 'text-danger' : 'text-foreground')} title={span.label}>
          {span.label}
          {span.collapsible && isCollapsed && <span className="ml-1 text-muted">({childCount})</span>}
        </span>
      </div>

      {/* Timeline column */}
      <div className="relative h-full flex-1">
        <div
          className={clsx(
            'absolute top-1 rounded-xs transition-all',
            span.isLate ? 'bg-danger/80' : colors.bg,
            isHovered && 'ring-1 ring-white/20 brightness-110',
            span.collapsible && 'cursor-pointer'
          )}
          style={{
            left: `${startPercent}%`,
            width: `${widthPercent}%`,
            height: rowHeight - 8,
            minWidth: 4,
          }}
          title={span.details}
          onClick={span.collapsible ? onToggleCollapse : undefined}
        />
      </div>

      {/* Duration column */}
      <div
        className={clsx('shrink-0 px-2 text-right font-mono text-xs', span.isLate ? 'text-danger' : colors.text)}
        style={{ width: 80 }}
      >
        {span.category === 'column' ? formatMs(span.startMs) : formatMs(duration)}
      </div>
    </div>
  );
}
