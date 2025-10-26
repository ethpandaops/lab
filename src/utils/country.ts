/**
 * Country-related utility functions
 */

/**
 * Convert ISO country code to flag emoji
 *
 * @param countryCode - Two-letter ISO country code (e.g., "US", "GB", "DE")
 * @param fallback - Fallback value to return if country code is invalid (default: globe emoji)
 * @returns Flag emoji for the country, or fallback value if invalid
 *
 * @example
 * ```ts
 * getCountryFlag('US'); // "🇺🇸"
 * getCountryFlag('GB'); // "🇬🇧"
 * getCountryFlag(''); // "🌐"
 * getCountryFlag(null, ''); // ""
 * ```
 */
export function getCountryFlag(countryCode?: string | null, fallback: string = '🌐'): string {
  if (!countryCode || countryCode.length !== 2) return fallback;

  // Convert country code to regional indicator symbols
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
