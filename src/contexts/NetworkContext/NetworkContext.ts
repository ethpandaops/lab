import { createContext } from 'react';
import type { NetworkContextValue } from './NetworkContext.types';

export const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);
