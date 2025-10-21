import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTableBounds } from '@/hooks/useBounds';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { SECONDS_PER_SLOT } from '@/utils/beacon';
import {
  SlotPlayerProgressContext,
  SlotPlayerStateContext,
  SlotPlayerConfigContext,
  SlotPlayerActionsContext,
  SlotPlayerMetaContext,
} from '@/contexts/SlotPlayerContext';
import type {
  SlotMode,
  SlotPlayerProviderProps,
  SlotPlayerActions,
  SlotPlayerMetaContextValue,
} from '@/contexts/SlotPlayerContext';

/**
 * Provider for slot player functionality.
 *
 * Manages the state and playback of Ethereum consensus layer slots,
 * providing a player-like interface for navigating through historical slots.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SlotPlayerProvider initialPlaying={true} initialMode="continuous">
 *       <SlotViewer />
 *     </SlotPlayerProvider>
 *   );
 * }
 * ```
 */
export function SlotPlayerProvider({
  children,
  initialSlot,
  initialMode = 'continuous',
  initialPlaying = false,
  slotDuration = SECONDS_PER_SLOT * 1000,
  playbackSpeed: initialPlaybackSpeed = 1,
  tableName = 'fct_slot',
}: SlotPlayerProviderProps): React.ReactElement {
  // Get slot bounds from the API
  const { data: bounds, isLoading, error } = useTableBounds(tableName);

  // Get current wall clock slot for staleness checking
  const { slot: wallClockSlot } = useBeaconClock();

  // Extract min/max slots from bounds, with safe defaults
  const minSlot = useMemo(() => bounds?.min ?? 0, [bounds]);
  const maxSlot = useMemo(() => bounds?.max ?? 0, [bounds]);

  // Calculate initial slot
  const getInitialSlot = useCallback(() => {
    if (initialSlot !== undefined) return initialSlot;
    // Use maxSlot minus 2 as the safe default to avoid data availability issues
    const safeSlot = maxSlot > 2 ? maxSlot - 2 : maxSlot;
    return safeSlot;
  }, [initialSlot, maxSlot]);

  // State management
  const [currentSlot, setCurrentSlot] = useState<number>(getInitialSlot());
  const [slotProgress, setSlotProgress] = useState<number>(0);
  const slotProgressRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlaying);
  const [mode, setMode] = useState<SlotMode>(initialMode);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(initialPlaybackSpeed);
  const [isStalled, setIsStalled] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<'manual' | 'boundary' | null>(null);

  // Refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef({
    isPlaying,
    slotDuration,
    mode,
    maxSlot,
    playbackSpeed,
    currentSlot,
  });

  // Update ref with latest state
  useEffect(() => {
    stateRef.current = {
      isPlaying,
      slotDuration,
      mode,
      maxSlot,
      playbackSpeed,
      currentSlot,
    };
  });

  // Reset to initial slot when bounds change and we don't have a valid slot
  useEffect(() => {
    if (bounds && currentSlot === 0 && !initialSlot) {
      const newInitialSlot = getInitialSlot();
      setCurrentSlot(newInitialSlot);
      setSlotProgress(0);
      slotProgressRef.current = 0;
    }
  }, [bounds, currentSlot, initialSlot, getInitialSlot]);

  // Auto-resume when reaching the live edge boundary in continuous mode
  useEffect(() => {
    if (!isPlaying && pauseReason === 'boundary' && mode === 'continuous' && currentSlot < maxSlot) {
      setIsPlaying(true);
      setPauseReason(null);
    }
  }, [maxSlot, currentSlot, isPlaying, pauseReason, mode]);

  // Calculate derived state
  const staleBehindSlots = wallClockSlot - currentSlot;
  const isStale = staleBehindSlots > 10;

  // isLive means we're within 10 slots of the safe max slot (near the blockchain head with buffer)
  const isLive = useMemo(() => {
    const safeMaxSlot = maxSlot > 2 ? maxSlot - 2 : maxSlot;
    return safeMaxSlot - currentSlot <= 10;
  }, [maxSlot, currentSlot]);

  // Main playback interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const state = stateRef.current;

      if (!state.isPlaying) {
        return;
      }

      const currentProgress = slotProgressRef.current;
      const nextProgress = currentProgress + 100 * state.playbackSpeed;

      if (nextProgress >= state.slotDuration) {
        if (state.mode === 'continuous') {
          setCurrentSlot(current => {
            const nextSlot = current + 1;
            if (nextSlot > state.maxSlot) {
              setIsPlaying(false);
              setPauseReason('boundary');
              return current;
            }
            return nextSlot;
          });
          slotProgressRef.current = 0;
          setSlotProgress(0);
        } else {
          // Single mode - stop at end of slot
          setIsPlaying(false);
          slotProgressRef.current = state.slotDuration;
          setSlotProgress(state.slotDuration);
        }
      } else {
        slotProgressRef.current = nextProgress;
        setSlotProgress(nextProgress);
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Define actions
  const actions = useMemo<SlotPlayerActions>(
    () => ({
      play: () => {
        // In single mode, if we're at the end of the slot, restart from beginning
        if (mode === 'single' && slotProgressRef.current >= slotDuration) {
          slotProgressRef.current = 0;
          setSlotProgress(0);
        }
        setIsPlaying(true);
        setPauseReason(null);
      },

      pause: () => {
        setIsPlaying(false);
        setPauseReason('manual');
      },

      toggle: () => {
        setIsPlaying(prev => {
          // If we're about to play and in single mode at the end, restart
          if (!prev && mode === 'single' && slotProgressRef.current >= slotDuration) {
            slotProgressRef.current = 0;
            setSlotProgress(0);
          }
          setPauseReason(prev ? 'manual' : null);
          return !prev;
        });
      },

      setMode: (newMode: SlotMode) => setMode(newMode),

      goToSlot: (slot: number) => {
        const bounded = Math.max(minSlot, Math.min(maxSlot, slot));
        setCurrentSlot(bounded);
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },

      nextSlot: () => {
        setCurrentSlot(prev => {
          const next = prev + 1;
          return next > maxSlot ? prev : next;
        });
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },

      previousSlot: () => {
        setCurrentSlot(prev => {
          const next = prev - 1;
          return next < minSlot ? prev : next;
        });
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },

      rewind: () => {
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },

      fastForward: () => {
        slotProgressRef.current = slotDuration;
        setSlotProgress(slotDuration);
      },

      seekToTime: (ms: number) => {
        const bounded = Math.max(0, Math.min(slotDuration, ms));
        slotProgressRef.current = bounded;
        setSlotProgress(bounded);
      },

      setSlotDuration: (_ms: number) => {
        // Note: In this implementation, slotDuration is fixed at initialization
        // If you need dynamic duration changes, you'd need to add state for it
        console.warn('Dynamic slot duration changes not implemented yet');
      },

      setPlaybackSpeed: (speed: number) => setPlaybackSpeed(speed),

      markStalled: () => {
        setIsStalled(true);
        setIsPlaying(false);
      },

      clearStalled: () => setIsStalled(false),

      jumpToLive: () => {
        // Jump to maxSlot - 2 for safety buffer
        const targetSlot = maxSlot > 2 ? maxSlot - 2 : maxSlot;
        setCurrentSlot(targetSlot);
        slotProgressRef.current = 0;
        setSlotProgress(0);
        setIsPlaying(true);
        setPauseReason(null);
      },
    }),
    [minSlot, maxSlot, slotDuration, mode]
  );

  // Memoize context values
  const progressValue = useMemo(
    () => ({
      slotProgress,
    }),
    [slotProgress]
  );

  const stateValue = useMemo(
    () => ({
      currentSlot,
      isPlaying,
      mode,
      isStalled,
      isStale,
      staleBehindSlots,
      isLive,
    }),
    [currentSlot, isPlaying, mode, isStalled, isStale, staleBehindSlots, isLive]
  );

  const configValue = useMemo(
    () => ({
      slotDuration,
      playbackSpeed,
      minSlot,
      maxSlot,
    }),
    [slotDuration, playbackSpeed, minSlot, maxSlot]
  );

  const metaValue = useMemo<SlotPlayerMetaContextValue>(
    () => ({
      isLoading,
      error,
    }),
    [isLoading, error]
  );

  return (
    <SlotPlayerMetaContext.Provider value={metaValue}>
      <SlotPlayerActionsContext.Provider value={actions}>
        <SlotPlayerConfigContext.Provider value={configValue}>
          <SlotPlayerStateContext.Provider value={stateValue}>
            <SlotPlayerProgressContext.Provider value={progressValue}>{children}</SlotPlayerProgressContext.Provider>
          </SlotPlayerStateContext.Provider>
        </SlotPlayerConfigContext.Provider>
      </SlotPlayerActionsContext.Provider>
    </SlotPlayerMetaContext.Provider>
  );
}
