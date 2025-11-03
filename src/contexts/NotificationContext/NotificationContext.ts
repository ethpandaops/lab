import { createContext } from 'react';
import type { NotificationContextValue } from './NotificationContext.types';

/**
 * Notification context for displaying toast notifications throughout the app
 */
export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
