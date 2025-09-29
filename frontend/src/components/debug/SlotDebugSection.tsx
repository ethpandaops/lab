import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useContext } from 'react';
import { useDebugSection } from '@/hooks/useDebugSection';
import {
  SlotProgressContext,
  SlotStateContext,
  SlotConfigContext,
  SlotActionsContext,
} from '@/contexts/slot';

export function SlotDebugSection() {
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

  useDebugSection(
    'slot-context',
    'Slot Context State',
    () => (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
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
            <span className="text-tertiary">mode:</span>{' '}
            <span className="text-primary">{mode}</span>
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
          <div className="mt-2 flex items-center gap-2 text-yellow-500 text-xs">
            <AlertCircle className="size-3" />
            <span>Stalled: Slot {currentSlot} unavailable</span>
          </div>
        )}
        {isStale && (
          <div className="mt-2 flex items-center gap-2 text-yellow-500 text-xs">
            <AlertTriangle className="size-3" />
            <span>Stale: {staleBehindSlots} slots behind</span>
          </div>
        )}
      </div>
    ),
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
    0, // Priority - show this first
  );

  return null; // This component only registers debug info, doesn't render anything
}
