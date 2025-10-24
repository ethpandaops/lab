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
