import { useContext } from 'react';
import {
  SlotPlayerProgressContext,
  SlotPlayerStateContext,
  SlotPlayerConfigContext,
  SlotPlayerActionsContext,
  SlotPlayerMetaContext,
} from '@/contexts/SlotPlayerContext';
import type {
  SlotPlayerContextValue,
  SlotPlayerProgressContextValue,
  SlotPlayerStateContextValue,
  SlotPlayerConfigContextValue,
  SlotPlayerActions,
  SlotPlayerMetaContextValue,
} from '@/contexts/SlotPlayerContext';

/**
 * # SlotPlayer Hook System
 *
 * A high-performance React hook for controlling Ethereum consensus layer slot playback
 * with a media-player-like interface. Provides play/pause controls, seeking, speed
 * adjustment, and real-time progress tracking for navigating historical blockchain data.
 *
 * ## Architecture Overview
 *
 * ### Context Splitting for Performance
 *
 * The hook system uses five separate contexts to minimize re-renders:
 *
 * | Context | Update Frequency | Hook | Use Case |
 * |---------|------------------|------|----------|
 * | `ProgressContext` | 60fps | `useSlotPlayerProgress()` | Progress bars, animations |
 * | `StateContext` | On state change | `useSlotPlayerState()` | Current slot, play state |
 * | `ConfigContext` | Rarely | `useSlotPlayerConfig()` | Settings, bounds |
 * | `ActionsContext` | Never | `useSlotPlayerActions()` | Control functions |
 * | `MetaContext` | On load/error | `useSlotPlayerMeta()` | Loading states |
 *
 * ### Performance Best Practices
 *
 * **✅ DO**:
 * ```tsx
 * // Only subscribe to what you need
 * const actions = useSlotPlayerActions();
 * const { currentSlot, isPlaying } = useSlotPlayerState();
 *
 * // Use React.memo for components that don't need frequent updates
 * const ControlBar = React.memo(() => {
 *   const actions = useSlotPlayerActions(); // Never re-renders
 *   return <button onClick={actions.toggle}>Toggle</button>;
 * });
 * ```
 *
 * **❌ DON'T**:
 * ```tsx
 * // Don't subscribe to everything if you only need a few values
 * const { actions } = useSlotPlayer(); // Re-renders at 60fps!
 *
 * // Better:
 * const actions = useSlotPlayerActions(); // Never re-renders
 * ```
 *
 * ### Zero-Overhead Slot Numbers
 *
 * All slot values (`currentSlot`, `minSlot`, `maxSlot`) are actual beacon chain slot
 * numbers, NOT timestamps. The provider transforms timestamp bounds to slots once on
 * load, eliminating repeated conversions on every render. This provides zero transformation
 * overhead in consumer components.
 *
 * ### Animation Loop Implementation
 *
 * Uses `useLayoutEffect` with `requestAnimationFrame` for smooth 60fps playback.
 * The layout effect ensures cleanup happens synchronously before re-paint, preventing
 * animation frames from "escaping" cleanup logic during fast re-renders.
 *
 * ## Quick Start
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
 *   const { currentSlot, isPlaying, slotProgress, actions, isLoading, error } = useSlotPlayer();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h1>Slot {currentSlot}</h1>
 *       <p>Progress: {slotProgress}ms</p>
 *       <button onClick={actions.toggle}>
 *         {isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *       <button onClick={actions.previousSlot}>Previous</button>
 *       <button onClick={actions.nextSlot}>Next</button>
 *       <button onClick={actions.jumpToLive}>Jump to Live</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Optimized Usage Pattern
 *
 * Use individual hooks to subscribe only to what you need:
 *
 * ```tsx
 * import {
 *   useSlotPlayerState,
 *   useSlotPlayerActions,
 *   useSlotPlayerProgress,
 *   useSlotPlayerConfig,
 * } from '@/hooks/useSlotPlayer';
 *
 * function ControlBar() {
 *   // Only re-renders when state changes, not on every frame
 *   const { currentSlot, isPlaying } = useSlotPlayerState();
 *   const actions = useSlotPlayerActions();
 *
 *   return (
 *     <div>
 *       <span>Slot {currentSlot}</span>
 *       <button onClick={actions.toggle}>
 *         {isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *     </div>
 *   );
 * }
 *
 * function ProgressBar() {
 *   // Only re-renders on progress updates (60fps)
 *   const { slotProgress } = useSlotPlayerProgress();
 *   const slotDuration = SECONDS_PER_SLOT * 1000; // Slot duration in ms
 *   const percentage = (slotProgress / slotDuration) * 100;
 *
 *   return <div style={{ width: `${percentage}%` }} />;
 * }
 * ```
 *
 * @see SlotPlayerProvider - Provider configuration and props
 * @see useSlotPlayerProgress - For 60fps progress updates
 * @see useSlotPlayerState - For slot and playback state
 * @see useSlotPlayerConfig - For settings and bounds
 * @see useSlotPlayerActions - For control functions
 * @see useSlotPlayerMeta - For loading/error state
 */

/**
 * Hook to access slot player progress (60fps updates).
 *
 * Returns the current progress within the active slot in milliseconds (0 to SECONDS_PER_SLOT * 1000).
 * Updates at 60fps during playback via `requestAnimationFrame`.
 *
 * **Performance Warning**: This hook causes re-renders on every animation frame.
 * Only use when you need real-time progress updates (progress bars, animations).
 * For other use cases, use `useSlotPlayerState()` or `useSlotPlayerActions()` instead.
 *
 * @returns Progress context containing `slotProgress` in milliseconds
 * @throws {Error} If used outside of SlotPlayerProvider
 *
 * @example
 * ```tsx
 * function ProgressBar() {
 *   const { slotProgress } = useSlotPlayerProgress();
 *   const slotDuration = SECONDS_PER_SLOT * 1000; // Slot duration in ms
 *   const percentage = (slotProgress / slotDuration) * 100;
 *
 *   return (
 *     <div className="progress-bar">
 *       <div style={{ width: `${percentage}%` }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSlotPlayerProgress(): SlotPlayerProgressContextValue {
  const context = useContext(SlotPlayerProgressContext);
  if (context === undefined) {
    throw new Error('useSlotPlayerProgress must be used within a SlotPlayerProvider');
  }
  return context;
}

/**
 * Hook to access slot player state.
 *
 * Returns the current playback state including slot position, playing status, mode,
 * staleness, and liveness. Updates when the slot changes or playback state changes
 * (much less frequently than `useSlotPlayerProgress`).
 *
 * **Slot Number Convention**: All slot values are actual beacon chain slot numbers,
 * NOT timestamps. No conversion needed in your components.
 *
 * @returns State context containing:
 * - `currentSlot` - Current beacon chain slot number
 * - `isPlaying` - Whether playback is active
 * - `mode` - 'continuous' (auto-advance) or 'single' (manual stepping)
 * - `isStale` - Whether more than 10 slots behind wall clock
 * - `staleBehindSlots` - Number of slots behind current time
 * - `isLive` - Whether within 10 slots of safe max (maxSlot - 2)
 * - `pauseReason` - Why playback is paused ('manual', 'boundary', or null)
 *
 * @throws {Error} If used outside of SlotPlayerProvider
 *
 * @example
 * ```tsx
 * function SlotDisplay() {
 *   const { currentSlot, isPlaying, isLive, isStale } = useSlotPlayerState();
 *
 *   return (
 *     <div>
 *       <h1>Slot {currentSlot}</h1>
 *       {isLive && <Badge color="green">Live</Badge>}
 *       {isStale && <Badge color="orange">Stale</Badge>}
 *       <span>{isPlaying ? '▶️ Playing' : '⏸️ Paused'}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSlotPlayerState(): SlotPlayerStateContextValue {
  const context = useContext(SlotPlayerStateContext);

  if (context === undefined) {
    throw new Error('useSlotPlayerState must be used within a SlotPlayerProvider');
  }

  return context;
}

/**
 * Hook to access slot player configuration.
 *
 * Returns playback settings and slot bounds. Rarely changes - only when user adjusts
 * settings or new bounds are fetched from the API.
 *
 * **Slot Bounds**: The provider fetches bounds from API and aggregates across all
 * specified tables, using the earliest `min` and latest `max` to determine the full
 * available range. All values are actual beacon chain slot numbers.
 *
 * **Note**: Slot duration is determined by the `SECONDS_PER_SLOT` constant and not
 * exposed in this context.
 *
 * @returns Config context containing:
 * - `playbackSpeed` - Speed multiplier (0.1 to 10)
 * - `minSlot` - Earliest available slot number (from API bounds)
 * - `maxSlot` - Latest available slot number (from API bounds)
 *
 * @throws {Error} If used outside of SlotPlayerProvider
 *
 * @example
 * ```tsx
 * function SpeedControl() {
 *   const { playbackSpeed, minSlot, maxSlot } = useSlotPlayerConfig();
 *   const { setPlaybackSpeed } = useSlotPlayerActions();
 *
 *   return (
 *     <div>
 *       <p>Available range: {minSlot} - {maxSlot}</p>
 *       <select
 *         value={playbackSpeed}
 *         onChange={e => setPlaybackSpeed(Number(e.target.value))}
 *       >
 *         <option value={0.5}>0.5x</option>
 *         <option value={1}>1x</option>
 *         <option value={2}>2x</option>
 *         <option value={5}>5x</option>
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSlotPlayerConfig(): SlotPlayerConfigContextValue {
  const context = useContext(SlotPlayerConfigContext);

  if (context === undefined) {
    throw new Error('useSlotPlayerConfig must be used within a SlotPlayerProvider');
  }

  return context;
}

/**
 * Hook to access slot player actions.
 *
 * Returns all playback control, navigation, seek, and settings functions. All action
 * functions are memoized and stable - they never cause re-renders when passed as props.
 *
 * **Performance Tip**: This is the most performant hook - use it when you only need
 * to trigger actions without subscribing to state changes. Perfect for control bars.
 *
 * **Slot Navigation**: All actions work with actual beacon chain slot numbers (not
 * timestamps). Slots are automatically clamped to valid range `[minSlot, maxSlot]`.
 *
 * @returns Actions object containing:
 *
 * **Playback controls**:
 * - `play()` - Start playback
 * - `pause()` - Pause playback
 * - `toggle()` - Toggle play/pause
 * - `setMode(mode)` - Set 'continuous' or 'single' mode
 *
 * **Navigation**:
 * - `goToSlot(slot)` - Jump to specific slot (clamped to bounds)
 * - `nextSlot()` - Advance to next slot
 * - `previousSlot()` - Go to previous slot
 *
 * **Seek within slot**:
 * - `rewind()` - Jump to start of current slot
 * - `fastForward()` - Jump to end of current slot
 * - `seekToTime(ms)` - Seek to specific time (0 to SECONDS_PER_SLOT * 1000)
 *
 * **Settings**:
 * - `setPlaybackSpeed(speed)` - Set speed multiplier (0.1-10)
 *
 * **State management**:
 * - `jumpToLive()` - Jump to live edge (maxSlot - 2) and play
 *
 * @throws {Error} If used outside of SlotPlayerProvider
 *
 * @example
 * ```tsx
 * function ControlBar() {
 *   const actions = useSlotPlayerActions();
 *   const { currentSlot, isPlaying } = useSlotPlayerState();
 *
 *   return (
 *     <div>
 *       <button onClick={actions.previousSlot}>⏮️ Previous</button>
 *       <button onClick={actions.rewind}>⏪ Rewind</button>
 *       <button onClick={actions.toggle}>
 *         {isPlaying ? '⏸️ Pause' : '▶️ Play'}
 *       </button>
 *       <button onClick={actions.fastForward}>⏩ Forward</button>
 *       <button onClick={actions.nextSlot}>⏭️ Next</button>
 *       <button onClick={actions.jumpToLive}>🔴 Live</button>
 *       <button onClick={() => actions.goToSlot(currentSlot + 10)}>+10 Slots</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSlotPlayerActions(): SlotPlayerActions {
  const context = useContext(SlotPlayerActionsContext);

  if (context === undefined) {
    throw new Error('useSlotPlayerActions must be used within a SlotPlayerProvider');
  }

  return context;
}

/**
 * Hook to access slot player loading and error state.
 *
 * Returns the loading and error states from the slot bounds API fetch. The provider
 * uses TanStack Query which handles retries internally, so errors only surface after
 * retry attempts are exhausted.
 *
 * Use this hook to show loading spinners or error messages while bounds are being
 * fetched on initial mount.
 *
 * @returns Meta context containing:
 * - `isLoading` - Whether slot bounds are currently loading from API
 * - `error` - Error object if bounds fetch failed, null otherwise
 *
 * @throws {Error} If used outside of SlotPlayerProvider
 *
 * @example
 * ```tsx
 * function SlotViewer() {
 *   const { isLoading, error } = useSlotPlayerMeta();
 *   const { currentSlot } = useSlotPlayerState();
 *
 *   if (isLoading) return <LoadingSpinner message="Loading slot bounds..." />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <div>Slot {currentSlot}</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With error boundary
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
 */
export function useSlotPlayerMeta(): SlotPlayerMetaContextValue {
  const context = useContext(SlotPlayerMetaContext);
  if (context === undefined) {
    throw new Error('useSlotPlayerMeta must be used within a SlotPlayerProvider');
  }
  return context;
}

/**
 * Hook for accessing the complete slot player context.
 *
 * Returns all slot player state, config, actions, progress, and meta values in a single
 * object. This is the "batteries included" hook that gives you everything.
 *
 * **⚠️ Performance Warning**: This hook subscribes to ALL contexts including progress
 * (60fps updates). Only use when you actually need multiple values from different contexts.
 *
 * **Recommended**: Use individual hooks instead for better performance:
 * - `useSlotPlayerActions()` - For control functions only (never re-renders)
 * - `useSlotPlayerState()` - For slot and playback state
 * - `useSlotPlayerConfig()` - For settings and bounds
 * - `useSlotPlayerProgress()` - For 60fps progress updates
 * - `useSlotPlayerMeta()` - For loading/error state
 *
 * @returns Complete context value containing:
 * - All properties from `SlotPlayerProgressContextValue` (slotProgress)
 * - All properties from `SlotPlayerStateContextValue` (currentSlot, isPlaying, etc.)
 * - All properties from `SlotPlayerConfigContextValue` (playbackSpeed, minSlot, maxSlot)
 * - All properties from `SlotPlayerMetaContextValue` (isLoading, error)
 * - `actions` - All playback control functions
 *
 * @throws {Error} If used outside of SlotPlayerProvider
 *
 * @example
 * ```tsx
 * // Basic usage (re-renders at 60fps due to slotProgress!)
 * function SlotViewer() {
 *   const { currentSlot, isPlaying, slotProgress, actions, isLoading, error } = useSlotPlayer();
 *
 *   if (isLoading) return <div>Loading slot bounds...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   const slotDuration = SECONDS_PER_SLOT * 1000; // Slot duration in ms
 *
 *   return (
 *     <div>
 *       <h1>Slot {currentSlot}</h1>
 *       <p>Progress: {slotProgress}ms / {slotDuration}ms</p>
 *       <button onClick={actions.toggle}>
 *         {isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *       <button onClick={actions.nextSlot}>Next Slot</button>
 *       <button onClick={actions.jumpToLive}>Jump to Live</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // ⚠️ Avoid this pattern - causes unnecessary re-renders
 * function ControlBar() {
 *   const { actions } = useSlotPlayer(); // Re-renders at 60fps!
 *   return <button onClick={actions.play}>Play</button>;
 * }
 *
 * // ✅ Better - use individual hook
 * function ControlBar() {
 *   const actions = useSlotPlayerActions(); // Never re-renders!
 *   return <button onClick={actions.play}>Play</button>;
 * }
 * ```
 */
export function useSlotPlayer(): SlotPlayerContextValue {
  const progress = useSlotPlayerProgress();
  const state = useSlotPlayerState();
  const config = useSlotPlayerConfig();
  const actions = useSlotPlayerActions();
  const meta = useSlotPlayerMeta();

  return {
    ...progress,
    ...state,
    ...config,
    ...meta,
    actions,
  };
}
