/**
 * Theme color definitions
 *
 * Single source of truth for all theme colors.
 * These values are used by:
 * - src/index.css (@layer base definitions)
 * - .storybook/preview-head.html (CSS variables for Storybook)
 * - src/hooks/useThemeColors (direct TypeScript usage)
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
 * Light mode colors - futuristic cyan theme
 */
export const LIGHT_COLORS: ThemeColors = {
  primary: '#06b6d4', // cyan-500
  secondary: '#0ea5e9', // sky-500
  accent: '#22d3ee', // cyan-400
  background: '#ffffff',
  surface: '#f9fafb', // gray-50
  foreground: '#09090b', // zinc-950
  muted: '#52525b', // zinc-600
  border: '#e4e4e7', // zinc-200
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
