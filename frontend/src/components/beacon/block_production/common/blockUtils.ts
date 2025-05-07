/**
 * Helper functions for block-related logic
 */
import { hasNonEmptyDeliveredPayloads } from './blockDebug';

/**
 * Determines if a block was locally built by the proposer (not from an external builder).
 * A block is locally built if it has valid block data BUT no delivered payloads.
 */
export function isBlockLocallyBuilt(block: any): boolean {
  // If no block data, it can't be locally built
  if (!block) {
    return false;
  }
  
  // Check for specific cases where the block is known to be locally built
  const hasEmptyBockRoot = !block.blockRoot && !block.block_root;
  if (hasEmptyBockRoot) {
    return false;
  }
  
  // Use special function for a thorough check
  const hasPayloads = hasNonEmptyDeliveredPayloads(block);
  if (hasPayloads) {
    return false;
  }
  
  // Check for payloadsDelivered array
  if (block.payloadsDelivered && Array.isArray(block.payloadsDelivered) && block.payloadsDelivered.length > 0) {
    return false; // NOT locally built 
  }
  
  // Check snake_case versions
  if (block.delivered_payloads && typeof block.delivered_payloads === 'object' && 
      Object.keys(block.delivered_payloads).length > 0) {
    return false; // NOT locally built
  }
  
  if (block.payloads_delivered && Array.isArray(block.payloads_delivered) && 
      block.payloads_delivered.length > 0) {
    return false; // NOT locally built
  }
  
  // If we have a block and no delivered payloads were found in any format, 
  // then it's locally built
  return true;
}