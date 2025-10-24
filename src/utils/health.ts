/**
 * Health-based utility functions for status indicators and visualizations
 */

/**
 * Get health-based color for percentage values
 *
 * @param percentage - Value 0-100
 * @returns Hex color based on health thresholds (>90% green, 70-90% amber, <70% red, 0% gray)
 *
 * @example
 * ```tsx
 * getHealthColor(95)  // Returns '#22c55e' (green-500)
 * getHealthColor(80)  // Returns '#f59e0b' (amber-500)
 * getHealthColor(50)  // Returns '#ef4444' (red-500)
 * getHealthColor(0)   // Returns '#888888' (gray-500)
 * ```
 */
export function getHealthColor(percentage: number): string {
  if (percentage >= 90) return '#22c55e'; // green-500
  if (percentage >= 70) return '#f59e0b'; // amber-500
  if (percentage > 0) return '#ef4444'; // red-500
  return '#888888'; // gray-500
}
