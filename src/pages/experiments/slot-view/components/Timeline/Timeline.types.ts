import type { SlotPhase } from '@/utils/beacon';

export interface TimelineProps {
  /** Array of phases that make up the slot */
  phases: SlotPhase[];
  /** Current time position in seconds (0 to total duration) */
  currentTime: number;
  /** Total slot duration in seconds (defaults to sum of phase durations) */
  slotDuration?: number;
  /** Whether the playback is currently playing */
  isPlaying?: boolean;
  /** Callback fired when play/pause button is clicked */
  onPlayPause?: () => void;
  /** Callback fired when backward button is clicked */
  onBackward?: () => void;
  /** Callback fired when forward button is clicked */
  onForward?: () => void;
  /** Callback fired when user clicks on the timeline with the clicked time in milliseconds */
  onTimeClick?: (timeMs: number) => void;
  /** Optional title for the timeline (defaults to "Timeline") */
  title?: string;
  /** Show "Live" indicator */
  isLive?: boolean;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
}
