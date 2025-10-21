import type { SlotPhase } from '@/utils/beacon';

export interface SlotTimelineProps {
  /** Array of phases that make up the slot */
  phases: SlotPhase[];
  /** Current time position in seconds (0 to total duration) */
  currentTime: number;
  /** Total slot duration in seconds (defaults to sum of phase durations) */
  slotDuration?: number;
  /** Show time labels on the timeline */
  showTimeLabels?: boolean;
  /** Show phase labels below the timeline */
  showPhaseLabels?: boolean;
  /** Show phase labels inside the timeline bars */
  showInlineLabels?: boolean;
  /** Show current time indicator above the timeline */
  showCurrentTime?: boolean;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
  /** Height of the timeline bar in pixels */
  height?: number;
  /** Callback fired when user clicks on the timeline with the clicked time in milliseconds */
  onTimeClick?: (timeMs: number) => void;
}
