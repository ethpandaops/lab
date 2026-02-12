import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { Toggle } from '@/components/Forms/Toggle';
import { useCanHover } from '@/hooks/useCanHover';
import type { SlotProgressTimelineProps, TraceSpan } from './SlotProgressTimeline.types';
import { SPAN_COLORS } from './constants';
import { formatMs, msToPercent } from './SlotProgressTimeline.utils';
import { useTraceSpans } from './useTraceSpans';
import { TimelineHeader } from './TimelineHeader';
import { TimelineGrid } from './TimelineGrid';
import { TimelineTooltip } from './TimelineTooltip';
import { TimelineLegend } from './TimelineLegend';

const ROW_HEIGHT = 28;
const LABEL_WIDTH = 280;

/**
 * SlotProgressTimeline displays a Jaeger/OTLP-style trace view of slot events.
 *
 * Shows hierarchical spans for:
 * - MEV bidding phase
 * - Block propagation across the network
 * - Block execution (newPayload) on reference nodes
 * - Data availability (individual columns/blobs)
 * - Attestations
 */
export function SlotProgressTimeline({
  slot,
  blockPropagation,
  headPropagation,
  blobPropagation,
  dataColumnPropagation,
  attestations,
  mevBidding,
  isLoading = false,
  contributor,
  onContributorChange,
}: SlotProgressTimelineProps): JSX.Element {
  const canHover = useCanHover();
  const [hoveredSpan, setHoveredSpan] = useState<TraceSpan | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [collapsedSpans, setCollapsedSpans] = useState<Set<string>>(new Set());
  const [excludeOutliers, setExcludeOutliers] = useState(true);
  const hasInitializedCollapsed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use contributor from URL params
  const selectedUsername = contributor ?? null;
  const setSelectedUsername = (username: string | null): void => {
    onContributorChange?.(username ?? undefined);
  };

  // Build trace spans from slot data
  const {
    spans,
    availableUsernames,
    isLoading: executionLoading,
  } = useTraceSpans({
    slot,
    blockPropagation,
    headPropagation,
    blobPropagation,
    dataColumnPropagation,
    attestations,
    mevBidding,
    selectedUsername,
    excludeOutliers,
  });

  // Helper to find all descendant span IDs
  const getDescendantIds = useCallback((spanId: string, allSpans: TraceSpan[]): string[] => {
    const descendants: string[] = [];
    const findChildren = (parentId: string): void => {
      for (const span of allSpans) {
        if (span.parentId === parentId) {
          descendants.push(span.id);
          findChildren(span.id);
        }
      }
    };
    findChildren(spanId);
    return descendants;
  }, []);

  // Toggle collapse with cascading
  const toggleCollapse = useCallback(
    (spanId: string): void => {
      setCollapsedSpans(prev => {
        const next = new Set(prev);
        if (next.has(spanId)) {
          next.delete(spanId);
        } else {
          next.add(spanId);
          const descendantIds = getDescendantIds(spanId, spans);
          for (const id of descendantIds) {
            next.add(id);
          }
        }
        return next;
      });
    },
    [spans, getDescendantIds]
  );

  // Initialize collapsed state from spans' defaultCollapsed property
  useEffect(() => {
    if (!hasInitializedCollapsed.current && spans.length > 1) {
      hasInitializedCollapsed.current = true;
      const initial = new Set<string>();
      for (const span of spans) {
        if (span.defaultCollapsed && span.collapsible) {
          initial.add(span.id);
        }
      }
      setCollapsedSpans(initial);
    }
  }, [spans]);

  // Reset collapsed state when filter changes
  useEffect(() => {
    hasInitializedCollapsed.current = false;
  }, [selectedUsername]);

  // Handle mouse events for tooltip (disabled on touch devices)
  const handleMouseEnter = useCallback(
    (span: TraceSpan) => {
      if (!canHover) return;
      setHoveredSpan(span);
    },
    [canHover]
  );

  const handleMouseLeave = useCallback(() => {
    if (!canHover) return;
    setHoveredSpan(null);
    setMousePos(null);
  }, [canHover]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!canHover) return;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    },
    [canHover]
  );

  // Loading state
  if (isLoading || executionLoading) {
    return (
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Slot Trace</h3>
          <p className="text-sm text-muted">Event timeline trace view</p>
        </div>
        <div className="h-64 animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30 bg-[length:200%_100%]" />
      </Card>
    );
  }

  // Empty state
  if (spans.length <= 1) {
    return (
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Slot Trace</h3>
          <p className="text-sm text-muted">Event timeline trace view</p>
        </div>
        <div className="py-8 text-center">
          <p className="text-muted">No trace data available for this slot</p>
        </div>
      </Card>
    );
  }

  // Build filter options
  const filterOptions = [
    { value: '', label: 'All nodes' },
    ...availableUsernames.map(username => ({ value: username, label: username })),
  ];

  // Filter spans by collapsed state - hide if any ancestor is collapsed
  // Build a lookup map for O(1) parent access
  const spanById = new Map(spans.map(s => [s.id, s]));
  const visibleSpans = spans.filter(span => {
    if (!span.parentId) return true;

    // Walk up the ancestry chain to check if any ancestor is collapsed
    let currentParentId: string | undefined = span.parentId;
    while (currentParentId) {
      if (collapsedSpans.has(currentParentId)) return false;
      currentParentId = spanById.get(currentParentId)?.parentId;
    }
    return true;
  });

  return (
    <Card>
      <div ref={containerRef} className="relative">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Slot Trace</h3>
            <p className="text-sm text-muted">
              Event timeline showing when each phase completed relative to slot start
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <Toggle
                checked={excludeOutliers}
                onChange={setExcludeOutliers}
                srLabel="Exclude outliers from parent spans"
                size="small"
              />
              <span className="text-xs text-muted">Exclude outliers</span>
            </label>
            {availableUsernames.length > 0 && (
              <SelectMenu
                label="Filter by contributor"
                options={filterOptions}
                value={selectedUsername ?? ''}
                onChange={value => setSelectedUsername(value || null)}
                className="w-48"
              />
            )}
          </div>
        </div>

        {/* Scrollable timeline container for mobile */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: 600 }}>
            <TimelineHeader labelWidth={LABEL_WIDTH} />

            {/* Trace Rows */}
            <div className="relative rounded-xs border border-border bg-surface">
              <TimelineGrid labelWidth={LABEL_WIDTH} />

              {/* Span rows */}
              {visibleSpans.map(span => {
                const colors = SPAN_COLORS[span.category];
                const startPercent = msToPercent(span.startMs);
                const endPercent = msToPercent(span.endMs);
                const widthPercent = Math.max(endPercent - startPercent, 0.5);
                const isHovered = hoveredSpan?.id === span.id;
                const duration = span.endMs - span.startMs;
                const isCollapsed = collapsedSpans.has(span.id);
                const childCount = spans.filter(s => s.parentId === span.id).length;

                return (
                  <div
                    key={span.id}
                    className={clsx(
                      'relative flex items-center border-b border-border/30 transition-colors',
                      isHovered && 'bg-surface/80'
                    )}
                    style={{ height: ROW_HEIGHT }}
                    onMouseEnter={() => handleMouseEnter(span)}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                  >
                    {/* Label column */}
                    <div
                      className={clsx(
                        'flex shrink-0 items-center gap-1 px-2 font-mono text-xs',
                        span.collapsible && 'cursor-pointer hover:bg-surface/50'
                      )}
                      style={{ width: LABEL_WIDTH, paddingLeft: 8 + span.depth * 16 }}
                      onClick={span.collapsible ? () => toggleCollapse(span.id) : undefined}
                      title={span.collapsible ? (isCollapsed ? `Expand (${childCount} items)` : 'Collapse') : undefined}
                    >
                      {span.collapsible ? (
                        <span className="text-muted transition-colors group-hover:text-foreground">
                          {isCollapsed ? '▶' : '▼'}
                        </span>
                      ) : (
                        span.depth > 0 && <span className="text-muted">{'└'}</span>
                      )}
                      {(span.clientName || span.executionClient) && (
                        <ClientLogo
                          client={span.clientName ?? span.executionClient ?? ''}
                          size={14}
                          className="shrink-0"
                        />
                      )}
                      <span
                        className={clsx('truncate', span.isLate ? 'text-danger' : 'text-foreground')}
                        title={span.label}
                      >
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
                          height: ROW_HEIGHT - 8,
                          minWidth: 4,
                        }}
                        title={span.details}
                        onClick={span.collapsible ? () => toggleCollapse(span.id) : undefined}
                      />
                    </div>

                    {/* Duration column - show absolute time for point-in-time events */}
                    <div
                      className={clsx(
                        'shrink-0 px-2 text-right font-mono text-xs',
                        span.isLate ? 'text-danger' : colors.text
                      )}
                      style={{ width: 80 }}
                    >
                      {span.isPointInTime ? formatMs(span.startMs) : formatMs(duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredSpan && mousePos && (
          <TimelineTooltip
            span={hoveredSpan}
            position={mousePos}
            containerWidth={containerRef.current?.clientWidth ?? 400}
          />
        )}
      </div>

      <TimelineLegend />
    </Card>
  );
}
