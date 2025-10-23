import { type JSX } from 'react';
import clsx from 'clsx';
import { Timeline } from '@/pages/experiments/slot-view/components/Timeline';
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
  isLive = false,
  ariaLabel = 'Slot View Timeline',
  autoScroll = true,
  formatTime,
  className,
}: SidebarProps): JSX.Element {
  return (
    <div className={clsx('flex h-full flex-col gap-6 overflow-hidden', className)}>
      {/* Slot Timeline section */}
      <div className="shrink-0">
        <h2 className="mb-4 text-xl/7 font-semibold text-foreground">Slot Timeline</h2>
        <Timeline
          phases={phases}
          currentTime={currentTime}
          slotDuration={slotDuration}
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onBackward={onBackward}
          onForward={onForward}
          onTimeClick={onTimeClick}
          isLive={isLive}
          ariaLabel={ariaLabel}
        />
      </div>

      {/* Scrolling Timeline - fills remaining space with scroll */}
      <ScrollingTimeline
        items={items}
        currentTime={currentTime}
        autoScroll={autoScroll}
        formatTime={formatTime}
        className="min-h-0"
      />
    </div>
  );
}
