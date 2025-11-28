import { type JSX, useEffect, useState, useMemo, useCallback } from 'react';
import { ThemeContext, type Theme } from '@/contexts/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  // Check localStorage first
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark' || stored === 'star') {
    return stored;
  }
  // Fall back to system preference
  return getSystemTheme();
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes first
    root.classList.remove('dark', 'star');
    // Add the current theme class if not light
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'star') {
      root.classList.add('star');
    }
  }, [theme]);

  // Listen for system theme changes (only if no localStorage override)
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return; // User has explicit preference

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => {
      setThemeState(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme): void => {
    setThemeState(newTheme);
    const systemTheme = getSystemTheme();

    // Only store if different from system preference
    if (newTheme !== systemTheme) {
      localStorage.setItem('theme', newTheme);
    } else {
      localStorage.removeItem('theme');
    }
  }, []);

  const clearTheme = useCallback((): void => {
    localStorage.removeItem('theme');
    setThemeState(getSystemTheme());
  }, []);

  const value = useMemo(() => ({ theme, setTheme, clearTheme }), [theme, setTheme, clearTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
