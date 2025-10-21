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
 * PERFORMANCE OPTIMIZATION GUIDE
 *
 * ## Context Splitting (Current Implementation)
 *
 * This hook uses context splitting to minimize re-renders by separating:
 * - `SlotPlayerProgressContext` - Updates every frame (slotProgress)
 * - `SlotPlayerStateContext` - Updates on state changes (currentSlot, isPlaying, etc.)
 * - `SlotPlayerConfigContext` - Rarely changes (slotDuration, playbackSpeed, bounds)
 * - `SlotPlayerActionsContext` - Stable actions (play, pause, goToSlot, etc.)
 * - `SlotPlayerMetaContext` - Loading/error states
 *
 * **Best Practice**: Use individual hooks instead of `useSlotPlayer()` when possible:
 *
 * ```tsx
 * // ❌ Don't subscribe to everything if you only need actions
 * const { actions } = useSlotPlayer();
 *
 * // ✅ Do subscribe only to what you need
 * const actions = useSlotPlayerActions();
 * ```
 *
 * This approach provides excellent performance by ensuring components only re-render
 * when the specific context values they consume actually change.
 */

/**
 * Hook to access slot player progress (frequently updating).
 *
 * Use this hook when you only need the slot progress to minimize re-renders.
 *
 * @throws {Error} If used outside of SlotPlayerProvider
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
 * Use this hook when you need player state like currentSlot, isPlaying, mode, etc.
 *
 * @throws {Error} If used outside of SlotPlayerProvider
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
 * Use this hook when you need config like minSlot, maxSlot, slotDuration, etc.
 *
 * @throws {Error} If used outside of SlotPlayerProvider
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
 * Use this hook when you only need to trigger actions without subscribing to state.
 *
 * @throws {Error} If used outside of SlotPlayerProvider
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
 * Use this hook when you need to handle loading or error states.
 *
 * @throws {Error} If used outside of SlotPlayerProvider
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
 * Provides a slot "player" that can navigate through historical slots with controls
 * similar to a media player - play, pause, seek, skip, etc.
 *
 * For better performance, consider using the individual hooks if you only need
 * specific parts of the context (e.g., useSlotPlayerActions for controls only).
 *
 * @example
 * ```tsx
 * function SlotViewer() {
 *   const { currentSlot, isPlaying, actions, isLoading, error } = useSlotPlayer();
 *
 *   if (isLoading) return <div>Loading slot bounds...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Slot {currentSlot} - Progress: {slotProgress}ms</p>
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
 * @throws {Error} If used outside of SlotPlayerProvider
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
