import type { JSX } from 'react';
import clsx from 'clsx';
import type { TimelineAxisProps } from '../../SlotProgressTimeline.types';

/**
 * TimelineAxis - Time scale markers for the slot timeline
 *
 * Displays time tick marks at regular intervals (0s, 2s, 4s, 6s, 8s, 10s, 12s).
 * Only visible in desktop horizontal layout.
 *
 * @example
 * ```tsx
 * // Horizontal axis with default 7 ticks (0s to 12s)
 * <TimelineAxis orientation="horizontal" />
 *
 * // Vertical axis (typically hidden)
 * <TimelineAxis orientation="vertical" />
 * ```
 */
export function TimelineAxis({
  orientation,
  totalDuration = 12000,
  tickCount = 7,
  className,
}: TimelineAxisProps): JSX.Element {
  const isHorizontal = orientation === 'horizontal';

  // Generate tick marks
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const timeMs = (i / (tickCount - 1)) * totalDuration;
    const timeSec = timeMs / 1000;
    const position = (i / (tickCount - 1)) * 100;

    return {
      id: i,
      label: `${timeSec.toFixed(0)}s`,
      position,
    };
  });

  if (!isHorizontal) {
    // Vertical axis is typically not shown, but we can render it if needed
    return (
      <div className={clsx('flex h-full flex-col justify-between py-2', className)} role="presentation">
        {ticks.map(tick => (
          <div key={tick.id} className="flex items-center gap-2">
            <div className="h-px w-2 bg-border" />
            <span className="text-2xs text-muted">{tick.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal axis
  return (
    <div className={clsx('relative w-full', className)} role="presentation">
      {/* Axis line */}
      <div className="h-px w-full bg-border" />

      {/* Tick marks */}
      <div className="relative h-6 w-full">
        {ticks.map(tick => (
          <div
            key={tick.id}
            className="absolute -top-1 flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left: `${tick.position}%` }}
          >
            {/* Tick mark */}
            <div className="h-2 w-px bg-border" />
            {/* Tick label */}
            <span className="text-2xs text-muted">{tick.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
