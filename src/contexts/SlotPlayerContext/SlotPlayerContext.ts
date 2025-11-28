import { createContext } from 'react';
import type {
  SlotPlayerProgressContextValue,
  SlotPlayerStateContextValue,
  SlotPlayerConfigContextValue,
  SlotPlayerMetaContextValue,
  SlotPlayerActions,
} from './SlotPlayerContext.types';

/**
 * Context for slot player progress (60fps updates).
 *
 * Contains `slotProgress` which updates every animation frame during playback.
 * Subscribe via `useSlotPlayerProgress()` only when you need real-time progress
 * updates (progress bars, animations). Otherwise use other specialized hooks to
 * avoid 60fps re-renders.
 *
 * @see useSlotPlayerProgress
 */
export const SlotPlayerProgressContext = createContext<SlotPlayerProgressContextValue | undefined>(undefined);
SlotPlayerProgressContext.displayName = 'SlotPlayerProgress';

/**
 * Context for slot player state (slot and playback state).
 *
 * Contains current slot, playing status, mode, staleness, liveness, and pause reason.
 * Updates when the slot changes or playback state changes. All slot values are actual
 * beacon chain slot numbers.
 *
 * @see useSlotPlayerState
 */
export const SlotPlayerStateContext = createContext<SlotPlayerStateContextValue | undefined>(undefined);
SlotPlayerStateContext.displayName = 'SlotPlayerState';

/**
 * Context for slot player configuration (settings and bounds).
 *
 * Contains playback speed, min/max slot bounds. Rarely changes - only when user
 * adjusts settings or new bounds are fetched from the API.
 *
 * **Note**: Slot duration is determined by the `SECONDS_PER_SLOT` constant and not
 * exposed in this context.
 *
 * @see useSlotPlayerConfig
 */
export const SlotPlayerConfigContext = createContext<SlotPlayerConfigContextValue | undefined>(undefined);
SlotPlayerConfigContext.displayName = 'SlotPlayerConfig';

/**
 * Context for slot player actions (stable control functions).
 *
 * Contains all playback control, navigation, seek, and settings functions.
 * All functions are memoized and never change - safe to use without causing
 * re-renders. All actions work with actual beacon chain slot numbers.
 *
 * @see useSlotPlayerActions
 */
export const SlotPlayerActionsContext = createContext<SlotPlayerActions | undefined>(undefined);
SlotPlayerActionsContext.displayName = 'SlotPlayerActions';

/**
 * Context for slot player meta state (loading and errors).
 *
 * Contains loading and error states from the slot bounds API fetch.
 * Updates during initial load and on API errors.
 *
 * @see useSlotPlayerMeta
 */
export const SlotPlayerMetaContext = createContext<SlotPlayerMetaContextValue | undefined>(undefined);
SlotPlayerMetaContext.displayName = 'SlotPlayerMeta';
