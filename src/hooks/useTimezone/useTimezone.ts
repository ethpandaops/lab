import { useContext } from 'react';
import { TimezoneContext } from '@/contexts/TimezoneContext';
import type { TimezoneContextValue } from '@/contexts/TimezoneContext';

/**
 * Hook to access timezone preferences
 * @throws {Error} If used outside of TimezoneProvider
 */
export function useTimezone(): TimezoneContextValue {
  const context = useContext(TimezoneContext);

  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }

  return context;
}
