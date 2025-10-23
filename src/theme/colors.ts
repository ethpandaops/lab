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
 * Dark mode colors - Ember Glow (warm continuity)
 */
export const DARK_COLORS: ThemeColors = {
  primary: '#e6764e', // glowing terracotta
  secondary: '#2a2520', // deep warm brown
  accent: '#f18c5d', // vibrant warm orange
  background: '#1a1612', // rich dark brown
  surface: '#231f1a', // elevated brown
  foreground: '#e8dfd5', // warm cream text
  muted: '#9a8b7a', // warm muted tan
  border: '#3d3528', // subtle warm border
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
};
