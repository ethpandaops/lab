import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from 'lucide-react';
import { useSlot } from '@/hooks/useSlot';

export function SlotControls() {
  const { currentSlot, slotProgress, slotDuration, isPlaying, mode, playbackSpeed, minSlot, maxSlot, actions } =
    useSlot();

  const progressPercent = (slotProgress / slotDuration) * 100;
  const progressSeconds = (slotProgress / 1000).toFixed(1);
  const durationSeconds = (slotDuration / 1000).toFixed(1);

  return (
    <div className="flex flex-col gap-4 border-t border-subtle bg-nav p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm/6">
          <span className="font-mono text-primary">Slot {currentSlot}</span>
          <span className="text-secondary">
            {progressSeconds}s / {durationSeconds}s
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-sm bg-surface">
          <div className="h-full bg-accent transition-all duration-100" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={actions.previousSlot}
            disabled={currentSlot <= minSlot}
            className="flex size-8 items-center justify-center rounded-sm bg-surface hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous slot"
          >
            <SkipBack className="size-4" />
          </button>

          <button
            onClick={actions.rewind}
            className="flex size-8 items-center justify-center rounded-sm bg-surface hover:bg-surface/80"
            aria-label="Rewind"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            onClick={actions.toggle}
            className="flex size-10 items-center justify-center rounded-sm bg-accent hover:bg-accent/80"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>

          <button
            onClick={actions.fastForward}
            className="flex size-8 items-center justify-center rounded-sm bg-surface hover:bg-surface/80"
            aria-label="Fast forward"
          >
            <FastForward className="size-4" />
          </button>

          <button
            onClick={actions.nextSlot}
            disabled={currentSlot >= maxSlot}
            className="flex size-8 items-center justify-center rounded-sm bg-surface hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next slot"
          >
            <SkipForward className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={playbackSpeed}
            onChange={e => actions.setPlaybackSpeed(Number(e.target.value))}
            className="rounded-sm bg-surface px-3 py-1.5 text-sm/6 hover:bg-surface/80"
            aria-label="Playback speed"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>

          <button
            onClick={() => actions.setMode(mode === 'continuous' ? 'single' : 'continuous')}
            className="rounded-sm bg-surface px-3 py-1.5 text-sm/6 hover:bg-surface/80"
          >
            {mode === 'continuous' ? 'Continuous' : 'Single'}
          </button>

          <span className="text-sm/6 text-secondary">
            {minSlot} - {maxSlot}
          </span>
        </div>
      </div>
    </div>
  );
}
