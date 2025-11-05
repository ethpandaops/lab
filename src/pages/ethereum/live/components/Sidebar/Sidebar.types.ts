import type { SlotPhase } from '@/utils/beacon';
import type { TimelineItem } from '@/components/Lists/ScrollingTimeline/ScrollingTimeline.types';
import type { ForkInfo } from '@/utils/forks';

export interface SidebarProps {
  /** Current slot number */
  currentSlot: number;
  /** Active fork information from wallclock */
  activeFork?: ForkInfo | null;
  /** Array of phases that make up the slot */
  phases: SlotPhase[];
  /** Current time position in milliseconds (0 to total duration) */
  currentTime: number;
  /** Total slot duration in milliseconds (defaults to sum of phase durations) */
  slotDuration?: number;
  /** Timeline items for the scrolling timeline */
  items: TimelineItem[];
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
  /** Show "Live" indicator */
  isLive?: boolean;
  /** Optional aria-label for slot timeline accessibility */
  ariaLabel?: string;
  /** Whether auto-scrolling is enabled on the scrolling timeline (default: true) */
  autoScroll?: boolean;
  /** Format function for the scrolling timeline timestamp display */
  formatTime?: (timestamp: number) => string;
  /** Optional className for custom styling */
  className?: string;
}
