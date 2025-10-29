/**
 * Format a number with smart decimal places
 * Only shows decimal places when needed, up to a maximum precision
 *
 * @param value - Number to format
 * @param maxDecimals - Maximum decimal places to show (default: 2)
 * @returns Formatted string
 *
 * @example
 * formatSmartDecimal(100)      // "100"
 * formatSmartDecimal(100.5)    // "100.5"
 * formatSmartDecimal(100.123)  // "100.12"
 * formatSmartDecimal(99.9999)  // "100"
 */
export function formatSmartDecimal(value: number, maxDecimals: number = 2): string {
  // Round to max decimals
  const rounded = Number(value.toFixed(maxDecimals));

  // If it's a whole number after rounding, show no decimals
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  // Otherwise show only the necessary decimals
  return rounded.toString();
}
