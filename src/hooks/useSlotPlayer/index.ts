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
  SlotPlayerProgressContextValue,
  SlotPlayerStateContextValue,
  SlotPlayerConfigContextValue,
  SlotPlayerMetaContextValue,
  SlotPlayerActions,
  SlotPlayerContextValue,
} from '@/contexts/SlotPlayerContext';
