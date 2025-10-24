import { type JSX } from 'react';
import { useSlotPlayer } from '@/hooks/useSlotPlayer';
import { Button } from '@/components/Elements/Button';
import { Card } from '@/components/Layout/Card';
import { PlayIcon, PauseIcon, BackwardIcon, ForwardIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

/**
 * Slot player controls for navigating contributor metrics over time.
 *
 * Provides:
 * - Play/pause toggle
 * - Previous/next slot navigation
 * - Jump to live edge
 * - Current slot display
 * - Playback speed controls
 *
 * Must be used within a SlotPlayerProvider context.
 */
export function SlotPlayerControls(): JSX.Element {
  const { currentSlot, isPlaying, isLive, playbackSpeed, actions } = useSlotPlayer();

  const speeds = [0.5, 1, 2, 5, 10];

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {/* Current Slot Display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm/6 text-muted">Current Slot</div>
            <div className="text-2xl/8 font-bold text-foreground">{currentSlot.toLocaleString()}</div>
          </div>
          {isLive && <div className="rounded-sm bg-success/10 px-3 py-1 text-sm/6 font-medium text-success">LIVE</div>}
        </div>

        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={actions.previousSlot} aria-label="Previous slot">
            <BackwardIcon className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={actions.toggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </Button>

          <Button size="sm" onClick={actions.nextSlot} aria-label="Next slot">
            <ForwardIcon className="h-4 w-4" />
          </Button>

          <div className="mx-4 hidden h-6 w-px bg-border md:block" />

          <Button size="sm" onClick={actions.jumpToLive} disabled={isLive} aria-label="Jump to live">
            <ChevronDoubleRightIcon className="h-4 w-4" />
            <span className="ml-1">Live</span>
          </Button>

          {/* Speed Controls */}
          <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
            <span className="text-sm/6 text-muted">Speed:</span>
            {speeds.map(speed => (
              <Button
                key={speed}
                size="sm"
                variant={playbackSpeed === speed ? 'primary' : 'secondary'}
                onClick={() => actions.setPlaybackSpeed(speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
