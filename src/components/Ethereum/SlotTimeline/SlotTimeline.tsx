import { useState, type JSX } from 'react';
import clsx from 'clsx';
import type { SlotTimelineProps } from './SlotTimeline.types';

/**
 * SlotTimeline - A horizontal timeline component showing different phases with an externally controlled position indicator.
 *
 * Perfect for visualizing Ethereum beacon chain slot progression or any time-based multi-phase process.
 *
 * @example
 * ```tsx
 * const phases = [
 *   { label: 'Block Proposal', duration: 1, color: 'bg-primary' },
 *   { label: 'Attestation', duration: 4, color: 'bg-success' },
 *   { label: 'Aggregation', duration: 7, color: 'bg-warning' },
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

  // Track hover position for preview indicator
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  // Handle click on timeline
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!onTimeClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentClicked = (clickX / rect.width) * 100;
    const timeSeconds = (percentClicked / 100) * totalDuration;
    const timeMs = Math.round(timeSeconds * 1000);

    onTimeClick(timeMs);
  };

  // Handle mouse move for preview indicator
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!onTimeClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const percent = Math.min(100, Math.max(0, (mouseX / rect.width) * 100));
    setHoverPercent(percent);
  };

  const handleMouseLeave = (): void => {
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
            onTimeClick && 'cursor-pointer'
          )}
          style={{ height: `${height}px` }}
          role="progressbar"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={totalDuration}
          aria-label={ariaLabel}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onKeyDown={(e) => {
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
                phase.color,
                'relative transition-colors duration-200',
                index < phasePositions.length - 1 && 'border-r border-border/50'
              )}
              style={{ width: `${phase.widthPercent}%` }}
              title={phase.description ?? phase.label}
            >
              {/* Inline phase labels */}
              {showInlineLabels && (
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <span className="truncate text-xs/4 font-medium text-background/90">
                    {phase.label}
                  </span>
                </div>
              )}
              {/* Optional time labels inside segments */}
              {showTimeLabels && !showInlineLabels && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xs/4 font-medium text-background/80">
                    {phase.startTime}s
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
            className="absolute top-0 h-full w-0.5 bg-foreground shadow-sm transition-all duration-300"
            style={{ left: `${currentTimePercent}%` }}
          />
        </div>

        {/* Current time label */}
        <div
          className="pointer-events-none absolute -top-6 transition-all duration-300"
          style={{ left: `${currentTimePercent}%`, transform: 'translateX(-50%)' }}
        >
          <span className="text-xs/4 font-semibold text-foreground">
            {currentTime.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Phase labels below timeline */}
      {showPhaseLabels && phases.length > 0 && (
        <div className="mt-8 flex gap-4">
          {phasePositions.map((phase, index) => (
            <div
              key={`${phase.label}-label-${index}`}
              className="flex items-center gap-2"
            >
              {/* Color indicator */}
              <div className={clsx('size-3 rounded-xs border border-border', phase.color)} />
              {/* Phase label */}
              <span className="text-xs/4 text-muted">
                {phase.label}
                {showTimeLabels && (
                  <span className="ml-1 text-2xs/4 text-muted/70">
                    ({phase.duration}s)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
