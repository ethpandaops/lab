import type { ReactNode } from 'react';

/**
 * Playback mode for the slot player.
 *
 * - `continuous`: Automatically advances to the next slot when current slot completes
 * - `single`: Stops at the end of each slot, requiring manual navigation to continue
 *
 * @example
 * ```tsx
 * // Continuous mode - auto-advances through slots
 * <SlotPlayerProvider tables={['fct_block']} initialMode="continuous">
 *
 * // Single mode - manual stepping through slots
 * <SlotPlayerProvider tables={['fct_block']} initialMode="single">
 * ```
 */
export type SlotMode = 'continuous' | 'single';

/**
 * Reason why playback was paused.
 *
 * - `manual`: User explicitly paused via pause() or toggle()
 * - `boundary`: Reached the maximum slot boundary in continuous mode
 * - `null`: Not paused or no specific reason
 *
 * Use this to provide contextual UI feedback about why playback stopped.
 *
 * @example
 * ```tsx
 * const { isPlaying, pauseReason } = useSlotPlayerState();
 *
 * if (!isPlaying && pauseReason === 'boundary') {
 *   return <Alert>Reached the latest available slot</Alert>;
 * }
 * ```
 */
export type PauseReason = 'manual' | 'boundary' | null;

/**
 * Progress context value - updates at 60fps during playback.
 *
 * **Performance Note**: This context updates frequently. Only subscribe via
 * `useSlotPlayerProgress()` if you need real-time progress (e.g., progress bars,
 * animations). For other use cases, use the specialized hooks to avoid unnecessary re-renders.
 *
 * @property slotProgress - Current progress within the slot in milliseconds (0 to SECONDS_PER_SLOT * 1000)
 *
 * @example
 * ```tsx
 * function ProgressBar() {
 *   const { slotProgress } = useSlotPlayerProgress();
 *   const slotDuration = SECONDS_PER_SLOT * 1000; // Slot duration in ms
 *   const percentage = (slotProgress / slotDuration) * 100;
 *   return <div style={{ width: `${percentage}%` }} />;
 * }
 * ```
 */
export interface SlotPlayerProgressContextValue {
  /** Current progress within the slot in milliseconds (0 to SECONDS_PER_SLOT * 1000) */
  slotProgress: number;
}

/**
 * State context value - updates when slot or playback state changes.
 *
 * Contains the current playback state, slot position, and derived states like
 * staleness and liveness. All slot values are actual beacon chain slot numbers.
 *
 * @example
 * ```tsx
 * function SlotDisplay() {
 *   const { currentSlot, isPlaying, isLive, isStale } = useSlotPlayerState();
 *   return (
 *     <div>
 *       <h1>Slot {currentSlot}</h1>
 *       {isLive && <Badge>Live</Badge>}
 *       {isStale && <Badge>Stale</Badge>}
 *       <span>{isPlaying ? '▶️ Playing' : '⏸️ Paused'}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export interface SlotPlayerStateContextValue {
  /** Current beacon chain slot number (not a timestamp) */
  currentSlot: number;
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Playback mode (continuous auto-advances, single stops per slot) */
  mode: SlotMode;
  /** Whether player is more than 10 slots behind the wall clock */
  isStale: boolean;
  /** Number of slots behind the current wall clock slot */
  staleBehindSlots: number;
  /** Whether within 10 slots of the safe maximum slot (maxSlot - 2) */
  isLive: boolean;
  /** Reason for current pause state, if paused */
  pauseReason: PauseReason;
}

/**
 * Config context value - rarely changes (settings and bounds).
 *
 * Contains playback configuration and the valid slot range. The slot bounds
 * are fetched from the API and represent the earliest and latest available
 * data across the specified tables.
 *
 * **Note**: Slot duration is determined by the `SECONDS_PER_SLOT` constant (beacon chain slot time)
 * and is not exposed in this context or configurable via props.
 *
 * @example
 * ```tsx
 * function SpeedControl() {
 *   const { playbackSpeed, minSlot, maxSlot } = useSlotPlayerConfig();
 *   const { setPlaybackSpeed } = useSlotPlayerActions();
 *
 *   return (
 *     <div>
 *       <span>Range: {minSlot} - {maxSlot}</span>
 *       <select
 *         value={playbackSpeed}
 *         onChange={e => setPlaybackSpeed(Number(e.target.value))}
 *       >
 *         <option value={0.5}>0.5x</option>
 *         <option value={1}>1x</option>
 *         <option value={2}>2x</option>
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export interface SlotPlayerConfigContextValue {
  /** Playback speed multiplier (0.1 to 10) */
  playbackSpeed: number;
  /** Minimum available slot number (earliest data) */
  minSlot: number;
  /** Maximum available slot number (latest data) */
  maxSlot: number;
}

/**
 * Actions for controlling slot playback.
 *
 * All action functions are memoized and stable - they never cause re-renders
 * when passed as props. Safe to use directly without wrapping in useCallback.
 *
 * **Slot Navigation**: All navigation actions work with actual beacon chain slot
 * numbers (not timestamps). Slots are automatically clamped to valid range [minSlot, maxSlot].
 *
 * @example
 * ```tsx
 * function ControlBar() {
 *   const actions = useSlotPlayerActions();
 *   const { currentSlot, isPlaying } = useSlotPlayerState();
 *
 *   return (
 *     <div>
 *       <button onClick={actions.previousSlot}>⏮️</button>
 *       <button onClick={actions.rewind}>⏪</button>
 *       <button onClick={actions.toggle}>
 *         {isPlaying ? '⏸️' : '▶️'}
 *       </button>
 *       <button onClick={actions.fastForward}>⏩</button>
 *       <button onClick={actions.nextSlot}>⏭️</button>
 *       <button onClick={actions.jumpToLive}>🔴 Live</button>
 *       <button onClick={() => actions.goToSlot(currentSlot + 10)}>+10</button>
 *     </div>
 *   );
 * }
 * ```
 */
export interface SlotPlayerActions {
  // Playback controls
  /** Start playback (in single mode at end, restarts from beginning) */
  play: () => void;
  /** Pause playback (sets pauseReason to 'manual') */
  pause: () => void;
  /** Toggle between play and pause states */
  toggle: () => void;
  /** Set playback mode (continuous or single) */
  setMode: (mode: SlotMode) => void;

  // Navigation
  /** Navigate to a specific slot number (clamped to [minSlot, maxSlot]) */
  goToSlot: (slot: number) => void;
  /** Advance to next slot (no-op if at maxSlot) */
  nextSlot: () => void;
  /** Go to previous slot (no-op if at minSlot) */
  previousSlot: () => void;

  // Seek within slot
  /** Seek to beginning of current slot (reset progress to 0) */
  rewind: () => void;
  /** Seek to end of current slot (set progress to SECONDS_PER_SLOT * 1000) */
  fastForward: () => void;
  /** Seek to specific time within slot in milliseconds (clamped to [0, SECONDS_PER_SLOT * 1000]) */
  seekToTime: (ms: number) => void;

  // Settings
  /** Set playback speed multiplier (clamped to [0.1, 10]) */
  setPlaybackSpeed: (speed: number) => void;

  // State management
  /** Jump to live edge (maxSlot - 2) and start playing */
  jumpToLive: () => void;
}

/**
 * Callback functions for slot player events.
 *
 * **IMPORTANT - Performance**: Always wrap callbacks in `useCallback` or use
 * `useStableCallback` (recommended) to maintain stable references. Unstable callbacks
 * will cause the animation loop to restart on every render, degrading performance.
 *
 * @example
 * ```tsx
 * // Option 1: useStableCallback (recommended - stable reference, always fresh state)
 * const handleSlotChange = useStableCallback((slot: number) => {
 *   console.log('Moved to slot:', slot);
 *   setLogs(prev => [...prev, `Slot: ${slot}`]); // Always accesses fresh state!
 * });
 *
 * const callbacks = useMemo(() => ({
 *   onSlotChange: handleSlotChange,
 * }), [handleSlotChange]);
 *
 * // Option 2: useCallback (manual - requires dependency management)
 * const handleSlotChange = useCallback((slot: number) => {
 *   console.log('Moved to slot:', slot);
 * }, []);
 *
 * const callbacks = useMemo(() => ({
 *   onSlotChange: handleSlotChange,
 * }), [handleSlotChange]);
 * ```
 */
export interface SlotPlayerCallbacks {
  /** Called when currentSlot changes (receives actual beacon chain slot number) */
  onSlotChange?: (slot: number) => void;
  /** Called when play state changes (isPlaying and reason for pause) */
  onPlayStateChange?: (isPlaying: boolean, reason: PauseReason) => void;
}

/**
 * Props for SlotPlayerProvider component.
 *
 * The provider fetches slot bounds from the API using the specified tables and
 * manages all playback state internally. It uses five separate contexts to optimize
 * re-renders, so child components only update when relevant values change.
 *
 * **Required Props**:
 * - `tables`: Array of table names to fetch bounds from (e.g., `['fct_block', 'fct_attestation']`)
 *
 * **Multiple Tables**: The provider aggregates bounds across all tables, using the
 * earliest `min` and latest `max` to determine the full available slot range.
 *
 * **Note**: Slot duration is determined by the `SECONDS_PER_SLOT` constant and cannot be
 * configured via props. It adheres to the actual beacon chain slot time.
 *
 * @example
 * ```tsx
 * // Basic usage with single table
 * <SlotPlayerProvider tables={['fct_block']}>
 *   <SlotViewer />
 * </SlotPlayerProvider>
 *
 * // Advanced usage with multiple tables and callbacks
 * function App() {
 *   const handleSlotChange = useStableCallback((slot: number) => {
 *     console.log('Slot changed:', slot);
 *   });
 *
 *   const callbacks = useMemo(() => ({
 *     onSlotChange: handleSlotChange,
 *   }), [handleSlotChange]);
 *
 *   return (
 *     <SlotPlayerProvider
 *       tables={['fct_block', 'fct_attestation', 'fct_validator_balance']}
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
 */
export interface SlotPlayerProviderProps {
  children: ReactNode;
  /** **REQUIRED**: Table names to fetch slot bounds from (e.g., ['fct_block', 'fct_attestation']) */
  tables: string[];
  /** Initial slot to start at (defaults to maxSlot - 2 for safety buffer) */
  initialSlot?: number;
  /** Initial playback mode (default: 'continuous') */
  initialMode?: SlotMode;
  /** Whether to start playing immediately on mount (default: false) */
  initialPlaying?: boolean;
  /** Initial playback speed multiplier (default: 1, range: 0.1 to 10) */
  playbackSpeed?: number;
  /** Event callbacks for slot changes and play state changes */
  callbacks?: SlotPlayerCallbacks;
}

/**
 * Meta context value for loading and error states.
 *
 * Exposed via `useSlotPlayerMeta()` to check API status when fetching slot bounds.
 * The provider uses TanStack Query which handles retries internally.
 *
 * @example
 * ```tsx
 * function SlotViewer() {
 *   const { isLoading, error } = useSlotPlayerMeta();
 *   const { currentSlot } = useSlotPlayerState();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <div>Slot {currentSlot}</div>;
 * }
 * ```
 */
export interface SlotPlayerMetaContextValue {
  /** Whether slot bounds are currently loading from the API */
  isLoading: boolean;
  /** Error object if bounds fetch failed, null otherwise */
  error: Error | null;
}

/**
 * Complete slot player context value combining all sub-contexts.
 *
 * This is the return type of `useSlotPlayer()`. For better performance, prefer
 * using individual hooks (`useSlotPlayerActions`, `useSlotPlayerState`, etc.)
 * to subscribe only to the values you need.
 *
 * @see useSlotPlayer
 * @see useSlotPlayerProgress - For 60fps progress updates
 * @see useSlotPlayerState - For slot and playback state
 * @see useSlotPlayerConfig - For settings and bounds
 * @see useSlotPlayerActions - For control functions
 * @see useSlotPlayerMeta - For loading/error state
 */
export interface SlotPlayerContextValue
  extends
    SlotPlayerProgressContextValue,
    SlotPlayerStateContextValue,
    SlotPlayerConfigContextValue,
    SlotPlayerMetaContextValue {
  /** All slot player actions for controlling playback */
  actions: SlotPlayerActions;
}
