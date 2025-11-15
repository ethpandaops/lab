import { type JSX, memo, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { SlotTimeline } from '@/components/Ethereum/SlotTimeline';
import type { TimelineProps } from './Timeline.types';

/**
 * Timeline - A page-specific timeline component for the live page.
 *
 * Wraps the core SlotTimeline component with playback controls, title, and current time display.
 * Features backward/play-pause/forward controls and live indicator.
 */
function TimelineComponent({
  phases,
  currentTime,
  slotDuration,
  isPlaying = false,
  onPlayPause,
  onBackward,
  onForward,
  onTimeClick,
  isLive: _isLive = false,
  ariaLabel = 'Slot View Timeline',
}: TimelineProps): JSX.Element {
  // Memoize the timeline click handler to prevent SlotTimeline re-renders
  const handleSlotTimelineClick = useCallback(
    (time: number) => {
      // Pause playback if currently playing
      if (isPlaying && onPlayPause) {
        onPlayPause();
      }
      // Seek to the clicked/dragged time
      if (onTimeClick) {
        onTimeClick(time);
      }
    },
    [isPlaying, onPlayPause, onTimeClick]
  );

  return (
    <div className="w-full">
      {/* Header with controls and current time */}
      <div className="mb-4 flex items-center gap-6">
        {/* Playback controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Backward button */}
          <button
            type="button"
            onClick={onBackward}
            className="flex size-10 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-muted focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Go backward"
            disabled={!onBackward}
          >
            <ChevronLeftIcon className="size-6" />
          </button>

          {/* Play/Pause button */}
          <button
            type="button"
            onClick={onPlayPause}
            className="flex size-10 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-muted focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!onPlayPause}
          >
            {isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
          </button>

          {/* Forward button */}
          <button
            type="button"
            onClick={onForward}
            className="flex size-10 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-muted focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Go forward"
            disabled={!onForward}
          >
            <ChevronRightIcon className="size-6" />
          </button>
        </div>

        {/* Right: Current time display */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-2xl font-semibold text-foreground">{(currentTime / 1000).toFixed(1)}</span>
          <span className="text-sm text-muted">sec</span>
        </div>
      </div>

      {/* Timeline component */}
      <SlotTimeline
        phases={phases}
        currentTime={currentTime}
        slotDuration={slotDuration}
        showInlineLabels={true}
        showTimeCutovers={true}
        ariaLabel={ariaLabel}
        height={48}
        onTimeClick={handleSlotTimelineClick}
      />
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: TimelineProps, nextProps: TimelineProps): boolean => {
  return (
    prevProps.phases === nextProps.phases &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.slotDuration === nextProps.slotDuration &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.onPlayPause === nextProps.onPlayPause &&
    prevProps.onBackward === nextProps.onBackward &&
    prevProps.onForward === nextProps.onForward &&
    prevProps.onTimeClick === nextProps.onTimeClick
  );
};

export const Timeline = memo(TimelineComponent, arePropsEqual);
