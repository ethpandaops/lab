import type { Network } from '@/hooks/useConfig/useConfig.types';

/**
 * Calculate the effective (capped) gas refund based on Ethereum fork rules.
 *
 * The EVM accumulates a refund counter during execution (e.g., from SSTORE operations
 * that clear storage). At transaction end, the actual refund applied is capped:
 *
 * - Pre-London (before EIP-3529): capped at gas_used / 2
 * - Post-London (EIP-3529): capped at gas_used / 5
 *
 * Since gas_used = receipt_gas + actual_refund, solving for actual_refund:
 * - Pre-London: actual_refund = min(gas_refund, receipt_gas)
 * - Post-London: actual_refund = min(gas_refund, receipt_gas / 4)
 *
 * @param gasRefund - Raw refund counter from EVM execution
 * @param receiptGas - Gas used as reported in the receipt
 * @param blockNumber - Block number of the transaction
 * @param network - Network configuration (for fork activation blocks)
 * @returns The capped refund amount and whether it was capped
 */
export function getEffectiveGasRefund(
  gasRefund: number,
  receiptGas: number,
  blockNumber: number,
  network: Network | null
): { effectiveRefund: number; maxRefund: number; isCapped: boolean; isPostLondon: boolean } {
  if (gasRefund === 0) {
    return { effectiveRefund: 0, maxRefund: 0, isCapped: false, isPostLondon: true };
  }

  // Get London activation block (default to 0 if not available, treating as post-London)
  const londonBlock = network?.forks?.execution?.london?.block ?? 0;
  const isPostLondon = blockNumber >= londonBlock;

  // Calculate max refund based on fork
  const maxRefund = isPostLondon
    ? Math.floor(receiptGas / 4) // Post-London (EIP-3529): cap at receipt_gas / 4
    : receiptGas; // Pre-London: cap at receipt_gas

  const effectiveRefund = Math.min(gasRefund, maxRefund);
  const isCapped = gasRefund > maxRefund;

  return { effectiveRefund, maxRefund, isCapped, isPostLondon };
}
