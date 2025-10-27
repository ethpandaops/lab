import { useContext } from 'react';
import { DebugContext } from '../contexts/DebugContext';

/**
 * Hook to access debug context for API query toggles.
 *
 * Provides access to debug panel visibility and API query enable/disable controls.
 *
 * @throws {Error} If used outside of DebugProvider
 */
export function useDebug() {
  const context = useContext(DebugContext);

  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }

  return context;
}
