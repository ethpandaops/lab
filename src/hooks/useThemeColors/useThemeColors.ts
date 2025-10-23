import { useMemo, useSyncExternalStore } from 'react';
import { LIGHT_COLORS, DARK_COLORS, STAR_COLORS, type ThemeColors } from '@/theme/colors';

// Re-export the interface for convenience
export type { ThemeColors };

/**
 * Get theme colors as hex values suitable for chart libraries
 *
 * Reactively updates when theme changes (light/dark/star mode).
 * Returns color constants from src/theme/colors.ts.
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
  // Observe HTML class changes to detect theme toggles (works with Storybook)
  const theme = useSyncExternalStore(
    callback => {
      const observer = new MutationObserver(() => callback());
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    },
    () => {
      const classList = document.documentElement.classList;
      if (classList.contains('star')) return 'star';
      if (classList.contains('dark')) return 'dark';
      return 'light';
    },
    () => {
      const classList = document.documentElement.classList;
      if (classList.contains('star')) return 'star';
      if (classList.contains('dark')) return 'dark';
      return 'light';
    }
  );

  return useMemo(() => {
    if (theme === 'star') return STAR_COLORS;
    if (theme === 'dark') return DARK_COLORS;
    return LIGHT_COLORS;
  }, [theme]);
}
