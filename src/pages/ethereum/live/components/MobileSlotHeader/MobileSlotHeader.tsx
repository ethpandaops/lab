import { type JSX, memo } from 'react';
import { Link } from '@tanstack/react-router';
import { PlayIcon, PauseIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
import type { MobileSlotHeaderProps } from './MobileSlotHeader.types';

/**
 * MobileSlotHeader - Compact horizontal slot controls for mobile
 *
 * Displays slot number, epoch, and playback controls in a horizontal layout
 * optimized for mobile screens.
 */
function MobileSlotHeaderComponent({
  currentSlot,
  isPlaying,
  onPlayPause,
  onBackward,
  onForward,
  isLive = false,
}: MobileSlotHeaderProps): JSX.Element {
  const epoch = Math.floor(currentSlot / SLOTS_PER_EPOCH);

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
      {/* Slot Info */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <Link
            to="/ethereum/slots/$slot"
            params={{ slot: currentSlot.toString() }}
            className="font-mono text-lg font-bold text-foreground hover:text-primary"
          >
            <Slot slot={currentSlot} noLink />
          </Link>
          {isLive && <span className="text-xs font-medium text-success">Live</span>}
        </div>
        <Link
          to="/ethereum/epochs/$epoch"
          params={{ epoch: epoch.toString() }}
          className="text-xs text-muted hover:text-primary"
        >
          Epoch <Epoch epoch={epoch} noLink />
        </Link>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBackward}
          className="rounded-sm bg-primary p-1.5 text-background transition-colors hover:bg-primary/90"
          aria-label="Previous slot"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button
          onClick={onPlayPause}
          className="rounded-sm bg-primary p-1.5 text-background transition-colors hover:bg-primary/90"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>
        <button
          onClick={onForward}
          className="rounded-sm bg-primary p-1.5 text-background transition-colors hover:bg-primary/90"
          aria-label="Next slot"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: MobileSlotHeaderProps, nextProps: MobileSlotHeaderProps): boolean => {
  return (
    prevProps.currentSlot === nextProps.currentSlot &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.onPlayPause === nextProps.onPlayPause &&
    prevProps.onBackward === nextProps.onBackward &&
    prevProps.onForward === nextProps.onForward
  );
};

export const MobileSlotHeader = memo(MobileSlotHeaderComponent, arePropsEqual);
