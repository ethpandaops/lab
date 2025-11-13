import type { JSX } from 'react';
import clsx from 'clsx';
import type { PhaseNodeProps } from '../../SlotProgressTimeline.types';

/**
 * PhaseNode - Circular icon indicator for a phase in the slot timeline
 *
 * Displays a phase with three states:
 * - Pending: Gray/muted, 50% opacity
 * - Active: Full color with pulsing animation
 * - Completed: Full color, no animation
 *
 * @example
 * ```tsx
 * import { CubeIcon } from '@heroicons/react/24/outline';
 *
 * <PhaseNode
 *   phase={{
 *     id: 'builders',
 *     label: 'Builders',
 *     icon: CubeIcon,
 *     color: 'primary',
 *     description: 'MEV builders bidding',
 *     stats: '43 builders bidded'
 *   }}
 *   status="active"
 *   showStats={true}
 * />
 * ```
 */
export function PhaseNode({ phase, status, showStats = true, onClick, className }: PhaseNodeProps): JSX.Element {
  const Icon = phase.icon;

  // Map phase color to CSS variable
  const getCSSVar = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      accent: 'var(--color-accent)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      danger: 'var(--color-danger)',
    };
    return colorMap[colorName] || colorMap.primary;
  };

  const phaseColor = getCSSVar(phase.color);

  return (
    <div className={clsx('flex w-20 flex-col items-center justify-center gap-2', className)}>
      {/* Circular icon container */}
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={clsx(
          'relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
          // Pending state
          status === 'pending' && [
            'border-border bg-surface opacity-50',
            onClick && 'cursor-not-allowed',
            !onClick && 'cursor-default',
          ],
          // Active state
          status === 'active' && [
            'animate-pulse border-foreground/20 ring-4',
            onClick && 'cursor-pointer hover:scale-105',
            !onClick && 'cursor-default',
          ],
          // Completed state
          status === 'completed' && [
            'border-foreground/10',
            onClick && 'cursor-pointer hover:scale-105',
            !onClick && 'cursor-default',
          ]
        )}
        style={
          status !== 'pending'
            ? {
                backgroundColor: phaseColor,
                boxShadow: status === 'active' ? `0 0 0 4px ${phaseColor}33` : undefined,
              }
            : undefined
        }
        title={phase.description}
        aria-label={`${phase.label}: ${status}`}
      >
        <Icon
          className={clsx(
            'size-6 transition-colors duration-300',
            status === 'pending' && 'text-muted',
            status === 'active' && 'text-background',
            status === 'completed' && 'text-background'
          )}
        />
      </button>

      {/* Phase label, time, and stats */}
      <div className="flex flex-col items-center justify-start gap-1">
        <span
          className={clsx(
            'text-center font-medium transition-colors duration-300',
            status === 'pending' && 'text-muted opacity-50',
            status === 'active' && 'text-foreground',
            status === 'completed' && 'text-foreground'
          )}
          style={{ fontSize: '10px' }}
        >
          {phase.label}
        </span>

        {/* Time badge - shows when phase occurred */}
        <span
          className={clsx(
            'text-center transition-colors duration-300',
            status === 'pending' && 'text-muted opacity-50',
            status === 'active' && 'text-foreground',
            status === 'completed' && 'text-muted',
            // Reserve space even when empty
            'min-h-[13px]'
          )}
          style={{
            fontSize: '11px',
            ...(status === 'active' ? { color: phaseColor } : {}),
          }}
        >
          {phase.id !== 'attesting' && phase.timestamp !== undefined
            ? phase.timestamp < 0
              ? `${Math.abs(phase.timestamp / 1000).toFixed(1)}s early`
              : `${(phase.timestamp / 1000).toFixed(1)}s`
            : '\u00A0'}
        </span>

        {/* Stats - always reserve space to prevent height changes */}
        <span
          className={clsx(
            'text-center transition-colors duration-300',
            status === 'pending' && 'text-muted opacity-50',
            status === 'active' && 'text-foreground',
            status === 'completed' && 'text-muted',
            // Reserve space even when empty
            'min-h-[10px]'
          )}
          style={{
            fontSize: '9px',
            ...(status === 'active' ? { color: phaseColor } : {}),
          }}
        >
          {showStats && phase.stats ? phase.stats : '\u00A0'}
        </span>
      </div>
    </div>
  );
}
