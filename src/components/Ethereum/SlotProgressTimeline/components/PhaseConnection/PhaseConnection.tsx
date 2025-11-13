import type { JSX } from 'react';
import clsx from 'clsx';
import type { PhaseConnectionProps } from '../../SlotProgressTimeline.types';

/**
 * PhaseConnection - Simple line between phases in the slot timeline
 */
export function PhaseConnection({
  progress,
  orientation,
  isActive: _isActive = false,
  className,
}: PhaseConnectionProps): JSX.Element {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={clsx(
        'relative bg-border/50',
        isHorizontal && 'h-px w-full',
        !isHorizontal && 'h-full w-px',
        className
      )}
      role="presentation"
      aria-hidden="true"
    >
      {/* Progress fill */}
      <div
        className={clsx(
          'absolute bg-primary/20',
          isHorizontal && 'top-0 left-0 h-full',
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
