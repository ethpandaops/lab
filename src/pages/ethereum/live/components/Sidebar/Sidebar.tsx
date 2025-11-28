import { type JSX, memo } from 'react';
import clsx from 'clsx';
import { Timeline } from '@/pages/ethereum/live/components/Timeline';
import { ScrollingTimeline } from '@/components/Lists/ScrollingTimeline';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import type { SidebarProps } from './Sidebar.types';

/**
 * Sidebar - A page-specific sidebar component for the live page.
 *
 * Combines Timeline and ScrollingTimeline components, coordinating
 * their shared currentTime prop. Timeline is displayed above
 * ScrollingTimeline.
 */
function SidebarComponent({
  currentSlot,
  activeFork,
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
  // Calculate epoch from slot number
  const epoch = Math.floor(currentSlot / SLOTS_PER_EPOCH);

  return (
    <div className={clsx('flex h-full flex-col overflow-hidden', className)}>
      {/* Slot Timeline section */}
      <div className="shrink-0 border-b border-border p-4">
        {/* Header with Slot number and Epoch subtitle */}
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">
              Slot <Slot slot={currentSlot} />
            </h2>
            <p className="text-xs text-muted">
              Epoch <Epoch epoch={epoch} />
            </p>
          </div>
          {activeFork && (
            <div className="flex flex-col items-center gap-0.5" style={{ color: activeFork.color }}>
              <span className="text-2xl leading-none">{activeFork.emoji}</span>
              <span className="text-[10px] leading-none font-medium">{activeFork.displayName}</span>
            </div>
          )}
        </div>

        {/* Timeline */}
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

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: SidebarProps, nextProps: SidebarProps): boolean => {
  return (
    prevProps.currentSlot === nextProps.currentSlot &&
    prevProps.activeFork?.name === nextProps.activeFork?.name &&
    prevProps.phases === nextProps.phases &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.slotDuration === nextProps.slotDuration &&
    prevProps.items === nextProps.items &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.onPlayPause === nextProps.onPlayPause &&
    prevProps.onBackward === nextProps.onBackward &&
    prevProps.onForward === nextProps.onForward &&
    prevProps.onTimeClick === nextProps.onTimeClick
  );
};

export const Sidebar = memo(SidebarComponent, arePropsEqual);
