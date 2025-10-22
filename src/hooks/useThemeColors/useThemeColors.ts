import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { resolveCssColorToHex } from '@/utils/colour';

export interface ThemeColors {
  // Brand colors
  primary: string;
  secondary: string;
  accent: string;

  // Surface colors
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;

  // State colors
  success: string;
  warning: string;
  danger: string;
}

/**
 * Get theme colors as hex values suitable for chart libraries
 *
 * Reactively updates when theme changes (light/dark mode).
 * All colors are resolved to hex format for compatibility with libraries like ECharts.
 *
 * @returns {ThemeColors} Object containing all semantic theme colors as hex strings
 *
 * @example
 * ```tsx
 * function MyChart() {
 *   const colors = useThemeColors();
 *
 *   const option = {
 *     color: [colors.primary, colors.secondary],
 *     textStyle: { color: colors.foreground },
 *     backgroundColor: colors.background,
 *   };
 *
 *   return <ReactECharts option={option} />;
 * }
 * ```
 */
export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();

  return useMemo(() => {
    // Get computed CSS variable values
    const root = document.documentElement;
    const style = getComputedStyle(root);

    const getCssVar = (name: string): string => {
      const value = style.getPropertyValue(name).trim();
      return resolveCssColorToHex(value, '#000000');
    };

    return {
      // Brand colors
      primary: getCssVar('--color-primary'),
      secondary: getCssVar('--color-secondary'),
      accent: getCssVar('--color-accent'),

      // Surface colors
      background: getCssVar('--color-background'),
      surface: getCssVar('--color-surface'),
      foreground: getCssVar('--color-foreground'),
      muted: getCssVar('--color-muted'),
      border: getCssVar('--color-border'),

      // State colors
      success: getCssVar('--color-success'),
      warning: getCssVar('--color-warning'),
      danger: getCssVar('--color-danger'),
    };
  }, [theme]); // Re-compute when theme changes
}
