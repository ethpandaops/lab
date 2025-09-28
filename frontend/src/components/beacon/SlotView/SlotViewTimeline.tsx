import { memo } from 'react';
import { EventTimeline } from '@/components/beacon/EventTimeline';

interface Event {
  id: string;
  timestamp: number;
  type: string;
  node: string;
  location: string;
  data: any;
}

interface SlotViewTimelineProps {
  events: Event[];
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentTime: number;
  isPlaying: boolean;
  onPlayPauseClick: () => void;
  slot?: number;
  onPreviousSlot: () => void;
  onNextSlot: () => void;
  isLive: boolean;
  className?: string;
  onTimeSeek: (timeInSeconds: number) => void;
}

function SlotViewTimelineComponent(props: SlotViewTimelineProps) {
  return <EventTimeline {...props} />;
}

export const SlotViewTimeline = memo(
  SlotViewTimelineComponent,
  (prev, next) =>
    prev.events === next.events &&
    prev.loading === next.loading &&
    prev.isCollapsed === next.isCollapsed &&
    prev.currentTime === next.currentTime &&
    prev.isPlaying === next.isPlaying &&
    prev.slot === next.slot &&
    prev.isLive === next.isLive,
);
