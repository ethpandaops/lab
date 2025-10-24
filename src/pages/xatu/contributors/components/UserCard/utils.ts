/**
 * Convert ISO country code to flag emoji
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';

  // Convert country code to regional indicator symbols
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Convert timestamp to relative time (e.g., "2 mins ago", "1 hour ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(diff / 86400);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/**
 * Get the raw Tailwind badge color classes based on contributor classification
 * Uses semantic theme colors with dark mode support for custom badge styling
 */
export function getClassificationBadgeClasses(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'bg-primary/10 text-primary inset-ring-primary/20 dark:bg-primary/10 dark:text-primary dark:inset-ring-primary/10';
    case 'corporate':
      return 'bg-purple-500/10 text-purple-600 inset-ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:inset-ring-purple-500/10';
    case 'internal':
      return 'bg-success/10 text-success inset-ring-success/20 dark:bg-success/10 dark:text-success dark:inset-ring-success/10';
    default:
      return 'bg-muted/10 text-muted inset-ring-muted/20 dark:bg-muted/10 dark:text-muted dark:inset-ring-muted/10';
  }
}

/**
 * Get the border color class based on contributor classification
 * Uses semantic theme colors for consistency
 */
export function getBorderColor(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'border-primary';
    case 'corporate':
      return 'border-purple-500';
    case 'internal':
      return 'border-success';
    default:
      return 'border-muted';
  }
}

/**
 * Get the display label for a contributor classification
 */
export function getClassificationLabel(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'Individual';
    case 'corporate':
      return 'Corporate';
    case 'internal':
      return 'Internal (ethPandaOps)';
    default:
      return 'Unclassified';
  }
}

/**
 * Get the text color class based on contributor classification
 * Uses semantic theme colors for consistency
 */
export function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'text-primary';
    case 'corporate':
      return 'text-purple-600 dark:text-purple-400';
    case 'internal':
      return 'text-success';
    default:
      return 'text-muted';
  }
}
