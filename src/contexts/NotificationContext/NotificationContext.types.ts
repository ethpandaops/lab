import type { ReactNode } from 'react';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationOptions {
  /**
   * Notification message
   */
  message: string;
  /**
   * Notification variant
   * Default: 'info'
   */
  variant?: NotificationVariant;
  /**
   * Duration in milliseconds before auto-dismiss
   * Default: 3000
   */
  duration?: number;
}

export interface NotificationContextValue {
  /**
   * Show a notification toast
   */
  showNotification: (options: NotificationOptions) => void;
  /**
   * Show a success notification
   */
  showSuccess: (message: string) => void;
  /**
   * Show an error notification
   */
  showError: (message: string) => void;
}

export interface NotificationProviderProps {
  children: ReactNode;
}
