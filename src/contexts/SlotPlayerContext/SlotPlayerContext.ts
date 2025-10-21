import { createContext } from 'react';
import type {
  SlotPlayerProgressContextValue,
  SlotPlayerStateContextValue,
  SlotPlayerConfigContextValue,
  SlotPlayerMetaContextValue,
  SlotPlayerActions,
} from './SlotPlayerContext.types';

export const SlotPlayerProgressContext = createContext<SlotPlayerProgressContextValue | undefined>(undefined);

export const SlotPlayerStateContext = createContext<SlotPlayerStateContextValue | undefined>(undefined);

export const SlotPlayerConfigContext = createContext<SlotPlayerConfigContextValue | undefined>(undefined);

export const SlotPlayerActionsContext = createContext<SlotPlayerActions | undefined>(undefined);

export const SlotPlayerMetaContext = createContext<SlotPlayerMetaContextValue | undefined>(undefined);
