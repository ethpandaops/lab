import { createContext } from 'react';
import type { TimezoneContextValue } from './TimezoneContext.types';

/**
 * Context for managing timezone preferences in data availability pages
 * Defaults to UTC timezone
 */
export const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

TimezoneContext.displayName = 'TimezoneContext';
