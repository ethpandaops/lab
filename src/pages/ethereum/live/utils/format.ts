/**
 * Formats wei value to ETH with appropriate precision
 * @param wei - Wei value as string or bigint
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted ETH string (e.g., "1.2345 ETH")
 */
export function formatWeiToEth(wei: string | bigint | null | undefined, decimals = 4): string {
  if (!wei) return '—';

  try {
    const weiValue = typeof wei === 'string' ? BigInt(wei) : wei;
    const ethValue = Number(weiValue) / 1e18;

    if (ethValue === 0) return '0 ETH';
    if (ethValue < 0.0001) return '<0.0001 ETH';

    return `${ethValue.toFixed(decimals)} ETH`;
  } catch {
    return '—';
  }
}

/**
 * Formats large numbers with K/M/B suffixes
 * @param value - Number to format
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string (e.g., "1.2M")
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—';

  if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;

  return value.toLocaleString();
}

/**
 * Formats gas percentage (used/limit)
 * @param used - Gas used
 * @param limit - Gas limit
 * @returns Percentage string (e.g., "45.2%")
 */
export function formatGasPercentage(used: number | null | undefined, limit: number | null | undefined): string {
  if (!used || !limit || limit === 0) return '—';
  const percentage = (used / limit) * 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Truncates hash/pubkey for display
 * @param hash - Full hash string
 * @param start - Characters to show at start (default: 10)
 * @param end - Characters to show at end (default: 8)
 * @returns Truncated string (e.g., "0x1234...5678")
 */
export function truncateHash(hash: string | null | undefined, start = 10, end = 8): string {
  if (!hash) return '—';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/**
 * Formats validator index
 * @param index - Validator index
 * @returns Formatted string or em dash if null
 */
export function formatValidatorIndex(index: number | null | undefined): string {
  if (index === null || index === undefined) return '—';
  return index.toLocaleString();
}
