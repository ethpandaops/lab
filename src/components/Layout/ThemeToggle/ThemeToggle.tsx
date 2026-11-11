import { type JSX } from 'react';
import { MoonIcon, SunIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/contexts/ThemeContext';

/** The theme each click moves to */
const NEXT_THEME: Record<Theme, Theme> = { light: 'dark', dark: 'star', star: 'light' };

/**
 * ThemeToggle component that cycles through light, dark, and star themes.
 *
 * Displays the current theme icon and cycles to the next theme on click:
 * light -> dark -> star -> light
 */
export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();

  const cycleTheme = (): void => {
    setTheme(NEXT_THEME[theme]);
  };

  const getThemeIcon = (): JSX.Element => {
    switch (theme) {
      case 'light':
        return <SunIcon className="h-5 w-5 text-warning" />;
      case 'dark':
        return <MoonIcon className="h-5 w-5 text-primary" />;
      case 'star':
        return <SparklesIcon className="h-5 w-5 text-primary" />;
    }
  };

  const getThemeLabel = (): string => {
    switch (theme) {
      case 'light':
        return 'Light theme';
      case 'dark':
        return 'Dark theme';
      case 'star':
        return 'Star theme';
    }
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-8 w-8 items-center justify-center rounded-sm transition-colors hover:bg-primary-10 hover:text-primary"
      aria-label={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
      title={getThemeLabel()}
    >
      {getThemeIcon()}
    </button>
  );
}
