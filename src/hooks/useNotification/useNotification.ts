import { useContext } from 'react';
import { NotificationContext } from '@/contexts/NotificationContext';
import type { NotificationContextValue } from '@/contexts/NotificationContext';

/**
 * Hook to access the notification system
 *
 * Provides methods to show toast notifications throughout the app.
 *
 * @throws Error if used outside NotificationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showSuccess, showError } = useNotification();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       showSuccess('Data saved successfully!');
 *     } catch (error) {
 *       showError('Failed to save data');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }

  return context;
}
