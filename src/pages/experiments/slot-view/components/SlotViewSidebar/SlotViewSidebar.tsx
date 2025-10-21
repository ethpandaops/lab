import type { JSX } from 'react';
import clsx from 'clsx';
import { SlotViewTimeline } from '@/pages/experiments/slot-view/components/SlotViewTimeline';
import { ScrollingTimeline } from '@/components/Lists/ScrollingTimeline';
import type { SlotViewSidebarProps } from './SlotViewSidebar.types';

/**
 * SlotViewSidebar - A page-specific sidebar component for the slot-view page.
 *
 * Combines SlotViewTimeline and ScrollingTimeline components, coordinating
 * their shared currentTime prop. SlotViewTimeline is displayed above
 * ScrollingTimeline.
 */
export function SlotViewSidebar({
  phases,
  currentTime,
  slotDuration,
  items,
  isPlaying = false,
  onPlayPause,
  onBackward,
  onForward,
  onTimeClick,
  title = 'Timeline',
  isLive = false,
  ariaLabel = 'Slot View Timeline',
  scrollingTimelineHeight = '500px',
  autoScroll = true,
  formatTime,
  className,
}: SlotViewSidebarProps): JSX.Element {
  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {/* Slot Timeline with controls */}
      <SlotViewTimeline
        phases={phases}
        currentTime={currentTime}
        slotDuration={slotDuration}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        onBackward={onBackward}
        onForward={onForward}
        onTimeClick={onTimeClick}
        title={title}
        isLive={isLive}
        ariaLabel={ariaLabel}
      />

      {/* Scrolling Timeline */}
      <ScrollingTimeline
        items={items}
        currentTime={currentTime}
        height={scrollingTimelineHeight}
        autoScroll={autoScroll}
        formatTime={formatTime}
      />
    </div>
  );
}
