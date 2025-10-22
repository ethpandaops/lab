import type { JSX } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { SlotTimeline } from '@/components/Ethereum/SlotTimeline';
import type { TimelineProps } from './Timeline.types';

/**
 * Timeline - A page-specific timeline component for the slot-view page.
 *
 * Wraps the core SlotTimeline component with playback controls, title, and current time display.
 * Features backward/play-pause/forward controls and live indicator.
 */
export function Timeline({
  phases,
  currentTime,
  slotDuration,
  isPlaying = false,
  onPlayPause,
  onBackward,
  onForward,
  onTimeClick,
  title = 'Timeline',
  isLive = false,
  ariaLabel = 'Slot View Timeline',
}: TimelineProps): JSX.Element {
  return (
    <div className="w-full">
      {/* Header with title, controls, and current time */}
      <div className="mb-4 flex items-center justify-between gap-6">
        {/* Left: Title and Live indicator */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="size-2 animate-pulse rounded-full bg-success" />
              <span className="text-sm text-success">Live</span>
            </div>
          )}
        </div>

        {/* Center: Playback controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Backward button */}
          <button
            type="button"
            onClick={onBackward}
            className="flex size-10 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-muted focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Go backward"
            disabled={!onBackward}
          >
            <ChevronLeftIcon className="size-6" />
          </button>

          {/* Play/Pause button */}
          <button
            type="button"
            onClick={onPlayPause}
            className="flex size-10 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-muted focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!onPlayPause}
          >
            {isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
          </button>

          {/* Forward button */}
          <button
            type="button"
            onClick={onForward}
            className="flex size-10 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-muted focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
        onTimeClick={onTimeClick}
      />
    </div>
  );
}
