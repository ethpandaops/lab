import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useContext } from 'react';
import { useDebugSection } from '@/hooks/useDebugSection';
import {
  SlotProgressContext,
  SlotStateContext,
  SlotConfigContext,
  SlotActionsContext,
} from '@/contexts/slot';

function SlotStatusBar() {
  // Check if we're within a SlotProvider
  const progressContext = useContext(SlotProgressContext);
  const stateContext = useContext(SlotStateContext);
  const configContext = useContext(SlotConfigContext);
  const actionsContext = useContext(SlotActionsContext);

  // If not within a SlotProvider, don't register debug section
  if (!progressContext || !stateContext || !configContext || !actionsContext) {
    return null;
  }

  const slotData = {
    ...progressContext,
    ...stateContext,
    ...configContext,
    actions: actionsContext,
  };

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

  // Register debug section with the exact same UI as before
  useDebugSection(
    'slot-status-bar',
    'Slot Status',
    () => {
      const progressPercent = ((slotProgress / slotDuration) * 100).toFixed(1);
      const currentEpoch = Math.floor(currentSlot / 32);

      return (
        <div className="font-mono text-xs space-y-3">
          {/* Current Position */}
          <div>
            <div className="text-blue-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
              Current Position
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-2">
              <div>
                <span className="text-tertiary">Slot:</span>{' '}
                <span className="text-primary font-semibold">{currentSlot}</span>
                {currentSlot === safeSlot && (
                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/30 text-yellow-500 text-[9px] font-bold rounded uppercase">
                    LIMIT
                  </span>
                )}
              </div>
              <div>
                <span className="text-tertiary">Epoch:</span>{' '}
                <span className="text-primary">{currentEpoch}</span>
              </div>
              <div className="col-span-2">
                <span className="text-tertiary">Progress:</span>{' '}
                <span className="text-primary">{slotProgress.toFixed(0)}ms</span>
                <span className="text-tertiary text-[10px]"> ({progressPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Playback */}
          <div>
            <div className="text-green-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
              Playback
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-2">
              <div>
                <span className="text-tertiary">Status:</span>{' '}
                {isPlaying ? (
                  <span className="text-green-500">▶ Playing</span>
                ) : (
                  <span className="text-red-500">⏸ Paused</span>
                )}
              </div>
              <div>
                <span className="text-tertiary">Mode:</span>{' '}
                <span className="text-primary">{mode}</span>
              </div>
              <div>
                <span className="text-tertiary">Speed:</span>{' '}
                <span className="text-primary">{playbackSpeed}x</span>
              </div>
              <div>
                <span className="text-tertiary">Duration:</span>{' '}
                <span className="text-primary">{slotDuration}ms</span>
              </div>
            </div>
          </div>

          {/* Boundaries */}
          <div>
            <div className="text-purple-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
              Boundaries
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-2">
              <div>
                <span className="text-tertiary">Min:</span>{' '}
                <span className="text-primary">{minSlot}</span>
              </div>
              <div>
                <span className="text-tertiary">Max:</span>{' '}
                <span className="text-primary">{maxSlot}</span>
              </div>
              <div>
                <span className="text-tertiary">Safe:</span>{' '}
                <span className="text-primary">{safeSlot}</span>
              </div>
              <div>
                <span className="text-tertiary">Head:</span>{' '}
                <span className="text-primary">{headSlot}</span>
              </div>
              <div className="col-span-2 mt-1">
                <span className="text-tertiary">Range:</span>{' '}
                <span className="text-primary text-[10px]">
                  {minSlot} → {maxSlot}
                </span>
                <span className="text-tertiary text-[10px]"> ({maxSlot - minSlot} slots)</span>
              </div>
            </div>
          </div>

          {/* Status */}
          {(isStalled || isStale || staleBehindSlots > 0) && (
            <div>
              <div className="text-yellow-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
                Status
              </div>
              <div className="pl-2 space-y-1">
                {isStalled && (
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertCircle className="size-3" />
                    <span>Stalled - Slot {currentSlot} unavailable</span>
                  </div>
                )}
                {isStale && (
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="size-3" />
                    <span>Stale - {staleBehindSlots} slots behind</span>
                  </div>
                )}
                {!isStalled && !isStale && staleBehindSlots > 0 && (
                  <div className="text-tertiary">
                    Behind by {staleBehindSlots} slot{staleBehindSlots !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    },
    [
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
    ],
    1, // Priority - show after SlotDebugSection
  );

  return null; // This component only registers debug info, doesn't render anything
}

export { SlotStatusBar };
