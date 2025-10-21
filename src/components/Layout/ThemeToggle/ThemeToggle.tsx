import { type JSX } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { Toggle } from '@/components/Forms/Toggle';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleToggle = (checked: boolean): void => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <Toggle
      checked={isDark}
      onChange={handleToggle}
      leftIcon={<SunIcon />}
      rightIcon={<MoonIcon />}
      leftColor="text-amber-500"
      rightColor="text-primary"
      srLabel="Toggle dark mode"
      size="small"
    />
  );
}
