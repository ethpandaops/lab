/**
 * Slot Progress Timeline Utilities
 *
 * Pure functions for calculating phase timings and statuses in the Ethereum slot lifecycle.
 * These utilities support the SlotProgressTimeline component.
 */

/**
 * Represents a slot phase event with timing information
 */
export interface SlotPhaseEvent {
  /** Phase identifier */
  id: string;
  /** When this phase occurred (milliseconds from slot start, 0-12000) */
  timestamp: number;
  /** Optional duration of this phase in milliseconds */
  duration?: number;
  /** Optional metadata for this phase */
  metadata?: Record<string, unknown>;
}

/**
 * Computed phase timing with status information
 */
export interface ComputedPhaseTiming {
  /** Phase identifier */
  id: string;
  /** Start time in milliseconds from slot start */
  startTime: number;
  /** End time in milliseconds from slot start (if duration known) */
  endTime?: number;
  /** Duration in milliseconds (if known) */
  duration?: number;
  /** Whether this phase is currently active */
  isActive: boolean;
  /** Whether this phase has completed */
  isCompleted: boolean;
  /** Progress percentage within this phase (0-100, only for active phases) */
  progressPercent?: number;
}

/**
 * Phase status enumeration
 */
export type PhaseStatus = 'pending' | 'active' | 'completed';

/**
 * Computes timing information for all phases based on event data and current time.
 *
 * @param events - Array of phase events with timestamps
 * @param currentTime - Current time in milliseconds from slot start (0-12000)
 * @returns Array of computed phase timings with status information
 *
 * @example
 * ```tsx
 * const events = [
 *   { id: 'builders', timestamp: 500 },
 *   { id: 'relaying', timestamp: 2000, duration: 1000 },
 *   { id: 'proposing', timestamp: 3500 }
 * ];
 * const timings = computePhaseTimings(events, 2500);
 * // Returns timings with isActive and isCompleted flags
 * ```
 */
export function computePhaseTimings(events: SlotPhaseEvent[], currentTime: number): ComputedPhaseTiming[] {
  // Sort events by timestamp to ensure proper ordering
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  return sortedEvents.map((event, index) => {
    const startTime = event.timestamp;
    const endTime = event.duration !== undefined ? startTime + event.duration : undefined;

    // Determine if this phase is completed
    // A phase is completed if:
    // 1. It has a duration and currentTime > endTime, OR
    // 2. It has no duration and currentTime > timestamp and there's a next phase, OR
    // 3. It's the last phase with no duration and is in the past
    const isCompleted = (() => {
      if (endTime !== undefined) {
        return currentTime >= endTime;
      }
      // No duration - consider completed if current time is past this phase
      // and we're at or past the next phase (if it exists)
      const nextEvent = sortedEvents[index + 1];
      if (nextEvent) {
        return currentTime >= nextEvent.timestamp;
      }
      // Last phase with no duration - consider completed if we're past its timestamp
      return currentTime > startTime;
    })();

    // Determine if this phase is currently active
    // A phase is active if:
    // 1. currentTime >= startTime AND
    // 2. NOT completed
    const isActive = currentTime >= startTime && !isCompleted;

    // Calculate progress percentage within this phase (only for active phases)
    let progressPercent: number | undefined;
    if (isActive && endTime !== undefined) {
      const elapsed = currentTime - startTime;
      progressPercent = Math.min(100, Math.max(0, (elapsed / event.duration!) * 100));
    }

    return {
      id: event.id,
      startTime,
      endTime,
      duration: event.duration,
      isActive,
      isCompleted,
      progressPercent,
    };
  });
}

/**
 * Determines the status of a specific phase based on current time.
 *
 * @param phaseTimestamp - When the phase occurred (ms from slot start)
 * @param currentTime - Current time (ms from slot start, 0-12000)
 * @param phaseDuration - Optional duration of the phase in ms
 * @param nextPhaseTimestamp - Optional timestamp of the next phase
 * @returns Phase status: 'pending', 'active', or 'completed'
 *
 * @example
 * ```tsx
 * getPhaseStatus(2000, 2500, 1000) // 'active'
 * getPhaseStatus(2000, 3500, 1000) // 'completed'
 * getPhaseStatus(5000, 2500) // 'pending'
 * ```
 */
export function getPhaseStatus(
  phaseTimestamp: number,
  currentTime: number,
  phaseDuration?: number,
  nextPhaseTimestamp?: number
): PhaseStatus {
  // If current time hasn't reached this phase yet
  if (currentTime < phaseTimestamp) {
    return 'pending';
  }

  // If phase has a duration
  if (phaseDuration !== undefined) {
    const endTime = phaseTimestamp + phaseDuration;
    if (currentTime >= endTime) {
      return 'completed';
    }
    return 'active';
  }

  // Phase has no duration - check against next phase
  if (nextPhaseTimestamp !== undefined && currentTime >= nextPhaseTimestamp) {
    return 'completed';
  }

  // Current time is past this phase but before next phase (or this is the last phase)
  return 'active';
}

/**
 * Calculates the progress percentage for a phase.
 *
 * @param phaseTimestamp - When the phase started (ms from slot start)
 * @param currentTime - Current time (ms from slot start, 0-12000)
 * @param phaseDuration - Duration of the phase in ms
 * @returns Progress percentage (0-100)
 *
 * @example
 * ```tsx
 * calculatePhaseProgress(2000, 2500, 1000) // 50
 * calculatePhaseProgress(2000, 3000, 1000) // 100
 * calculatePhaseProgress(2000, 1500, 1000) // 0
 * ```
 */
export function calculatePhaseProgress(phaseTimestamp: number, currentTime: number, phaseDuration: number): number {
  if (currentTime < phaseTimestamp) {
    return 0;
  }

  const elapsed = currentTime - phaseTimestamp;
  const progress = (elapsed / phaseDuration) * 100;

  return Math.min(100, Math.max(0, progress));
}

/**
 * Calculates the overall timeline position as a percentage.
 *
 * @param currentTime - Current time (ms from slot start, 0-12000)
 * @param totalDuration - Total slot duration in ms (default: 12000)
 * @returns Position percentage (0-100)
 *
 * @example
 * ```tsx
 * calculateTimelinePosition(6000, 12000) // 50
 * calculateTimelinePosition(12000, 12000) // 100
 * calculateTimelinePosition(0, 12000) // 0
 * ```
 */
export function calculateTimelinePosition(currentTime: number, totalDuration: number = 12000): number {
  return Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));
}

/**
 * Formats a timestamp in milliseconds to a display string.
 *
 * @param timestampMs - Timestamp in milliseconds
 * @param format - Format type: 'short' (e.g., "2.5s") or 'long' (e.g., "2500ms")
 * @returns Formatted time string
 *
 * @example
 * ```tsx
 * formatPhaseTimestamp(2500, 'short') // "2.5s"
 * formatPhaseTimestamp(2500, 'long') // "2500ms"
 * ```
 */
export function formatPhaseTimestamp(timestampMs: number, format: 'short' | 'long' = 'short'): string {
  if (format === 'long') {
    return `${timestampMs}ms`;
  }

  const seconds = timestampMs / 1000;
  return `${seconds.toFixed(1)}s`;
}

/**
 * Finds the currently active phase based on current time.
 *
 * @param timings - Array of computed phase timings
 * @returns The active phase timing, or undefined if no phase is active
 *
 * @example
 * ```tsx
 * const timings = computePhaseTimings(events, 2500);
 * const active = findActivePhase(timings);
 * // Returns the timing object with isActive === true
 * ```
 */
export function findActivePhase(timings: ComputedPhaseTiming[]): ComputedPhaseTiming | undefined {
  return timings.find(timing => timing.isActive);
}

/**
 * Checks if all phases in the timeline are completed.
 *
 * @param timings - Array of computed phase timings
 * @returns True if all phases are completed
 *
 * @example
 * ```tsx
 * const timings = computePhaseTimings(events, 12000);
 * const allDone = areAllPhasesCompleted(timings); // true if currentTime > all phases
 * ```
 */
export function areAllPhasesCompleted(timings: ComputedPhaseTiming[]): boolean {
  return timings.every(timing => timing.isCompleted);
}
