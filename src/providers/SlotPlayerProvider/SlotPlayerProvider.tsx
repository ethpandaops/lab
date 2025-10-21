import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useTablesBounds } from '@/hooks/useBounds';
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
 * ## Performance Optimizations
 *
 * This provider uses several performance optimizations:
 * - **Context splitting** - Separates frequently-updating values (progress) from stable ones
 * - **useCallback** - All actions are memoized to prevent child re-renders
 * - **useLayoutEffect** - Animation loop cleanup happens synchronously before re-paint
 * - **requestAnimationFrame** - Smooth 60fps playback tied to browser refresh rate
 *
 * ## Callback Stability
 *
 * **IMPORTANT**: For optimal performance, wrap all callbacks in `useCallback` or use
 * `useStableCallback` for even better ergonomics:
 *
 * ```tsx
 * import { useStableCallback } from '@/hooks/useSlotPlayer';
 *
 * // Option 1: useStableCallback (recommended - stable reference, fresh state)
 * const handleSlotChange = useStableCallback((slot: number) => {
 *   console.log('Slot changed:', slot);
 * });
 *
 * const callbacks = useMemo(() => ({
 *   onSlotChange: handleSlotChange,
 * }), [handleSlotChange]);
 *
 * // Option 2: useCallback (manual dependency management)
 * const handleSlotChange = useCallback((slot: number) => {
 *   console.log('Slot changed:', slot);
 * }, []);
 *
 * const callbacks = useMemo(() => ({
 *   onSlotChange: handleSlotChange,
 * }), [handleSlotChange]);
 * ```
 *
 * Without memoization, passing unstable callbacks will cause the animation loop
 * to restart on every render, degrading performance.
 *
 * ## Error Handling
 *
 * **Production Recommendation**: Wrap this provider in an Error Boundary to handle
 * API failures gracefully. The provider exposes loading/error states via
 * `useSlotPlayerMeta()` for custom error UI.
 *
 * ```tsx
 * <ErrorBoundary fallback={<ErrorPage />}>
 *   <SlotPlayerProvider>
 *     <App />
 *   </SlotPlayerProvider>
 * </ErrorBoundary>
 * ```
 *
 * ## Testing
 *
 * When testing components that use this provider, wrap them in a test provider:
 *
 * ```tsx
 * import { render } from '@testing-library/react';
 * import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
 *
 * const wrapper = ({ children }) => (
 *   <SlotPlayerProvider initialSlot={100} tables={['fct_slot']}>
 *     {children}
 *   </SlotPlayerProvider>
 * );
 *
 * test('my component', () => {
 *   render(<MyComponent />, { wrapper });
 * });
 * ```
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SlotPlayerProvider
 *       tables={['fct_block', 'fct_attestation']}
 *       initialPlaying={true}
 *       initialMode="continuous"
 *     >
 *       <SlotViewer />
 *     </SlotPlayerProvider>
 *   );
 * }
 * ```
 */
export function SlotPlayerProvider({
  children,
  tables,
  initialSlot,
  initialMode = 'continuous',
  initialPlaying = false,
  slotDuration: initialSlotDuration = SECONDS_PER_SLOT * 1000,
  playbackSpeed: initialPlaybackSpeed = 1,
  callbacks,
}: SlotPlayerProviderProps): React.ReactElement {
  // Get slot bounds from the API (TanStack Query handles retries internally)
  const { data: boundsData, isLoading, error } = useTablesBounds(tables);

  // Get current wall clock slot for staleness checking
  const { slot: wallClockSlot } = useBeaconClock();

  // Extract aggregated min/max from bounds data
  const minSlot = useMemo(() => boundsData?.aggregate.minOfMins ?? 0, [boundsData]);
  const maxSlot = useMemo(() => boundsData?.aggregate.maxOfMaxes ?? 0, [boundsData]);

  // Calculate initial slot
  const getInitialSlot = useCallback(() => {
    if (initialSlot !== undefined) return initialSlot;
    // Use maxSlot minus 2 as the safe default to avoid data availability issues
    const safeSlot = maxSlot > 2 ? maxSlot - 2 : maxSlot;
    return safeSlot;
  }, [initialSlot, maxSlot]);

  // State management
  const [currentSlot, setCurrentSlot] = useState<number>(getInitialSlot());
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlaying);
  const [mode, setMode] = useState<SlotMode>(initialMode);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(initialPlaybackSpeed);
  const [slotDuration, setSlotDuration] = useState<number>(initialSlotDuration);
  const [isStalled, setIsStalled] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);

  /**
   * Progress tracking uses both ref and state intentionally:
   * - `slotProgressRef` - Read by animation loop without causing effect re-runs
   * - `slotProgress` - Triggers React re-renders for UI updates
   *
   * This dual-tracking pattern is necessary for requestAnimationFrame loops to avoid
   * stale closures while maintaining 60fps React updates. Do not consolidate.
   */
  const [slotProgress, setSlotProgress] = useState<number>(0);
  const slotProgressRef = useRef<number>(0);

  /**
   * Animation frame management and state snapshot.
   * The stateRef captures the latest state for the animation loop to avoid
   * recreating the effect when state changes.
   */
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef({
    isPlaying,
    slotDuration,
    mode,
    maxSlot,
    playbackSpeed,
    currentSlot,
  });

  // Sync state to ref during render (safe for refs, avoids one-frame staleness)
  stateRef.current = {
    isPlaying,
    slotDuration,
    mode,
    maxSlot,
    playbackSpeed,
    currentSlot,
  };

  // Reset to initial slot when bounds change and we don't have a valid slot
  useEffect(() => {
    if (boundsData && currentSlot === 0 && !initialSlot) {
      const newInitialSlot = getInitialSlot();
      setCurrentSlot(newInitialSlot);
      setSlotProgress(0);
      slotProgressRef.current = 0;
    }
  }, [boundsData, currentSlot, initialSlot, getInitialSlot]);

  // Handle bounds update race conditions - clamp currentSlot to valid range
  useEffect(() => {
    if (boundsData) {
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
  }, [boundsData, currentSlot, minSlot, maxSlot]);

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
  // Using useLayoutEffect to ensure cleanup happens synchronously before re-paint,
  // preventing the animation frame from escaping cleanup logic
  useLayoutEffect(() => {
    let lastProcessedTime = performance.now();

    const animate = (currentTime: number): void => {
      const state = stateRef.current;

      // Calculate time delta since last frame
      const deltaTime = currentTime - lastProcessedTime;
      lastProcessedTime = currentTime;

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
  }, [callbacks]);

  // Define actions using useCallback for optimal performance
  const play = useCallback(() => {
    // In single mode, if we're at the end of the slot, restart from beginning
    if (mode === 'single' && slotProgressRef.current >= slotDuration) {
      slotProgressRef.current = 0;
      setSlotProgress(0);
    }
    setIsPlaying(true);
    setPauseReason(null);
    callbacks?.onPlayStateChange?.(true, null);
  }, [mode, slotDuration, callbacks]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    setPauseReason('manual');
    callbacks?.onPlayStateChange?.(false, 'manual');
  }, [callbacks]);

  const toggle = useCallback(() => {
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
  }, [mode, slotDuration, callbacks]);

  const setModeAction = useCallback((newMode: SlotMode) => {
    setMode(newMode);
  }, []);

  const goToSlot = useCallback(
    (slot: number) => {
      const bounded = Math.max(minSlot, Math.min(maxSlot, slot));
      setCurrentSlot(bounded);
      slotProgressRef.current = 0;
      setSlotProgress(0);
      callbacks?.onSlotChange?.(bounded);
    },
    [minSlot, maxSlot, callbacks]
  );

  const nextSlot = useCallback(() => {
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
  }, [maxSlot, callbacks]);

  const previousSlot = useCallback(() => {
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
  }, [minSlot, callbacks]);

  const rewind = useCallback(() => {
    slotProgressRef.current = 0;
    setSlotProgress(0);
  }, []);

  const fastForward = useCallback(() => {
    slotProgressRef.current = slotDuration;
    setSlotProgress(slotDuration);
  }, [slotDuration]);

  const seekToTime = useCallback(
    (ms: number) => {
      const bounded = Math.max(0, Math.min(slotDuration, ms));
      slotProgressRef.current = bounded;
      setSlotProgress(bounded);
    },
    [slotDuration]
  );

  const setSlotDurationAction = useCallback((ms: number) => {
    const newDuration = Math.max(1000, Math.min(60000, ms)); // Clamp between 1s and 60s
    setSlotDuration(newDuration);
    // Reset progress if current progress exceeds new duration
    if (slotProgressRef.current > newDuration) {
      slotProgressRef.current = 0;
      setSlotProgress(0);
    }
  }, []);

  const setPlaybackSpeedAction = useCallback((speed: number) => {
    const clampedSpeed = Math.max(0.1, Math.min(10, speed)); // Clamp between 0.1x and 10x
    setPlaybackSpeed(clampedSpeed);
  }, []);

  const markStalled = useCallback(() => {
    setIsStalled(true);
    setIsPlaying(false);
    callbacks?.onStalled?.();
  }, [callbacks]);

  const clearStalled = useCallback(() => {
    setIsStalled(false);
  }, []);

  const jumpToLive = useCallback(() => {
    // Jump to maxSlot - 2 for safety buffer
    const targetSlot = maxSlot > 2 ? maxSlot - 2 : maxSlot;
    setCurrentSlot(targetSlot);
    slotProgressRef.current = 0;
    setSlotProgress(0);
    setIsPlaying(true);
    setPauseReason(null);
    callbacks?.onSlotChange?.(targetSlot);
    callbacks?.onPlayStateChange?.(true, null);
  }, [maxSlot, callbacks]);

  // Compose actions object
  const actions = useMemo<SlotPlayerActions>(
    () => ({
      play,
      pause,
      toggle,
      setMode: setModeAction,
      goToSlot,
      nextSlot,
      previousSlot,
      rewind,
      fastForward,
      seekToTime,
      setSlotDuration: setSlotDurationAction,
      setPlaybackSpeed: setPlaybackSpeedAction,
      markStalled,
      clearStalled,
      jumpToLive,
    }),
    [
      play,
      pause,
      toggle,
      setModeAction,
      goToSlot,
      nextSlot,
      previousSlot,
      rewind,
      fastForward,
      seekToTime,
      setSlotDurationAction,
      setPlaybackSpeedAction,
      markStalled,
      clearStalled,
      jumpToLive,
    ]
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

  /**
   * Nested context providers ordered by stability (most stable on outside):
   * - Meta (isLoading, error) - Infrequent updates during mount/API changes
   * - Actions - Never changes (memoized functions)
   * - Config - Rare updates (bounds, duration, speed settings)
   * - State - Medium updates (slot changes, play state)
   * - Progress - High-frequency updates (60fps animation)
   */
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
