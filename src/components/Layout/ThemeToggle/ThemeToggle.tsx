import { type JSX } from 'react';
import { MoonIcon, SunIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/contexts/ThemeContext';

/**
 * ThemeToggle component that cycles through light, dark, and star themes.
 *
 * Displays the current theme icon and cycles to the next theme on click:
 * light -> dark -> star -> light
 */
export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();

  const cycleTheme = (): void => {
    const themeOrder: Theme[] = ['light', 'dark', 'star'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const getThemeIcon = (): JSX.Element => {
    switch (theme) {
      case 'light':
        return <SunIcon className="h-5 w-5 text-amber-500" />;
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
      className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-surface"
      aria-label={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
      title={getThemeLabel()}
    >
      {getThemeIcon()}
    </button>
  );
}
