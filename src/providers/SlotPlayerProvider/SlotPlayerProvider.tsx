import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useTablesBounds } from '@/hooks/useBounds';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
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
 * A high-performance React provider that manages Ethereum consensus layer slot playback,
 * offering a media-player-like interface for navigating historical blockchain data.
 * Fetches slot bounds from API, handles playback state, and provides five optimized
 * contexts for minimal re-renders.
 *
 * ## Features
 *
 * - **Multi-table bounds aggregation**: Fetches bounds from multiple tables and uses earliest min / latest max
 * - **Media player controls**: Play, pause, seek, skip, speed control
 * - **Live edge detection**: Auto-detects when within 10 slots of blockchain head
 * - **Staleness tracking**: Monitors if playback falls behind wall clock
 * - **Network change handling**: Auto-jumps to live edge when network switches
 * - **60fps smooth playback**: RequestAnimationFrame-based animation loop
 * - **Context splitting**: Five separate contexts minimize re-renders
 *
 * ## Architecture
 *
 * ### State Management Flow
 *
 * ```
 * SlotPlayerProvider
 *   ├─ API Call (useTablesBounds) → aggregate.minOfMins, aggregate.maxOfMaxes
 *   ├─ Transform bounds to slot numbers (one-time, on load)
 *   ├─ Animation Loop (useLayoutEffect + requestAnimationFrame)
 *   │   └─ Updates slotProgress at 60fps
 *   ├─ State Management (useState + useRef)
 *   │   ├─ currentSlot (actual slot number, not timestamp)
 *   │   ├─ isPlaying
 *   │   ├─ mode (continuous | single)
 *   │   ├─ slotProgress (0 to SECONDS_PER_SLOT * 1000 ms)
 *   │   └─ derived states (isLive, isStale, etc.)
 *   └─ Context Providers (5 separate, ordered by stability)
 *       ├─ MetaContext → isLoading, error
 *       ├─ ActionsContext → memoized functions (never changes)
 *       ├─ ConfigContext → playbackSpeed, minSlot, maxSlot
 *       ├─ StateContext → currentSlot, isPlaying, mode, etc.
 *       └─ ProgressContext → slotProgress (60fps updates)
 * ```
 *
 * ### Context Nesting Order
 *
 * Contexts are nested by stability (most stable on outside) to optimize rendering:
 * 1. **Meta** (isLoading, error) - Infrequent updates during mount/API changes
 * 2. **Actions** - Never changes (memoized functions)
 * 3. **Config** - Rare updates (bounds, speed settings)
 * 4. **State** - Medium updates (slot changes, play state)
 * 5. **Progress** - High-frequency updates (60fps animation)
 *
 * ## Performance Optimizations
 *
 * ### Context Splitting
 * Five separate contexts ensure components only re-render when consumed values change:
 * - `ProgressContext` (60fps) - Only progress bars subscribe
 * - `StateContext` (on change) - Slot displays subscribe
 * - `ConfigContext` (rare) - Settings UI subscribes
 * - `ActionsContext` (never) - Control bars subscribe
 * - `MetaContext` (mount/error) - Loading UI subscribes
 *
 * ### Callback Stability
 *
 * **CRITICAL**: Callbacks MUST be stable to avoid restarting the animation loop!
 *
 * ```tsx
 * import { useStableCallback } from '@/hooks/useSlotPlayer';
 *
 * // ✅ RECOMMENDED: useStableCallback (stable ref, fresh state, no deps!)
 * function App() {
 *   const [logs, setLogs] = useState<string[]>([]);
 *
 *   const handleSlotChange = useStableCallback((slot: number) => {
 *     console.log('Slot:', slot);
 *     setLogs(prev => [...prev, `Slot: ${slot}`]); // Always fresh!
 *   });
 *
 *   const callbacks = useMemo(() => ({
 *     onSlotChange: handleSlotChange,
 *   }), [handleSlotChange]);
 *
 *   return <SlotPlayerProvider tables={['fct_block']} callbacks={callbacks} />;
 * }
 *
 * // ⚠️ MANUAL: useCallback (requires dependency tracking)
 * function App() {
 *   const handleSlotChange = useCallback((slot: number) => {
 *     console.log('Slot:', slot);
 *   }, []); // Empty deps = stable
 *
 *   const callbacks = useMemo(() => ({
 *     onSlotChange: handleSlotChange,
 *   }), [handleSlotChange]);
 *
 *   return <SlotPlayerProvider tables={['fct_block']} callbacks={callbacks} />;
 * }
 *
 * // ❌ BROKEN: Unstable callbacks restart animation loop every render!
 * function App() {
 *   return (
 *     <SlotPlayerProvider
 *       tables={['fct_block']}
 *       callbacks={{ onSlotChange: (slot) => console.log(slot) }}
 *     />
 *   );
 * }
 * ```
 *
 * ### Animation Loop
 *
 * Uses `useLayoutEffect` + `requestAnimationFrame` for 60fps playback:
 * - **useLayoutEffect**: Cleanup happens synchronously before re-paint, preventing frames from "escaping"
 * - **requestAnimationFrame**: Tied to browser refresh rate for smooth animation
 * - **Dual state tracking**: Ref for reads (avoid stale closures), state for React updates
 *
 * See: [Using requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/)
 *
 * ### Zero-Overhead Slot Numbers
 *
 * All slot values are actual beacon chain slot numbers (not timestamps):
 * - Bounds transformed once on load (timestamp → slot)
 * - Zero repeated conversions in components
 * - Direct comparison with wall clock slot
 * - No performance overhead for consumers
 *
 * ## Usage
 *
 * ### Basic Setup
 *
 * ```tsx
 * import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
 * import { useSlotPlayer } from '@/hooks/useSlotPlayer';
 *
 * function App() {
 *   return (
 *     <SlotPlayerProvider tables={['fct_block', 'fct_attestation']}>
 *       <SlotViewer />
 *     </SlotPlayerProvider>
 *   );
 * }
 *
 * function SlotViewer() {
 *   const { currentSlot, isPlaying, actions, isLoading, error } = useSlotPlayer();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h1>Slot {currentSlot}</h1>
 *       <button onClick={actions.toggle}>
 *         {isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ### Multiple Tables
 *
 * Provider aggregates bounds across all specified tables:
 *
 * ```tsx
 * <SlotPlayerProvider
 *   tables={['fct_block', 'fct_attestation', 'fct_validator_balance']}
 * >
 *   <App />
 * </SlotPlayerProvider>
 * ```
 *
 * Uses earliest `min` and latest `max` across all tables for full data range.
 *
 * ### With Callbacks
 *
 * ```tsx
 * import { useStableCallback } from '@/hooks/useSlotPlayer';
 *
 * function App() {
 *   const handleSlotChange = useStableCallback((slot: number) => {
 *     console.log('Moved to slot:', slot);
 *   });
 *
 *   const handlePlayStateChange = useStableCallback((isPlaying: boolean, reason: PauseReason) => {
 *     console.log('Playback:', isPlaying ? 'started' : 'stopped', 'Reason:', reason);
 *   });
 *
 *   const callbacks = useMemo(() => ({
 *     onSlotChange: handleSlotChange,
 *     onPlayStateChange: handlePlayStateChange,
 *   }), [handleSlotChange, handlePlayStateChange]);
 *
 *   return (
 *     <SlotPlayerProvider
 *       tables={['fct_block', 'fct_attestation']}
 *       initialPlaying={true}
 *       initialMode="continuous"
 *       playbackSpeed={2}
 *       callbacks={callbacks}
 *     >
 *       <SlotViewer />
 *     </SlotPlayerProvider>
 *   );
 * }
 * ```
 *
 * ## Error Handling
 *
 * **Production Recommendation**: Wrap in an Error Boundary:
 *
 * ```tsx
 * import { ErrorBoundary } from 'react-error-boundary';
 *
 * function App() {
 *   return (
 *     <ErrorBoundary fallback={<ErrorPage />}>
 *       <SlotPlayerProvider tables={['fct_block']}>
 *         <SlotViewer />
 *       </SlotPlayerProvider>
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 *
 * Or handle errors inline:
 *
 * ```tsx
 * function SlotViewer() {
 *   const { isLoading, error } = useSlotPlayerMeta();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <SlotDisplay />;
 * }
 * ```
 *
 * ## Testing
 *
 * Wrap components in test provider:
 *
 * ```tsx
 * import { render } from '@testing-library/react';
 * import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
 *
 * const wrapper = ({ children }) => (
 *   <SlotPlayerProvider tables={['fct_block']} initialSlot={100}>
 *     {children}
 *   </SlotPlayerProvider>
 * );
 *
 * test('displays slot', () => {
 *   render(<MyComponent />, { wrapper });
 * });
 * ```
 *
 * Or mock hooks:
 *
 * ```tsx
 * vi.mock('@/hooks/useSlotPlayer', () => ({
 *   useSlotPlayerState: () => ({
 *     currentSlot: 12345,
 *     isPlaying: false,
 *     isLive: true,
 *   }),
 * }));
 * ```
 *
 * ## Implementation Details
 *
 * ### Dual Progress Tracking
 *
 * Both ref and state are used for `slotProgress` intentionally:
 * - `slotProgressRef` - Read by animation loop (avoid stale closures)
 * - `slotProgress` state - Trigger React re-renders for UI
 *
 * This is required for requestAnimationFrame loops to work correctly with React.
 *
 * ### State Ref Pattern
 *
 * `stateRef.current` captures latest state for animation loop without recreating
 * the effect when state changes. Essential for smooth 60fps playback.
 *
 * ### Auto-Resume Logic
 *
 * In continuous mode, when paused at boundary and new data arrives (maxSlot increases),
 * automatically resumes playback. Handles live blockchain data gracefully.
 *
 * ### Network Change Handling
 *
 * When network changes, automatically jumps to live edge (maxSlot - 2) to avoid
 * showing stale data from previous network.
 *
 * ### Bounds Clamping
 *
 * When bounds update, clamps currentSlot to valid range to handle race conditions
 * between slot updates and bounds fetches.
 *
 * ### Safety Buffer
 *
 * Uses `maxSlot - 2` (not maxSlot) as "safe" max to avoid data availability issues
 * at the blockchain head. The latest 1-2 slots may have incomplete data.
 *
 * @see useSlotPlayer - Main hook for accessing all context
 * @see useSlotPlayerProgress - For 60fps progress updates
 * @see useSlotPlayerState - For slot and playback state
 * @see useSlotPlayerConfig - For settings and bounds
 * @see useSlotPlayerActions - For control functions
 * @see useSlotPlayerMeta - For loading/error state
 */
export function SlotPlayerProvider({
  children,
  tables,
  initialSlot,
  initialMode = 'continuous',
  initialPlaying = false,
  playbackSpeed: initialPlaybackSpeed = 1,
  callbacks,
}: SlotPlayerProviderProps): React.ReactElement {
  /**
   * Slot duration is determined by the SECONDS_PER_SLOT constant (beacon chain slot time).
   * This adheres to the actual beacon chain slot duration and is not configurable via props.
   * For Ethereum mainnet, this is typically 12 seconds (12000ms), but may vary for other networks.
   */
  const slotDuration = SECONDS_PER_SLOT * 1000;

  // Get network for genesis_time (required for timestamp to slot conversion)
  const { currentNetwork } = useNetwork();

  // Get slot bounds from the API (TanStack Query handles retries internally)
  const { data: boundsData, isLoading, error } = useTablesBounds(tables);

  // Get current wall clock slot for staleness checking
  const { slot: wallClockSlot } = useBeaconClock();

  // Transform timestamp bounds to actual slot numbers
  // This transformation happens once when bounds load, not on every render
  const minSlot = useMemo(() => {
    if (!boundsData?.aggregate?.minOfMins || !currentNetwork) return 0;
    return Math.floor((boundsData.aggregate.minOfMins - currentNetwork.genesis_time) / SECONDS_PER_SLOT);
  }, [boundsData, currentNetwork]);

  const maxSlot = useMemo(() => {
    if (!boundsData?.aggregate?.maxOfMaxes || !currentNetwork) return 0;
    return Math.floor((boundsData.aggregate.maxOfMaxes - currentNetwork.genesis_time) / SECONDS_PER_SLOT);
  }, [boundsData, currentNetwork]);

  // Calculate initial slot (returns actual slot number)
  const getInitialSlot = useCallback(() => {
    if (initialSlot !== undefined) return initialSlot;
    // Use maxSlot minus 2 slots as the safe default to avoid data availability issues
    const safeSlot = maxSlot > 2 ? maxSlot - 2 : maxSlot;
    return safeSlot;
  }, [initialSlot, maxSlot]);

  // State management
  // NOTE: currentSlot stores actual beacon chain slot numbers, NOT timestamps
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlaying);
  const [mode, setMode] = useState<SlotMode>(initialMode);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(initialPlaybackSpeed);
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

  // Initialize currentSlot when bounds data is loaded
  // Only run if currentSlot is still 0 (not yet initialized) and no explicit initialSlot was provided
  useEffect(() => {
    if (boundsData && currentSlot === 0 && initialSlot === undefined) {
      const newInitialSlot = getInitialSlot();
      setCurrentSlot(newInitialSlot);
      setSlotProgress(0);
      slotProgressRef.current = 0;
    }
  }, [boundsData, currentSlot, initialSlot, getInitialSlot]);

  // Handle bounds update race conditions - clamp currentSlot to valid range
  // Skip clamping if currentSlot is 0 (waiting for initialization)
  useEffect(() => {
    if (boundsData && currentSlot !== 0) {
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

  // Jump to live when network changes
  // Use a ref to track the previous network to detect changes
  const prevNetworkRef = useRef(currentNetwork);
  useEffect(() => {
    // Only jump if network actually changed and we have valid data
    if (
      currentNetwork &&
      prevNetworkRef.current &&
      prevNetworkRef.current.name !== currentNetwork.name &&
      maxSlot > 0
    ) {
      const targetSlot = maxSlot > 2 ? maxSlot - 2 : maxSlot;
      setCurrentSlot(targetSlot);
      setSlotProgress(0);
      slotProgressRef.current = 0;
    }
    prevNetworkRef.current = currentNetwork;
  }, [currentNetwork, maxSlot]);

  // Auto-resume when reaching the live edge boundary in continuous mode
  useEffect(() => {
    if (!isPlaying && pauseReason === 'boundary' && mode === 'continuous' && currentSlot < maxSlot) {
      setIsPlaying(true);
      setPauseReason(null);
    }
  }, [maxSlot, currentSlot, isPlaying, pauseReason, mode]);

  // Calculate derived state
  // Both wallClockSlot and currentSlot are now actual slot numbers - direct comparison
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
            // Check if we can advance before resetting progress
            const nextSlot = state.currentSlot + 1;
            if (nextSlot > state.maxSlot) {
              // Hit boundary - pause and keep progress at end
              setIsPlaying(false);
              setPauseReason('boundary');
              callbacks?.onPlayStateChange?.(false, 'boundary');
              slotProgressRef.current = state.slotDuration;
              setSlotProgress(state.slotDuration);
            } else {
              // Can advance - move to next slot and reset progress
              setCurrentSlot(nextSlot);
              callbacks?.onSlotChange?.(nextSlot);
              slotProgressRef.current = 0;
              setSlotProgress(0);
            }
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

  const setPlaybackSpeedAction = useCallback((speed: number) => {
    const clampedSpeed = Math.max(0.1, Math.min(10, speed)); // Clamp between 0.1x and 10x
    setPlaybackSpeed(clampedSpeed);
  }, []);

  const jumpToLive = useCallback(() => {
    // Jump to maxSlot - 2 slots for safety buffer
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
      setPlaybackSpeed: setPlaybackSpeedAction,
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
      setPlaybackSpeedAction,
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
      isStale,
      staleBehindSlots,
      isLive,
      pauseReason,
    }),
    [currentSlot, isPlaying, mode, isStale, staleBehindSlots, isLive, pauseReason]
  );

  const configValue = useMemo(
    () => ({
      playbackSpeed,
      minSlot,
      maxSlot,
    }),
    [playbackSpeed, minSlot, maxSlot]
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
