import type { ForkInfo } from '@/utils/forks';

export interface MobileSlotHeaderProps {
  currentSlot: number;
  activeFork?: ForkInfo | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onBackward: () => void;
  onForward: () => void;
  isLive?: boolean;
}
