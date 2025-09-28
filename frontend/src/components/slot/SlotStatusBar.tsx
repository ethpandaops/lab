import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useSlot } from '@/hooks/useSlot';

export function SlotStatusBar() {
  const slotData = useSlot();
  const {
    currentSlot,
    slotProgress,
    isPlaying,
    mode,
    slotDuration,
    playbackSpeed,
    minSlot,
    maxSlot,
    safeSlot,
    headSlot,
    isStalled,
    isStale,
    staleBehindSlots,
  } = slotData;

  return (
    <div className="bg-base-dark px-4 py-3 font-mono text-xs">
      <div className="mb-2 text-sm font-semibold text-accent">🐛 useSlot Debug</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <div>
          <span className="text-tertiary">currentSlot:</span>{' '}
          <span className="text-primary">{currentSlot}</span>
        </div>
        <div>
          <span className="text-tertiary">slotProgress:</span>{' '}
          <span className="text-primary">{slotProgress.toFixed(0)}ms</span>
        </div>
        <div>
          <span className="text-tertiary">isPlaying:</span>{' '}
          <span className={isPlaying ? 'text-green-500' : 'text-red-500'}>
            {isPlaying.toString()}
          </span>
        </div>
        <div>
          <span className="text-tertiary">mode:</span> <span className="text-primary">{mode}</span>
        </div>
        <div>
          <span className="text-tertiary">slotDuration:</span>{' '}
          <span className="text-primary">{slotDuration}ms</span>
        </div>
        <div>
          <span className="text-tertiary">playbackSpeed:</span>{' '}
          <span className="text-primary">{playbackSpeed}x</span>
        </div>
        <div>
          <span className="text-tertiary">minSlot:</span>{' '}
          <span className="text-primary">{minSlot}</span>
        </div>
        <div>
          <span className="text-tertiary">maxSlot:</span>{' '}
          <span className="text-primary">{maxSlot}</span>
        </div>
        <div>
          <span className="text-tertiary">safeSlot:</span>{' '}
          <span className="text-primary">{safeSlot}</span>
        </div>
        <div>
          <span className="text-tertiary">headSlot:</span>{' '}
          <span className="text-primary">{headSlot}</span>
        </div>
        <div>
          <span className="text-tertiary">isStalled:</span>{' '}
          <span className={isStalled ? 'text-yellow-500' : 'text-green-500'}>
            {isStalled.toString()}
          </span>
        </div>
        <div>
          <span className="text-tertiary">isStale:</span>{' '}
          <span className={isStale ? 'text-yellow-500' : 'text-green-500'}>
            {isStale.toString()}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-tertiary">staleBehindSlots:</span>{' '}
          <span className={staleBehindSlots > 10 ? 'text-yellow-500' : 'text-primary'}>
            {staleBehindSlots}
          </span>
        </div>
      </div>
      {isStalled && (
        <div className="mt-2 flex items-center gap-2 text-yellow-500">
          <AlertCircle className="size-4" />
          <span>Stalled: Slot {currentSlot} unavailable</span>
        </div>
      )}
      {isStale && (
        <div className="mt-2 flex items-center gap-2 text-yellow-500">
          <AlertTriangle className="size-4" />
          <span>Stale: {staleBehindSlots} slots behind</span>
        </div>
      )}
    </div>
  );
}
