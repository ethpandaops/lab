import { createContext } from 'react';
import type { SharedCrosshairsContextValue } from './SharedCrosshairsContext.types';

/**
 * Context for managing shared crosshairs across multiple charts
 *
 * Provides registration/unregistration methods for charts to opt into
 * synchronized tooltips and axis pointers via echarts.connect()
 */
export const SharedCrosshairsContext = createContext<SharedCrosshairsContextValue | null>(null);

SharedCrosshairsContext.displayName = 'SharedCrosshairsContext';
