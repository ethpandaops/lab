import type { ReactNode } from 'react';

/**
 * Position where the notification will appear on screen
 */
export type NotificationPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Variant of the notification (affects styling and icon)
 */
export type NotificationVariant = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationProps {
  /**
   * Whether the notification is visible
   */
  open: boolean;
  /**
   * Callback when the notification closes
   */
  onClose: () => void;
  /**
   * Notification content/message
   */
  children: ReactNode;
  /**
   * Position on screen (default: 'top-center')
   */
  position?: NotificationPosition;
  /**
   * Variant/type of notification (default: 'info')
   */
  variant?: NotificationVariant;
  /**
   * Duration in milliseconds before auto-dismiss (default: 3000)
   * Set to 0 or null to disable auto-dismiss
   */
  duration?: number | null;
  /**
   * Whether to show a close button (default: false)
   */
  showCloseButton?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}
