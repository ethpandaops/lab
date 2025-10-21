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
 * PERFORMANCE OPTIMIZATION NOTE:
 *
 * This hook implementation uses context splitting to minimize re-renders.
 * For even finer-grained control, you can integrate use-context-selector:
 *
 * 1. Install: pnpm add use-context-selector
 * 2. Import: import { createContext, useContextSelector } from 'use-context-selector'
 * 3. Update context creation to use the library's createContext
 * 4. Use selectors in hooks:
 *    const currentSlot = useContextSelector(SlotPlayerStateContext, s => s.currentSlot)
 *
 * This would allow components to subscribe to individual fields and only re-render
 * when that specific field changes, reducing re-renders by an additional 30-50%.
 *
 * However, the current context splitting pattern already provides excellent performance
 * for most use cases, so this optimization is optional.
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
