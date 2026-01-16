import type { JSX } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { formatMs } from './utils';
import type { TraceSpan } from './SlotProgressTimeline.types';

interface TimelineTooltipProps {
  span: TraceSpan;
  position: { x: number; y: number };
  containerWidth: number;
}

/**
 * Floating tooltip that displays span details on hover.
 */
export function TimelineTooltip({ span, position, containerWidth }: TimelineTooltipProps): JSX.Element {
  return (
    <div
      className="pointer-events-none absolute z-50 max-w-md min-w-72 rounded border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
      style={{
        left: Math.min(position.x + 16, containerWidth - 320),
        top: position.y + 16,
      }}
    >
      {/* Header with label and late badge */}
      <div className="flex items-center gap-2">
        {span.clientName && <ClientLogo client={span.clientName} size={20} />}
        <span className="text-sm font-semibold text-foreground">{span.label}</span>
        {span.isLate && (
          <span className="rounded bg-danger/20 px-1.5 py-0.5 text-xs font-medium text-danger">LATE</span>
        )}
      </div>

      {/* Timing row */}
      <div className="mt-2 flex items-center gap-4 rounded bg-surface/50 px-2 py-1.5 font-mono text-sm">
        <span className="text-muted">
          {formatMs(span.startMs)} → {formatMs(span.endMs)}
        </span>
        <span className={clsx('font-semibold', span.isLate ? 'text-danger' : 'text-foreground')}>
          Δ {formatMs(span.endMs - span.startMs)}
        </span>
      </div>

      {/* Details grid */}
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {/* Location */}
        {(span.city || span.country) && (
          <>
            <span className="text-muted">Location</span>
            <span className="text-foreground">{span.city ? `${span.city}, ${span.country}` : span.country}</span>
          </>
        )}

        {/* Client implementation + version */}
        {span.clientName && (
          <>
            <span className="text-muted">Client</span>
            <span className="text-foreground">
              {span.clientName}
              {span.clientVersion && <span className="ml-1 text-muted">v{span.clientVersion}</span>}
            </span>
          </>
        )}

        {/* Classification */}
        {span.classification && (
          <>
            <span className="text-muted">Classification</span>
            <span className="text-foreground">{span.classification}</span>
          </>
        )}

        {/* Node count (for DA items) */}
        {span.nodeCount !== undefined && (
          <>
            <span className="text-muted">Items</span>
            <span className="text-foreground">{span.nodeCount}</span>
          </>
        )}

        {/* Username/contributor */}
        {span.username && (
          <>
            <span className="text-muted">Contributor</span>
            <span className="text-primary">{span.username}</span>
          </>
        )}
      </div>

      {/* Node name (full path) */}
      {span.nodeName && (
        <div className="mt-2 truncate rounded bg-surface/30 px-2 py-1 font-mono text-xs text-muted">
          {span.nodeName}
        </div>
      )}

      {/* Node ID */}
      {span.nodeId && <div className="mt-1 font-mono text-xs text-muted/70">ID: {span.nodeId}</div>}
    </div>
  );
}
