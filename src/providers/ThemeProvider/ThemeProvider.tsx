import { type JSX, useEffect, useState, useMemo, useCallback } from 'react';
import { ThemeContext, type Theme } from '@/contexts/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force a specific theme via URL param - overrides user preference and localStorage */
  themeOverride?: Theme;
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

export function ThemeProvider({ children, themeOverride }: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Determine effective theme - URL override takes precedence
  const effectiveTheme = themeOverride ?? theme;

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes first
    root.classList.remove('dark', 'star');
    // Add the current theme class if not light
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else if (effectiveTheme === 'star') {
      root.classList.add('star');
    }
  }, [effectiveTheme]);

  // Listen for system theme changes (only if no localStorage override and no URL override)
  useEffect(() => {
    if (themeOverride) return; // URL override active, don't listen to system changes

    const stored = localStorage.getItem('theme');
    if (stored) return; // User has explicit preference

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => {
      setThemeState(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeOverride]);

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

  // Expose effective theme (with override applied) to consumers
  const value = useMemo(
    () => ({ theme: effectiveTheme, setTheme, clearTheme }),
    [effectiveTheme, setTheme, clearTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
