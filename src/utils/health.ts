import type { ThemeColors } from '@/hooks/useThemeColors';

/**
 * Health-based utility functions for status indicators and visualizations
 */

/**
 * Get health-based color for percentage values
 *
 * @param percentage - Value 0-100
 * @param colors - Theme colors from useThemeColors hook
 * @returns Semantic color based on health thresholds (>90% success, 70-90% warning, <70% danger, 0% muted)
 *
 * @example
 * ```tsx
 * const colors = useThemeColors();
 * getHealthColor(95, colors)  // Returns colors.success
 * getHealthColor(80, colors)  // Returns colors.warning
 * getHealthColor(50, colors)  // Returns colors.danger
 * getHealthColor(0, colors)   // Returns colors.muted
 * ```
 */
export function getHealthColor(percentage: number, colors: ThemeColors): string {
  if (percentage >= 90) return colors.success;
  if (percentage >= 70) return colors.warning;
  if (percentage > 0) return colors.danger;
  return colors.muted;
}
