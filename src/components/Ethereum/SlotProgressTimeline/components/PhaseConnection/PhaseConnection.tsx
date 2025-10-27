import type { JSX } from 'react';
import clsx from 'clsx';
import type { PhaseConnectionProps } from '../../SlotProgressTimeline.types';

/**
 * PhaseConnection - Progress line between phases in the slot timeline
 *
 * Displays a connection line that can be horizontal or vertical.
 * Animates fill progress in live mode using CSS transitions.
 *
 * @example
 * ```tsx
 * // Horizontal connection with 75% progress
 * <PhaseConnection
 *   progress={75}
 *   orientation="horizontal"
 *   isActive={true}
 * />
 *
 * // Vertical connection (completed)
 * <PhaseConnection
 *   progress={100}
 *   orientation="vertical"
 *   isActive={false}
 * />
 * ```
 */
export function PhaseConnection({
  progress,
  orientation,
  isActive = false,
  className,
}: PhaseConnectionProps): JSX.Element {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={clsx(
        'relative',
        // Horizontal: full width, fixed height
        isHorizontal && 'h-0.5 w-full',
        // Vertical: fixed width, full height
        !isHorizontal && 'h-full w-0.5',
        className
      )}
      role="presentation"
      aria-hidden="true"
    >
      {/* Background line */}
      <div className={clsx('absolute bg-border', isHorizontal && 'h-full w-full', !isHorizontal && 'h-full w-full')} />

      {/* Progress fill */}
      <div
        className={clsx(
          'absolute',
          // Active state - use primary color
          isActive && 'bg-primary',
          // Inactive/completed state - use muted color
          !isActive && 'bg-muted',
          // Horizontal: fill from left to right
          isHorizontal && 'top-0 left-0 h-full',
          // Vertical: fill from top to bottom
          !isHorizontal && 'top-0 left-0 w-full'
        )}
        style={
          isHorizontal
            ? {
                width: `${Math.max(0, Math.min(100, progress))}%`,
              }
            : {
                height: `${Math.max(0, Math.min(100, progress))}%`,
              }
        }
      />
    </div>
  );
}
