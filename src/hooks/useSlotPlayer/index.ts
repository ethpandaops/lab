export {
  useSlotPlayer,
  useSlotPlayerProgress,
  useSlotPlayerState,
  useSlotPlayerConfig,
  useSlotPlayerActions,
  useSlotPlayerMeta,
} from './useSlotPlayer';

// Re-export types from context for convenience
export type {
  SlotMode,
  PauseReason,
  SlotPlayerProgressContextValue,
  SlotPlayerStateContextValue,
  SlotPlayerConfigContextValue,
  SlotPlayerMetaContextValue,
  SlotPlayerActions,
  SlotPlayerCallbacks,
  SlotPlayerContextValue,
} from '@/contexts/SlotPlayerContext';
