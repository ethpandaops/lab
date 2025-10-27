import type { JSX } from 'react';
import { useMemo } from 'react';
import clsx from 'clsx';
import type { SlotProgressTimelineProps, PhaseData } from './SlotProgressTimeline.types';
import { PhaseNode } from './components/PhaseNode';
import { PhaseConnection } from './components/PhaseConnection';

/**
 * SlotProgressTimeline - Visualizes Ethereum slot phases as a timeline
 *
 * Displays the progression of phases within a 12-second Ethereum slot.
 * Supports two modes:
 * - 'live': Shows real-time progress with animations
 * - 'static': Shows all phases as completed
 *
 * Responsive:
 * - Desktop (>=768px): Horizontal timeline with axis below
 * - Mobile (<768px): Vertical stack
 *
 * @example
 * ```tsx
 * import { CubeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
 *
 * const phases = [
 *   {
 *     id: 'builders',
 *     label: 'Builders',
 *     icon: CubeIcon,
 *     color: 'primary',
 *     timestamp: 500,
 *     description: 'MEV builders bidding',
 *     stats: '43 builders bidded'
 *   },
 *   {
 *     id: 'relaying',
 *     label: 'Relaying',
 *     icon: ArrowPathIcon,
 *     color: 'accent',
 *     timestamp: 2000,
 *     duration: 1000,
 *     description: 'Relay connection',
 *     stats: '2 relays'
 *   }
 * ];
 *
 * // Live mode
 * <SlotProgressTimeline
 *   phases={phases}
 *   mode="live"
 *   currentTime={2500}
 * />
 *
 * // Static mode
 * <SlotProgressTimeline
 *   phases={phases}
 *   mode="static"
 * />
 * ```
 */
export function SlotProgressTimeline({
  phases,
  mode,
  currentTime = 0,
  showStats = true,
  onPhaseClick,
  className,
}: SlotProgressTimelineProps): JSX.Element {
  // Validate required props
  if (mode === 'live' && currentTime === undefined) {
    console.warn('SlotProgressTimeline: currentTime is required for live mode');
  }

  // Compute phase statuses and connection progress
  const enrichedPhases = useMemo(() => {
    if (mode === 'static') {
      // In static mode, all phases are completed
      return phases.map(phase => ({
        ...phase,
        isActive: false,
        isCompleted: true,
      }));
    }

    // Live mode - compute statuses based on currentTime
    return phases.map((phase, index) => {
      const phaseTime = phase.timestamp ?? 0;
      const nextPhase = phases[index + 1];
      const nextPhaseTime = nextPhase?.timestamp;

      // Determine if this phase is completed
      let isCompleted = false;
      if (phase.duration !== undefined) {
        // Has explicit duration
        isCompleted = currentTime >= phaseTime + phase.duration;
      } else if (nextPhaseTime !== undefined) {
        // No duration, use next phase timestamp
        isCompleted = currentTime >= nextPhaseTime;
      } else {
        // Last phase with no duration - consider completed if we're past it
        isCompleted = currentTime > phaseTime;
      }

      // Determine if this phase is active
      const isActive = currentTime >= phaseTime && !isCompleted;

      return {
        ...phase,
        isActive,
        isCompleted,
      };
    });
  }, [phases, mode, currentTime]);

  // Compute connection progress between phases
  const connectionProgress = useMemo(() => {
    if (mode === 'static') {
      // All connections are 100% in static mode
      return phases.map(() => 100);
    }

    return phases.map((phase, index) => {
      const nextPhase = phases[index + 1];
      if (!nextPhase) {
        // No connection after the last phase
        return 100;
      }

      const phaseTime = phase.timestamp ?? 0;
      const nextPhaseTime = nextPhase.timestamp ?? 0;
      const duration = nextPhaseTime - phaseTime;

      // If current time hasn't reached this phase yet
      if (currentTime < phaseTime) {
        return 0;
      }

      // If current time is past the next phase
      if (currentTime >= nextPhaseTime) {
        return 100;
      }

      // Calculate progress between phases
      const elapsed = currentTime - phaseTime;
      return Math.min(100, Math.max(0, (elapsed / duration) * 100));
    });
  }, [phases, mode, currentTime]);

  // Handler for phase clicks
  const handlePhaseClick = (phase: PhaseData): void => {
    if (onPhaseClick) {
      onPhaseClick(phase);
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      {/* Desktop: Horizontal layout */}
      <div className="hidden h-32 md:block">
        <div className="flex h-full w-full items-center px-4">
          {enrichedPhases.map((phase, index) => {
            const status = phase.isActive ? 'active' : phase.isCompleted ? 'completed' : 'pending';
            const hasConnection = index < enrichedPhases.length - 1;
            const isConnectionActive =
              mode === 'live' && connectionProgress[index] > 0 && connectionProgress[index] < 100;

            return (
              <>
                {/* Phase node */}
                <div key={phase.id} className="shrink-0">
                  <PhaseNode
                    phase={phase}
                    status={status}
                    showStats={showStats}
                    onClick={onPhaseClick ? () => handlePhaseClick(phase) : undefined}
                  />
                </div>

                {/* Connection to next phase */}
                {hasConnection && (
                  <div key={`connection-${phase.id}`} className="mx-4 flex-1">
                    <PhaseConnection
                      progress={connectionProgress[index]}
                      orientation="horizontal"
                      isActive={isConnectionActive}
                    />
                  </div>
                )}
              </>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical layout */}
      <div className="md:hidden">
        <div className="flex flex-col gap-4" style={{ minHeight: '50vh' }}>
          {enrichedPhases.map((phase, index) => {
            const status = phase.isActive ? 'active' : phase.isCompleted ? 'completed' : 'pending';
            const hasConnection = index < enrichedPhases.length - 1;
            const isConnectionActive =
              mode === 'live' && connectionProgress[index] > 0 && connectionProgress[index] < 100;

            return (
              <div key={phase.id} className="flex flex-col items-center">
                {/* Phase node */}
                <PhaseNode
                  phase={phase}
                  status={status}
                  showStats={showStats}
                  onClick={onPhaseClick ? () => handlePhaseClick(phase) : undefined}
                />

                {/* Connection to next phase */}
                {hasConnection && (
                  <div className="my-2 h-12">
                    <PhaseConnection
                      progress={connectionProgress[index]}
                      orientation="vertical"
                      isActive={isConnectionActive}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
