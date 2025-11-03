import { type JSX, useState, useCallback, useMemo } from 'react';
import { NotificationContext } from '@/contexts/NotificationContext';
import { Notification } from '@/components/Overlays/Notification';
import type {
  NotificationProviderProps,
  NotificationOptions,
  NotificationContextValue,
} from '@/contexts/NotificationContext';

interface ActiveNotification extends NotificationOptions {
  id: number;
}

/**
 * NotificationProvider - Provides a centralized notification system
 *
 * Manages toast notifications throughout the app using a single React root.
 * Components can use the useNotification hook to show notifications.
 *
 * @example
 * ```tsx
 * // In app root
 * <NotificationProvider>
 *   <App />
 * </NotificationProvider>
 *
 * // In any component
 * const { showSuccess, showError } = useNotification();
 * showSuccess('Item saved!');
 * showError('Failed to save item');
 * ```
 */
export function NotificationProvider({ children }: NotificationProviderProps): JSX.Element {
  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);

  const showNotification = useCallback(({ message, variant = 'info', duration = 3000 }: NotificationOptions): void => {
    const id = Date.now();
    const notification: ActiveNotification = { id, message, variant, duration };
    setNotifications(prev => [...prev, notification]);
  }, []);

  const showSuccess = useCallback(
    (message: string): void => {
      showNotification({ message, variant: 'success' });
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string): void => {
      showNotification({ message, variant: 'danger' });
    },
    [showNotification]
  );

  const handleClose = useCallback((id: number): void => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      showNotification,
      showSuccess,
      showError,
    }),
    [showNotification, showSuccess, showError]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          open={true}
          onClose={() => handleClose(notification.id)}
          variant={notification.variant || 'info'}
          position="top-center"
          duration={notification.duration}
        >
          {notification.message}
        </Notification>
      ))}
    </NotificationContext.Provider>
  );
}
