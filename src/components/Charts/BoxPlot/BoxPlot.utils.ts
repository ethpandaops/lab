import type { BoxPlotStats } from './BoxPlot.types';

/**
 * Median of values sorted ascending, or `fallback` when there are none
 */
function sortedMedian(sorted: number[], fallback: number): number {
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid];
  if (upper === undefined) return fallback;
  if (sorted.length % 2 === 1) return upper;
  return ((sorted[mid - 1] ?? upper) + upper) / 2;
}

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
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;

  // Calculate median
  const median = sortedMedian(sorted, 0);

  // Calculate Q1 (median of lower half)
  const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const q1 = sortedMedian(lowerHalf, median);

  // Calculate Q3 (median of upper half)
  const upperHalf = sorted.slice(Math.ceil(sorted.length / 2));
  const q3 = sortedMedian(upperHalf, median);

  return [min, q1, median, q3, max];
}
