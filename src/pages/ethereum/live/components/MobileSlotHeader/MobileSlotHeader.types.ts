export interface MobileSlotHeaderProps {
  currentSlot: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onBackward: () => void;
  onForward: () => void;
  isLive?: boolean;
}
