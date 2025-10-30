import { useMemo, useSyncExternalStore } from 'react';
import { resolveCssColorToHex } from '@/utils/color';

/**
 * Theme color interface - all semantic tokens as hex strings
 */
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
 * Get current theme colors by reading computed CSS variables
 *
 * CSS (src/index.css) is the single source of truth for theme colors.
 * This function resolves CSS variables to hex values at runtime.
 *
 * @returns {ThemeColors} Object containing all semantic theme colors as hex strings
 */
function getComputedThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement);

  return {
    primary: resolveCssColorToHex(styles.getPropertyValue('--color-primary').trim()),
    secondary: resolveCssColorToHex(styles.getPropertyValue('--color-secondary').trim()),
    accent: resolveCssColorToHex(styles.getPropertyValue('--color-accent').trim()),
    background: resolveCssColorToHex(styles.getPropertyValue('--color-background').trim()),
    surface: resolveCssColorToHex(styles.getPropertyValue('--color-surface').trim()),
    foreground: resolveCssColorToHex(styles.getPropertyValue('--color-foreground').trim()),
    muted: resolveCssColorToHex(styles.getPropertyValue('--color-muted').trim()),
    border: resolveCssColorToHex(styles.getPropertyValue('--color-border').trim()),
    success: resolveCssColorToHex(styles.getPropertyValue('--color-success').trim()),
    warning: resolveCssColorToHex(styles.getPropertyValue('--color-warning').trim()),
    danger: resolveCssColorToHex(styles.getPropertyValue('--color-danger').trim()),
  };
}

/**
 * Get current theme mode from HTML class
 *
 * Returns stable reference ('light', 'dark', or 'star') based on document.documentElement classes.
 * Used by useSyncExternalStore to detect theme changes.
 *
 * @returns {'light' | 'dark' | 'star'} Current theme mode
 */
function getCurrentTheme(): 'light' | 'dark' | 'star' {
  const classList = document.documentElement.classList;
  if (classList.contains('star')) return 'star';
  if (classList.contains('dark')) return 'dark';
  return 'light';
}

/**
 * Get theme colors as hex values suitable for chart libraries
 *
 * Reactively updates when theme changes (light/dark/star mode).
 * Colors are computed from CSS variables (src/index.css), ensuring single source of truth.
 *
 * **How it works:**
 * 1. Observes `<html>` element class changes via MutationObserver
 * 2. Returns stable theme string ('light'/'dark'/'star') from getSnapshot
 * 3. When theme changes, triggers re-computation via useMemo
 * 4. Reads CSS variables via `getComputedStyle` and converts to hex
 *
 * **Tailwind CSS v4 Alignment:**
 * This follows the official Tailwind v4 recommendation to access theme values
 * at runtime using CSS variables and `getComputedStyle`.
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
  // Observe HTML class changes to detect theme toggles
  // getSnapshot returns stable string reference ('light'/'dark'/'star')
  const theme = useSyncExternalStore(
    callback => {
      const observer = new MutationObserver(callback);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      return () => observer.disconnect();
    },
    getCurrentTheme, // Client-side: read current theme from DOM
    getCurrentTheme // SSR: same logic (though DOM may not exist)
  );

  // Recompute colors only when theme actually changes
  // eslint-disable-next-line react-hooks/exhaustive-deps -- theme dependency is correct, triggers recomputation on theme change
  return useMemo(() => getComputedThemeColors(), [theme]);
}
