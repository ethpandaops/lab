/**
 * Ethereum utility functions for unit conversions and formatting
 */

/**
 * Convert wei to ETH
 *
 * @param weiValue - Value in wei as string or bigint
 * @returns Value in ETH
 *
 * @example
 * ```tsx
 * weiToEth('1000000000000000000') // Returns 1
 * weiToEth('500000000000000000')  // Returns 0.5
 * ```
 */
export function weiToEth(weiValue: string | bigint): number {
  const wei = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
  const eth = Number(wei) / 1e18;
  return eth;
}

/**
 * Convert ETH to wei
 *
 * @param ethValue - Value in ETH
 * @returns Value in wei as bigint
 *
 * @example
 * ```tsx
 * ethToWei(1)   // Returns 1000000000000000000n
 * ethToWei(0.5) // Returns 500000000000000000n
 * ```
 */
export function ethToWei(ethValue: number): bigint {
  // Use string multiplication to avoid floating point precision issues
  const weiStr = (ethValue * 1e18).toFixed(0);
  return BigInt(weiStr);
}

/**
 * Convert wei to gwei
 *
 * @param weiValue - Value in wei as string or bigint
 * @returns Value in gwei
 *
 * @example
 * ```tsx
 * weiToGwei('1000000000') // Returns 1
 * weiToGwei('500000000')  // Returns 0.5
 * ```
 */
export function weiToGwei(weiValue: string | bigint): number {
  const wei = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
  const gwei = Number(wei) / 1e9;
  return gwei;
}

/**
 * Convert gwei to wei
 *
 * @param gweiValue - Value in gwei
 * @returns Value in wei as bigint
 *
 * @example
 * ```tsx
 * gweiToWei(1)   // Returns 1000000000n
 * gweiToWei(0.5) // Returns 500000000n
 * ```
 */
export function gweiToWei(gweiValue: number): bigint {
  const weiStr = (gweiValue * 1e9).toFixed(0);
  return BigInt(weiStr);
}

/**
 * Truncate Ethereum public key or address for display
 * Shows first N and last M characters with ellipsis
 *
 * @param pubkey - Public key or address to truncate
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Truncated string or "Unknown" if empty
 *
 * @example
 * ```tsx
 * truncateAddress('0x1234567890abcdef1234567890abcdef12345678')
 * // Returns '0x1234...5678'
 *
 * truncateAddress('0x1234567890abcdef1234567890abcdef12345678', 8, 6)
 * // Returns '0x123456...345678'
 * ```
 */
export function truncateAddress(pubkey?: string, startChars = 6, endChars = 4): string {
  if (!pubkey) return 'Unknown';
  if (pubkey.length <= startChars + endChars) return pubkey;
  return `${pubkey.slice(0, startChars)}...${pubkey.slice(-endChars)}`;
}

/**
 * Known execution client names
 */
const EXECUTION_CLIENTS = ['geth', 'nethermind', 'besu', 'erigon', 'reth'] as const;

/**
 * Official brand colors for Ethereum execution clients
 */
export const EXECUTION_CLIENT_COLORS: Record<string, string> = {
  besu: '#1ba0a1',
  nethermind: '#02bbec',
  reth: '#f44f02',
  geth: '#707d91',
  'go-ethereum': '#707d91',
  erigon: '#f5ad73',
};

/**
 * Default fallback colors for unknown clients
 */
const FALLBACK_COLORS = [
  '#6b7280', // gray-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
];

/**
 * Get the brand color for an execution client
 *
 * @param clientName - Name of the execution client (case-insensitive)
 * @param fallbackIndex - Index for fallback color if client is unknown (cycles through fallback colors)
 * @returns Hex color string
 *
 * @example
 * ```tsx
 * getExecutionClientColor('nethermind') // Returns '#02bbec'
 * getExecutionClientColor('Reth')       // Returns '#f44f02'
 * getExecutionClientColor('unknown', 0) // Returns '#6b7280'
 * ```
 */
export function getExecutionClientColor(clientName: string, fallbackIndex = 0): string {
  const normalized = clientName.toLowerCase().trim();
  return EXECUTION_CLIENT_COLORS[normalized] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}

/**
 * Parse execution client name from meta client name
 * Extracts client name and version from strings like "Nethermind/v1.25.4"
 *
 * @param metaClientName - Full meta client name string
 * @returns Parsed client name with version
 *
 * @example
 * ```tsx
 * parseExecutionClient('Nethermind/v1.25.4')
 * // Returns 'Nethermind v1.25.4'
 *
 * parseExecutionClient('geth-lighthouse-1')
 * // Returns 'geth-lighthouse-1'
 *
 * parseExecutionClient('')
 * // Returns 'Unknown'
 * ```
 */
export function parseExecutionClient(metaClientName?: string): string {
  if (!metaClientName) return 'Unknown';

  // Handle "ClientName/version" format
  const parts = metaClientName.split('/');
  if (parts.length >= 2) {
    const clientName = parts[0].trim();
    const version = parts[1].trim();
    return `${clientName} ${version}`;
  }

  return metaClientName;
}

/**
 * Extract execution client type from node name
 * Searches for known execution client names within the node identifier
 *
 * @param nodeName - Node name or identifier (e.g., "geth-lighthouse-node1", "ethpandaops/mainnet/sentry-mainnet-lighthouse-nethermind-001")
 * @returns Execution client name or null if not found
 *
 * @example
 * ```tsx
 * extractExecutionClient('geth-lighthouse-node1')
 * // Returns 'geth'
 *
 * extractExecutionClient('ethpandaops/mainnet/sentry-mainnet-lighthouse-nethermind-001')
 * // Returns 'nethermind'
 *
 * extractExecutionClient('unknown-node')
 * // Returns null
 * ```
 */
export function extractExecutionClient(nodeName: string | undefined): string | null {
  if (!nodeName) return null;

  const lowerName = nodeName.toLowerCase();

  // Find execution client in the name
  for (const client of EXECUTION_CLIENTS) {
    if (lowerName.includes(client)) {
      return client;
    }
  }

  return null;
}
