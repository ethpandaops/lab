/**
 * Theme color definitions for programmatic usage
 *
 * These values mirror the theme defined in src/index.css.
 * They are used by:
 * - src/hooks/useThemeColors (provides theme colors to TypeScript/React components)
 * - Chart components (ECharts, etc.) that need hex color values
 * - Any component requiring programmatic color access
 *
 * Note: The canonical theme definition is in src/index.css.
 * These values must be kept in sync with the CSS theme.
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
 * Light mode colors - warm earthy theme
 */
export const LIGHT_COLORS: ThemeColors = {
  primary: '#bb5a38', // warm rust/terracotta
  secondary: '#e8e7dd', // warm light gray-beige
  accent: '#d4794f', // warm terracotta accent
  background: '#f4f3ed', // warm cream
  surface: '#ecebe3', // warm light gray
  foreground: '#3d3a2a', // dark brown
  muted: '#6b6755', // warm muted gray-brown
  border: '#d3d2ca', // warm light border
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
};

/**
 * Dark mode colors - Mocha Rose (rich chocolate with rose-gold)
 */
export const DARK_COLORS: ThemeColors = {
  primary: '#d57a5e', // rose-terracotta
  secondary: '#2b221f', // deep mocha
  accent: '#e19b7e', // rose-gold peach
  background: '#1e1613', // rich chocolate
  surface: '#271e1b', // elevated mocha
  foreground: '#f0e7dc', // warm ivory
  muted: '#a88672', // warm mocha-tan
  border: '#3e322c', // mocha border
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
};
