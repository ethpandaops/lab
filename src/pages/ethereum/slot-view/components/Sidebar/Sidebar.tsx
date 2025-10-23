import type { JSX } from 'react';
import clsx from 'clsx';
import { Timeline } from '@/pages/ethereum/slot-view/components/Timeline';
import { ScrollingTimeline } from '@/components/Lists/ScrollingTimeline';
import type { SidebarProps } from './Sidebar.types';

/**
 * Sidebar - A page-specific sidebar component for the slot-view page.
 *
 * Combines Timeline and ScrollingTimeline components, coordinating
 * their shared currentTime prop. Timeline is displayed above
 * ScrollingTimeline.
 */
export function Sidebar({
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
}: SidebarProps): JSX.Element {
  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {/* Slot Timeline with controls */}
      <Timeline
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
