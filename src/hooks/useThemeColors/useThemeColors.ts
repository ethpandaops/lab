import { useMemo, useSyncExternalStore } from 'react';
import { LIGHT_COLORS, DARK_COLORS, type ThemeColors } from '@/theme/colors';

// Re-export the interface for convenience
export type { ThemeColors };

/**
 * Get theme colors as hex values suitable for chart libraries
 *
 * Reactively updates when theme changes (light/dark mode).
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
  const isDark = useSyncExternalStore(
    callback => {
      const observer = new MutationObserver(() => callback());
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains('dark'),
    () => document.documentElement.classList.contains('dark'),
  );

  return useMemo(() => (isDark ? DARK_COLORS : LIGHT_COLORS), [isDark]);
}
