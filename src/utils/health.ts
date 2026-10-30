import type { ThemeColors } from '@/hooks/useThemeColors';

/**
 * Health-based utility functions for status indicators and visualizations
 */

/**
 * Get health-based color for participation-style percentages.
 *
 * Follows the app-wide scale for participation and online rates: 99% and above is good,
 * 95–99% is unremarkable, below 95% is a warning, and below two thirds (where the chain
 * stops finalizing) is bad.
 *
 * @param percentage - Value 0-100
 * @param colors - Theme colors from useThemeColors hook
 * @returns success (>= 99), muted (95–99), warning (2/3–95), danger (> 0 and < 2/3), muted (0)
 *
 * @example
 * ```tsx
 * const colors = useThemeColors();
 * getHealthColor(99.5, colors) // colors.success
 * getHealthColor(97, colors)   // colors.muted
 * getHealthColor(80, colors)   // colors.warning
 * getHealthColor(50, colors)   // colors.danger
 * getHealthColor(0, colors)    // colors.muted
 * ```
 */
export function getHealthColor(percentage: number, colors: ThemeColors): string {
  if (percentage >= 99) return colors.success;
  if (percentage >= 95) return colors.muted;
  if (percentage >= 200 / 3) return colors.warning;
  if (percentage > 0) return colors.danger;
  return colors.muted;
}
