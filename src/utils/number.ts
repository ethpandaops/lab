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

/**
 * Format a slot number without commas
 * Slots should always be displayed as plain integers without locale formatting
 *
 * @param slot - Slot number to format
 * @returns Formatted slot number as string
 *
 * @example
 * formatSlot(1234567)  // "1234567"
 * formatSlot(100)      // "100"
 */
export function formatSlot(slot: number): string {
  return slot.toString();
}

/**
 * Format an epoch number without commas
 * Epochs should always be displayed as plain integers without locale formatting
 *
 * @param epoch - Epoch number to format
 * @returns Formatted epoch number as string
 *
 * @example
 * formatEpoch(12345)  // "12345"
 * formatEpoch(100)    // "100"
 */
export function formatEpoch(epoch: number): string {
  return epoch.toString();
}

/**
 * Format byte values to human-readable string
 *
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate unit (B, KB, MB)
 *
 * @example
 * formatBytes(512)       // "512 B"
 * formatBytes(2048)      // "2.0 KB"
 * formatBytes(1572864)   // "1.5 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
