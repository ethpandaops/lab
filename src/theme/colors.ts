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
 * Maps to primitive scales: terracotta + sand
 */
export const LIGHT_COLORS: ThemeColors = {
  primary: '#bb5a38', // terracotta-600
  secondary: '#efeee5', // sand-100
  accent: '#cb7044', // terracotta-500
  background: '#f4f3ed', // sand-50
  surface: '#efeee5', // sand-100
  foreground: '#2c251e', // sand-950
  muted: '#7d6b51', // sand-700
  border: '#dedbca', // sand-200
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
};

/**
 * Dark mode colors - aurora borealis with pink and purple
 * Maps to primitive scales: aurora-cyan, aurora-purple, aurora-pink, aurora-blue
 */
export const DARK_COLORS: ThemeColors = {
  primary: '#1af7f7', // aurora-cyan-400
  secondary: '#8000ff', // aurora-purple-600
  accent: '#ff33bb', // aurora-pink-500
  background: '#000a1a', // aurora-blue-950
  surface: '#0a1428', // custom (night sky blue)
  foreground: '#e6ffff', // aurora-cyan-50
  muted: '#009999', // aurora-cyan-700
  border: '#1a2847', // custom (dark blue with purple tint)
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
};
