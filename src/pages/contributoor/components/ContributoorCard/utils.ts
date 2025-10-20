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
 * Get the border color class based on contributor classification
 */
export function getBorderColor(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'border-l-blue-500';
    case 'corporate':
      return 'border-l-purple-500';
    case 'internal':
      return 'border-l-green-500';
    default:
      return 'border-l-gray-500';
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
 */
export function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'text-blue-600';
    case 'corporate':
      return 'text-purple-600';
    case 'internal':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
}

