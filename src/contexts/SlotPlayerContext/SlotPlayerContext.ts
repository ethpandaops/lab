import { createContext } from 'react';
import type {
  SlotPlayerProgressContextValue,
  SlotPlayerStateContextValue,
  SlotPlayerConfigContextValue,
  SlotPlayerMetaContextValue,
  SlotPlayerActions,
} from './SlotPlayerContext.types';

export const SlotPlayerProgressContext = createContext<SlotPlayerProgressContextValue | undefined>(undefined);
SlotPlayerProgressContext.displayName = 'SlotPlayerProgress';

export const SlotPlayerStateContext = createContext<SlotPlayerStateContextValue | undefined>(undefined);
SlotPlayerStateContext.displayName = 'SlotPlayerState';

export const SlotPlayerConfigContext = createContext<SlotPlayerConfigContextValue | undefined>(undefined);
SlotPlayerConfigContext.displayName = 'SlotPlayerConfig';

export const SlotPlayerActionsContext = createContext<SlotPlayerActions | undefined>(undefined);
SlotPlayerActionsContext.displayName = 'SlotPlayerActions';

export const SlotPlayerMetaContext = createContext<SlotPlayerMetaContextValue | undefined>(undefined);
SlotPlayerMetaContext.displayName = 'SlotPlayerMeta';
