/**
 * Data Visualization Color Constants
 *
 * Shared color constants for data visualizations, charts, and maps.
 * These are separate from theme colors because they represent data categories
 * rather than UI elements.
 */

/**
 * Continent/Region color mappings
 * Used across geographical visualizations for consistent continent colors
 */
export const CONTINENT_COLORS = {
  AF: '#ef4444', // Africa - red-500
  AS: '#f59e0b', // Asia - amber-500
  EU: '#10b981', // Europe - emerald-500
  NA: '#3b82f6', // North America - blue-500
  OC: '#06b6d4', // Oceania - cyan-500
  SA: '#8b5cf6', // South America - violet-500
  AN: '#64748b', // Antarctica - slate-500
} as const;

/**
 * Blob index colors for data availability visualization
 * Used in slot-view and blob data availability components
 */
export const BLOB_COLORS = [
  '#06b6d4', // Blob 0 - cyan-500
  '#ec4899', // Blob 1 - pink-500
  '#f59e0b', // Blob 2 - amber-500
  '#22c55e', // Blob 3 - green-500
  '#8b5cf6', // Blob 4 - violet-500
  '#ef4444', // Blob 5 - red-500
] as const;

/**
 * Performance time-based color gradient (fast → slow)
 * Used for blob data availability timing visualization
 */
export const PERFORMANCE_TIME_COLORS = {
  excellent: '#22c55e', // 0-1s - green-500 (very fast)
  good: '#84cc16', // 1-2s - lime-500 (fast)
  fair: '#eab308', // 2-3s - yellow-500 (moderate)
  slow: '#f97316', // 3-4s - orange-500 (slow)
  poor: '#ef4444', // 4+s - red-500 (very slow)
} as const;

/**
 * Default chart colors for fallback scenarios
 * Used when theme colors are not available (e.g., during initial load)
 * These match the light theme but are theme-agnostic neutral colors
 */
export const DEFAULT_CHART_COLORS = {
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
} as const;
