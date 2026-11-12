import { useState, useCallback, useEffect, useMemo, type JSX, type ReactNode } from 'react';
import { TimezoneContext } from '@/contexts/TimezoneContext';
import type { TimezoneMode } from '@/contexts/TimezoneContext';

const STORAGE_KEY = 'lab-timezone';

interface TimezoneProviderProps {
  children: ReactNode;
}

/**
 * Provider for timezone preferences across the application
 * Persists preference to localStorage
 */
export function TimezoneProvider({ children }: TimezoneProviderProps): JSX.Element {
  const [timezone, setTimezone] = useState<TimezoneMode>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'UTC' || stored === 'local') {
      return stored;
    }
    return 'UTC'; // Default to UTC
  });

  // Persist to localStorage whenever timezone changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, timezone);
  }, [timezone]);

  const toggleTimezone = useCallback(() => {
    setTimezone(prev => (prev === 'UTC' ? 'local' : 'UTC'));
  }, []);

  const value = useMemo(() => ({ timezone, toggleTimezone, setTimezone }), [timezone, toggleTimezone, setTimezone]);

  return <TimezoneContext value={value}>{children}</TimezoneContext>;
}
