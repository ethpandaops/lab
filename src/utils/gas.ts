/**
 * Format gas value to millions with M suffix
 *
 * @param gas - Gas value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted gas string (e.g., "30M")
 *
 * @example
 * ```ts
 * formatGasToMillions(30000000) // "30M"
 * formatGasToMillions(30000000, 2) // "30.00M"
 * formatGasToMillions(15500000) // "15.5M"
 * ```
 */
export function formatGasToMillions(gas: number, decimals = 1): string {
  const millions = gas / 1_000_000;
  return `${millions.toFixed(decimals)}M`;
}

/**
 * Format gas used and limit with percentage
 *
 * @param used - Gas used value
 * @param limit - Gas limit value
 * @returns Formatted string showing used/limit (percentage) or 'N/A'
 *
 * @example
 * ```ts
 * formatGasWithPercentage(30000000, 30000000) // "30M / 30M (100.0%)"
 * formatGasWithPercentage(15000000, 30000000) // "15M / 30M (50.0%)"
 * formatGasWithPercentage(null, 30000000) // "N/A"
 * ```
 */
export function formatGasWithPercentage(
  used?: number | null,
  limit?: number | null,
  usedDecimals = 1,
  limitDecimals = 0
): string {
  if (!used || !limit) return 'N/A';

  const percentage = ((used / limit) * 100).toFixed(1);
  const usedFormatted = formatGasToMillions(used, usedDecimals);
  const limitFormatted = formatGasToMillions(limit, limitDecimals);

  return `${usedFormatted} / ${limitFormatted} (${percentage}%)`;
}
