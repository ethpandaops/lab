import type { JSX } from 'react';
import clsx from 'clsx';
import type { PhaseNodeProps } from '../../SlotProgressTimeline.types';

/**
 * PhaseNode - Indicator for a phase in the slot timeline
 *
 * Displays a phase with three states:
 * - Pending: Muted appearance
 * - Active: Highlighted
 * - Completed: Standard appearance
 */
export function PhaseNode({ phase, status, showStats = true, onClick, className }: PhaseNodeProps): JSX.Element {
  const Icon = phase.icon;

  return (
    <div className={clsx('flex flex-col items-center justify-start gap-2', className)}>
      {/* Icon container */}
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={clsx(
          'relative flex size-8 shrink-0 items-center justify-center rounded-md',
          // Pending state
          status === 'pending' && ['bg-surface text-muted', !onClick && 'cursor-default'],
          // Active state
          status === 'active' && [
            'bg-primary/10 text-primary',
            onClick && 'cursor-pointer',
            !onClick && 'cursor-default',
          ],
          // Completed state
          status === 'completed' && ['bg-surface text-muted', onClick && 'cursor-pointer', !onClick && 'cursor-default']
        )}
        title={phase.description}
        aria-label={`${phase.label}: ${status}`}
      >
        <Icon className="size-5" />
      </button>

      {/* Phase label and time */}
      <div className="flex flex-col items-center justify-start gap-0.5">
        {/* Label - always rendered with fixed line height */}
        <span
          className={clsx(
            'text-center text-[11px] leading-tight font-medium',
            status === 'pending' && 'text-muted/50',
            status === 'active' && 'text-foreground',
            status === 'completed' && 'text-muted'
          )}
        >
          {phase.label}
        </span>

        {/* Time badge - always rendered with fixed line height */}
        <span
          className={clsx(
            'text-center font-mono text-[10px] leading-tight',
            status === 'pending' && 'text-muted/50',
            status === 'active' && 'text-primary',
            status === 'completed' && 'text-muted/70'
          )}
        >
          {phase.id !== 'attesting' && phase.timestamp !== undefined
            ? phase.timestamp < 0
              ? `${Math.abs(phase.timestamp / 1000).toFixed(1)}s`
              : `${(phase.timestamp / 1000).toFixed(1)}s`
            : '\u00A0'}
        </span>

        {/* Stats - always rendered with fixed line height, hidden with opacity when empty */}
        <span
          className={clsx(
            'text-center text-[9px] leading-tight',
            status === 'pending' && 'text-muted/50',
            status === 'active' && 'text-muted',
            status === 'completed' && 'text-muted/70',
            // Hide with opacity when no stats, but maintain layout space
            !showStats || !phase.stats ? 'opacity-0' : 'opacity-100'
          )}
        >
          {showStats && phase.stats ? phase.stats : '\u00A0'}
        </span>
      </div>
    </div>
  );
}
