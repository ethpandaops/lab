import type { BoxPlotStats } from './BoxPlot.types';

/**
 * Calculates box plot statistics from an array of raw values
 *
 * @param data - Array of numeric values
 * @returns Five-number summary [min, Q1, median, Q3, max]
 *
 * @example
 * ```tsx
 * const stats = calculateBoxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * // Returns [1, 3, 5.5, 8, 10]
 * ```
 */
export function calculateBoxPlotStats(data: number[]): BoxPlotStats {
  if (data.length === 0) {
    return [0, 0, 0, 0, 0];
  }

  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Calculate median
  const midpoint = sorted.length / 2;
  const median = sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[Math.floor(midpoint)];

  // Calculate Q1 (median of lower half)
  const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const q1Mid = lowerHalf.length / 2;
  const q1 = lowerHalf.length % 2 === 0 ? (lowerHalf[q1Mid - 1] + lowerHalf[q1Mid]) / 2 : lowerHalf[Math.floor(q1Mid)];

  // Calculate Q3 (median of upper half)
  const upperHalf = sorted.slice(Math.ceil(sorted.length / 2));
  const q3Mid = upperHalf.length / 2;
  const q3 = upperHalf.length % 2 === 0 ? (upperHalf[q3Mid - 1] + upperHalf[q3Mid]) / 2 : upperHalf[Math.floor(q3Mid)];

  return [min, q1, median, q3, max];
}
