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
 * Light mode colors - warm earthy theme (from Streamlit config)
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
 * Dark mode colors - softer cyan for better contrast
 */
export const DARK_COLORS: ThemeColors = {
  primary: '#22d3ee', // cyan-400
  secondary: '#38bdf8', // sky-400
  accent: '#67e8f9', // cyan-300
  background: '#09090b', // zinc-950
  surface: '#18181b', // zinc-900
  foreground: '#fafafa', // zinc-50
  muted: '#a1a1aa', // zinc-400
  border: '#27272a', // zinc-800
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
};
