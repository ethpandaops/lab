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
  PauseReason,
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
  slotDuration: initialSlotDuration = SECONDS_PER_SLOT * 1000,
  playbackSpeed: initialPlaybackSpeed = 1,
  tableName = 'fct_slot',
  targetFps = 60,
  callbacks,
}: SlotPlayerProviderProps): React.ReactElement {
  // Get slot bounds from the API (TanStack Query handles retries internally)
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
  const [slotDuration, setSlotDuration] = useState<number>(initialSlotDuration);
  const [isStalled, setIsStalled] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);

  // Refs for animation frame management
  const animationFrameRef = useRef<number | null>(null);
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

  // AbortController for cleanup of async operations
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize AbortController
  useEffect(() => {
    abortControllerRef.current = new AbortController();

    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  // Reset to initial slot when bounds change and we don't have a valid slot
  useEffect(() => {
    if (bounds && currentSlot === 0 && !initialSlot) {
      const newInitialSlot = getInitialSlot();
      setCurrentSlot(newInitialSlot);
      setSlotProgress(0);
      slotProgressRef.current = 0;
    }
  }, [bounds, currentSlot, initialSlot, getInitialSlot]);

  // Handle bounds update race conditions - clamp currentSlot to valid range
  useEffect(() => {
    if (bounds) {
      if (currentSlot < minSlot) {
        setCurrentSlot(minSlot);
        setSlotProgress(0);
        slotProgressRef.current = 0;
      } else if (currentSlot > maxSlot) {
        setCurrentSlot(maxSlot);
        setSlotProgress(0);
        slotProgressRef.current = 0;
      }
    }
  }, [bounds, currentSlot, minSlot, maxSlot]);

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

  // Main playback loop using requestAnimationFrame
  useEffect(() => {
    const frameInterval = 1000 / targetFps; // Target interval between frames
    let lastProcessedTime = performance.now();

    const animate = (currentTime: number): void => {
      const state = stateRef.current;

      // Calculate time delta since last processed frame
      const deltaTime = currentTime - lastProcessedTime;

      // Only process if enough time has passed for target FPS
      if (deltaTime >= frameInterval) {
        if (state.isPlaying) {
          const currentProgress = slotProgressRef.current;
          const progressDelta = deltaTime * state.playbackSpeed;
          const nextProgress = currentProgress + progressDelta;

          if (nextProgress >= state.slotDuration) {
            if (state.mode === 'continuous') {
              setCurrentSlot(current => {
                const nextSlot = current + 1;
                if (nextSlot > state.maxSlot) {
                  setIsPlaying(false);
                  setPauseReason('boundary');
                  callbacks?.onPlayStateChange?.(false, 'boundary');
                  return current;
                }
                callbacks?.onSlotChange?.(nextSlot);
                return nextSlot;
              });
              slotProgressRef.current = 0;
              setSlotProgress(0);
            } else {
              // Single mode - stop at end of slot
              setIsPlaying(false);
              setPauseReason(null);
              callbacks?.onPlayStateChange?.(false, null);
              slotProgressRef.current = state.slotDuration;
              setSlotProgress(state.slotDuration);
            }
          } else {
            slotProgressRef.current = nextProgress;
            setSlotProgress(nextProgress);
          }
        }

        lastProcessedTime = currentTime;
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targetFps, callbacks]);

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
        callbacks?.onPlayStateChange?.(true, null);
      },

      pause: () => {
        setIsPlaying(false);
        setPauseReason('manual');
        callbacks?.onPlayStateChange?.(false, 'manual');
      },

      toggle: () => {
        setIsPlaying(prev => {
          // If we're about to play and in single mode at the end, restart
          if (!prev && mode === 'single' && slotProgressRef.current >= slotDuration) {
            slotProgressRef.current = 0;
            setSlotProgress(0);
          }
          const newPauseReason = prev ? 'manual' : null;
          setPauseReason(newPauseReason);
          callbacks?.onPlayStateChange?.(!prev, newPauseReason);
          return !prev;
        });
      },

      setMode: (newMode: SlotMode) => setMode(newMode),

      goToSlot: (slot: number) => {
        const bounded = Math.max(minSlot, Math.min(maxSlot, slot));
        setCurrentSlot(bounded);
        slotProgressRef.current = 0;
        setSlotProgress(0);
        callbacks?.onSlotChange?.(bounded);
      },

      nextSlot: () => {
        setCurrentSlot(prev => {
          const next = prev + 1;
          const newSlot = next > maxSlot ? prev : next;
          if (newSlot !== prev) {
            callbacks?.onSlotChange?.(newSlot);
          }
          return newSlot;
        });
        slotProgressRef.current = 0;
        setSlotProgress(0);
      },

      previousSlot: () => {
        setCurrentSlot(prev => {
          const next = prev - 1;
          const newSlot = next < minSlot ? prev : next;
          if (newSlot !== prev) {
            callbacks?.onSlotChange?.(newSlot);
          }
          return newSlot;
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

      setSlotDuration: (ms: number) => {
        const newDuration = Math.max(1000, Math.min(60000, ms)); // Clamp between 1s and 60s
        setSlotDuration(newDuration);
        // Reset progress if current progress exceeds new duration
        if (slotProgressRef.current > newDuration) {
          slotProgressRef.current = 0;
          setSlotProgress(0);
        }
      },

      setPlaybackSpeed: (speed: number) => {
        const clampedSpeed = Math.max(0.1, Math.min(10, speed)); // Clamp between 0.1x and 10x
        setPlaybackSpeed(clampedSpeed);
      },

      markStalled: () => {
        setIsStalled(true);
        setIsPlaying(false);
        callbacks?.onStalled?.();
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
        callbacks?.onSlotChange?.(targetSlot);
        callbacks?.onPlayStateChange?.(true, null);
      },
    }),
    [minSlot, maxSlot, slotDuration, mode, callbacks]
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
      pauseReason,
    }),
    [currentSlot, isPlaying, mode, isStalled, isStale, staleBehindSlots, isLive, pauseReason]
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
