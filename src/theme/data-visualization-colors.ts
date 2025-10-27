/**
 * Data Visualization Color Constants
 *
 * Shared color constants for data visualizations, charts, and maps.
 * These are separate from theme colors because they represent data categories
 * rather than UI elements.
 *
 * Uses Tailwind's color palette for maintainability - colors automatically
 * stay in sync with Tailwind updates.
 */

import colors from 'tailwindcss/colors';

/**
 * Continent/Region color mappings
 * Used across geographical visualizations for consistent continent colors
 */
export const CONTINENT_COLORS = {
  AF: colors.red[500], // Africa - red-500
  AS: colors.amber[500], // Asia - amber-500
  EU: colors.emerald[500], // Europe - emerald-500
  NA: colors.blue[500], // North America - blue-500
  OC: colors.cyan[500], // Oceania - cyan-500
  SA: colors.violet[500], // South America - violet-500
  AN: colors.slate[500], // Antarctica - slate-500
} as const;

/**
 * Blob index colors for data availability visualization
 * Used in real-time and blob data availability components
 */
export const BLOB_COLORS = [
  colors.cyan[500], // Blob 0 - cyan-500
  colors.pink[500], // Blob 1 - pink-500
  colors.amber[500], // Blob 2 - amber-500
  colors.green[500], // Blob 3 - green-500
  colors.violet[500], // Blob 4 - violet-500
  colors.red[500], // Blob 5 - red-500
] as const;

/**
 * Performance time-based color gradient (fast → slow)
 * Used for blob data availability timing visualization
 */
export const PERFORMANCE_TIME_COLORS = {
  excellent: colors.green[500], // 0-1s - green-500 (very fast)
  good: colors.lime[500], // 1-2s - lime-500 (fast)
  fair: colors.yellow[500], // 2-3s - yellow-500 (moderate)
  slow: colors.orange[500], // 3-4s - orange-500 (slow)
  poor: colors.red[500], // 4+s - red-500 (very slow)
} as const;

/**
 * Categorical color palette for multi-series charts
 * Used when you need distinct colors for multiple data series
 * Optimized for visual distinction and accessibility
 */
export const CHART_CATEGORICAL_COLORS = [
  colors.blue[500], // blue-500
  colors.emerald[500], // emerald-500
  colors.amber[500], // amber-500
  colors.red[500], // red-500
  colors.cyan[500], // cyan-500
  colors.lime[500], // lime-500
  colors.orange[500], // orange-500
  colors.purple[500], // purple-500
  colors.pink[500], // pink-500
  colors.violet[500], // violet-500
  colors.teal[500], // teal-500
  colors.indigo[500], // indigo-500
  colors.rose[500], // rose-500
  colors.fuchsia[500], // fuchsia-500
  colors.sky[500], // sky-500
] as const;
