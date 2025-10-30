import { useState, type JSX } from 'react';
import clsx from 'clsx';
import type { SlotTimelineProps } from './SlotTimeline.types';

/**
 * SlotTimeline - A horizontal timeline component showing different phases with an externally controlled position indicator.
 *
 * Perfect for visualizing Ethereum beacon chain slot progression or any time-based multi-phase process.
 *
 * Features time cutover markers showing phase boundaries (0-4s for Block Proposal shows "0" at start and "4" at the boundary).
 *
 * @example
 * ```tsx
 * const phases = [
 *   { label: 'Block Proposal', duration: 4, className: 'bg-primary' },
 *   { label: 'Attestation', duration: 4, className: 'bg-success' },
 *   { label: 'Aggregation', duration: 4, className: 'bg-warning' },
 * ];
 *
 * <SlotTimeline phases={phases} currentTime={5.5} />
 * ```
 */
export function SlotTimeline({
  phases,
  currentTime,
  slotDuration,
  showTimeLabels = false,
  showPhaseLabels = false,
  showInlineLabels = true,
  showCurrentTime = false,
  showTimeCutovers = true,
  ariaLabel = 'Slot Timeline',
  height = 48,
  onTimeClick,
}: SlotTimelineProps): JSX.Element {
  // Calculate total duration from phases or use provided slotDuration
  const totalDuration = slotDuration ?? phases.reduce((sum, phase) => sum + phase.duration, 0);

  // Calculate cumulative positions for each phase
  let cumulativeTime = 0;
  const phasePositions = phases.map(phase => {
    const startTime = cumulativeTime;
    const endTime = startTime + phase.duration;
    const startPercent = (startTime / totalDuration) * 100;
    const widthPercent = (phase.duration / totalDuration) * 100;

    cumulativeTime = endTime;

    return {
      ...phase,
      startTime,
      endTime,
      startPercent,
      widthPercent,
    };
  });

  // Calculate current time position as percentage
  const currentTimePercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  // Track hover position for preview indicator and drag state
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate time from position
  const calculateTimeFromPosition = (clientX: number, rect: DOMRect): number => {
    const posX = clientX - rect.left;
    const percent = Math.min(100, Math.max(0, (posX / rect.width) * 100));
    return Math.round((percent / 100) * totalDuration);
  };

  // Handle click on timeline
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!onTimeClick || isDragging) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const timeMs = calculateTimeFromPosition(event.clientX, rect);
    onTimeClick(timeMs);
  };

  // Handle mouse/pointer down - start drag
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!onTimeClick) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);

    const rect = event.currentTarget.getBoundingClientRect();
    const timeMs = calculateTimeFromPosition(event.clientX, rect);
    onTimeClick(timeMs);
  };

  // Handle pointer move - continue drag or show preview
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!onTimeClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const percent = Math.min(100, Math.max(0, (mouseX / rect.width) * 100));

    if (isDragging) {
      const timeMs = calculateTimeFromPosition(event.clientX, rect);
      onTimeClick(timeMs);
    } else {
      setHoverPercent(percent);
    }
  };

  // Handle pointer up - end drag
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (isDragging) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setIsDragging(false);
    }
  };

  const handlePointerLeave = (): void => {
    setHoverPercent(null);
  };

  return (
    <div className="w-full">
      <h4 className="sr-only">{ariaLabel}</h4>

      {/* Timeline container */}
      <div className="relative w-full">
        {/* Phase segments */}
        <div
          className={clsx(
            'relative flex overflow-hidden rounded-sm border border-border',
            onTimeClick && 'cursor-pointer touch-none select-none',
            isDragging && 'cursor-grabbing'
          )}
          style={{ height: `${height}px` }}
          role="progressbar"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={totalDuration}
          aria-label={ariaLabel}
          onClick={handleTimelineClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTimelineClick(e as unknown as React.MouseEvent<HTMLDivElement>);
            }
          }}
          tabIndex={onTimeClick ? 0 : undefined}
        >
          {phasePositions.map((phase, index) => (
            <div
              key={`${phase.label}-${index}`}
              className={clsx(
                phase.className,
                'relative transition-colors duration-200',
                index < phasePositions.length - 1 && 'border-r border-border/50'
              )}
              style={{ width: `${phase.widthPercent}%` }}
              title={phase.description ?? phase.label}
            >
              {/* Inline phase labels */}
              {showInlineLabels && (
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <span className={clsx('truncate text-xs/4', phase.textClassName ?? 'font-medium text-background/90')}>
                    {phase.label}
                  </span>
                </div>
              )}
              {/* Optional time labels inside segments */}
              {showTimeLabels && !showInlineLabels && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={clsx('text-2xs/4', phase.textClassName ?? 'font-medium text-background/80')}>
                    {phase.startTime / 1000}s
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Hover preview indicator */}
          {hoverPercent !== null && (
            <div
              className="pointer-events-none absolute top-0 h-full w-0.5 bg-muted/60 transition-opacity duration-150"
              style={{ left: `${hoverPercent}%` }}
            />
          )}

          {/* Current time indicator - vertical line */}
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground shadow-sm"
            style={{ left: `${currentTimePercent}%` }}
          />
        </div>

        {/* Time cutover markers */}
        {showTimeCutovers && (
          <div className="mt-1 flex w-full justify-between">
            <span className="text-xs text-muted">0s</span>
            {phasePositions.map((phase, index) => (
              <span key={`cutover-${phase.label}-${index}`} className="text-xs text-muted">
                {(phase.endTime / 1000).toFixed(0)}s
              </span>
            ))}
          </div>
        )}

        {/* Current time label */}
        {showCurrentTime && (
          <div
            className="pointer-events-none absolute -top-6 transition-all duration-300"
            style={{ left: `${currentTimePercent}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-xs/4 font-semibold text-foreground">{(currentTime / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* Phase labels below timeline */}
      {showPhaseLabels && phases.length > 0 && (
        <div className="mt-8 flex gap-4">
          {phasePositions.map((phase, index) => (
            <div key={`${phase.label}-label-${index}`} className="flex items-center gap-2">
              {/* Color indicator */}
              <div className={clsx('size-3 rounded-xs border border-border', phase.className)} />
              {/* Phase label */}
              <span className="text-xs/4 text-muted">
                {phase.label}
                {showTimeLabels && <span className="text-2xs/4 ml-1 text-muted/70">({phase.duration / 1000}s)</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
