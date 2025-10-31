/**
 * Discord-style timestamp formatting utilities
 */

/**
 * Discord timestamp format types
 */
export type DiscordTimestampStyle =
  | 't' // Short Time (e.g., "16:20")
  | 'T' // Long Time (e.g., "16:20:30")
  | 'd' // Short Date (e.g., "20/04/2021")
  | 'D' // Long Date (e.g., "20 April 2021")
  | 'f' // Short Date/Time (e.g., "20 April 2021 16:20")
  | 'F' // Long Date/Time (e.g., "Tuesday, 20 April 2021 16:20")
  | 'R'; // Relative Time (e.g., "2 months ago")

/**
 * Format a Unix timestamp in Discord style
 * @param timestamp - Unix timestamp in seconds
 * @param style - Discord timestamp style
 * @returns Formatted timestamp string
 *
 * @example
 * ```ts
 * formatDiscordTimestamp(1618932030, 't'); // "4:20 PM"
 * formatDiscordTimestamp(1618932030, 'T'); // "4:20:30 PM"
 * formatDiscordTimestamp(1618932030, 'd'); // "4/20/2021"
 * formatDiscordTimestamp(1618932030, 'D'); // "April 20, 2021"
 * formatDiscordTimestamp(1618932030, 'f'); // "April 20, 2021 4:20 PM"
 * formatDiscordTimestamp(1618932030, 'F'); // "Tuesday, April 20, 2021 4:20 PM"
 * formatDiscordTimestamp(1618932030, 'R'); // "2 months ago"
 * ```
 */
export function formatDiscordTimestamp(timestamp: number, style: DiscordTimestampStyle): string {
  const date = new Date(timestamp * 1000);

  switch (style) {
    case 't': // Short Time
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

    case 'T': // Long Time
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });

    case 'd': // Short Date
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });

    case 'D': // Long Date
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    case 'f': // Short Date/Time
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

    case 'F': // Long Date/Time
      return date.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

    case 'R': // Relative Time
      return formatRelativeTime(timestamp);

    default:
      return date.toLocaleString();
  }
}

/**
 * Get all Discord timestamp formats for a given timestamp
 * @param timestamp - Unix timestamp in seconds
 * @returns Object with all Discord timestamp formats
 */
export function getAllDiscordFormats(timestamp: number): Record<DiscordTimestampStyle, string> {
  return {
    t: formatDiscordTimestamp(timestamp, 't'),
    T: formatDiscordTimestamp(timestamp, 'T'),
    d: formatDiscordTimestamp(timestamp, 'd'),
    D: formatDiscordTimestamp(timestamp, 'D'),
    f: formatDiscordTimestamp(timestamp, 'f'),
    F: formatDiscordTimestamp(timestamp, 'F'),
    R: formatDiscordTimestamp(timestamp, 'R'),
  };
}

/**
 * Format a relative time string (similar to Discord's "R" format)
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string
 */
function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  // Less than a minute
  if (absDiff < 60) {
    const seconds = Math.floor(absDiff);
    if (seconds === 0) return 'now';
    return isFuture
      ? `in ${seconds} second${seconds === 1 ? '' : 's'}`
      : `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  }

  // Less than an hour
  if (absDiff < 3600) {
    const minutes = Math.floor(absDiff / 60);
    return isFuture
      ? `in ${minutes} minute${minutes === 1 ? '' : 's'}`
      : `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  // Less than a day
  if (absDiff < 86400) {
    const hours = Math.floor(absDiff / 3600);
    return isFuture ? `in ${hours} hour${hours === 1 ? '' : 's'}` : `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  // Less than a month (30 days)
  if (absDiff < 2592000) {
    const days = Math.floor(absDiff / 86400);
    return isFuture ? `in ${days} day${days === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'} ago`;
  }

  // Less than a year
  if (absDiff < 31536000) {
    const months = Math.floor(absDiff / 2592000);
    return isFuture ? `in ${months} month${months === 1 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'} ago`;
  }

  // Years
  const years = Math.floor(absDiff / 31536000);
  return isFuture ? `in ${years} year${years === 1 ? '' : 's'}` : `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Get Discord timestamp style descriptions
 */
export const DISCORD_STYLE_LABELS: Record<DiscordTimestampStyle, string> = {
  t: 'Short Time',
  T: 'Long Time',
  d: 'Short Date',
  D: 'Long Date',
  f: 'Short Date/Time',
  F: 'Long Date/Time',
  R: 'Relative Time',
};
