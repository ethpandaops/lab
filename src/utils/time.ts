/**
 * Time-related utility functions
 */

/**
 * Convert Unix timestamp to a human-readable relative time string with time sections
 * @param timestamp - Unix timestamp in seconds (optional, can be null/undefined)
 * @returns Relative time string with detailed breakdown (e.g., "2m 30s ago", "1h 15m ago")
 *
 * @example
 * ```ts
 * getRelativeTime(Date.now() / 1000 - 30); // "30s ago"
 * getRelativeTime(Date.now() / 1000 - 120); // "2m ago"
 * getRelativeTime(Date.now() / 1000 - 7200); // "2h ago"
 * getRelativeTime(null); // "Never"
 * ```
 */
export function getRelativeTime(timestamp?: number | null): string {
  // Handle null/undefined timestamps
  if (timestamp == null) return 'Never';
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  // Future timestamps
  if (diff < 0) {
    const absDiff = Math.abs(diff);

    // Less than a minute
    if (absDiff < 60) {
      return `in ${Math.floor(absDiff)}s`;
    }

    // Less than an hour - show minutes and seconds
    if (absDiff < 3600) {
      const mins = Math.floor(absDiff / 60);
      const secs = Math.floor(absDiff % 60);
      return secs > 0 ? `in ${mins}m ${secs}s` : `in ${mins}m`;
    }

    // Less than a day - show hours and minutes
    if (absDiff < 86400) {
      const hours = Math.floor(absDiff / 3600);
      const mins = Math.floor((absDiff % 3600) / 60);
      return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
    }

    // Days
    const days = Math.floor(absDiff / 86400);
    const hours = Math.floor((absDiff % 86400) / 3600);
    return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
  }

  // Past timestamps
  // Less than a minute
  if (diff < 60) {
    return `${Math.floor(diff)}s ago`;
  }

  // Less than an hour - show minutes and seconds
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    const secs = Math.floor(diff % 60);
    return secs > 0 ? `${mins}m ${secs}s ago` : `${mins}m ago`;
  }

  // Less than a day - show hours and minutes
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
  }

  // Days - show days and hours
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h ago` : `${days}d ago`;
}

/**
 * Format a Unix timestamp to a human-readable date string
 * @param timestamp - Unix timestamp in seconds
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatTimestamp(1609459200); // "Jan 1, 2021, 12:00:00 AM"
 * formatTimestamp(1609459200, { dateStyle: 'short', timeStyle: 'short' }); // "1/1/21, 12:00 AM"
 * ```
 */
export function formatTimestamp(
  timestamp: number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }
): string {
  return new Date(timestamp * 1000).toLocaleString(undefined, options);
}
