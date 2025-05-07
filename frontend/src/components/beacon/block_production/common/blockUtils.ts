/**
 * Helper functions for block-related logic
 */

/**
 * Checks if the block data has non-empty delivered payloads by looking in multiple places.
 * Returns true if deliveredPayloads exists and is not empty.
 */
export function hasNonEmptyDeliveredPayloads(block: any, parentData?: any): boolean {
  if (!block && !parentData) {
    return false;
  }

  try {
    // Check in block first
    if (block && 'deliveredPayloads' in block) {
      if (typeof block.deliveredPayloads === 'object') {
        const keys = Object.keys(block.deliveredPayloads);
        if (keys.length > 0) {
          return true;
        }
      }
    }
    
    // Then check in parent data (slotData)
    if (parentData && 'deliveredPayloads' in parentData) {
      if (typeof parentData.deliveredPayloads === 'object') {
        const keys = Object.keys(parentData.deliveredPayloads);
        if (keys.length > 0) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

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
  
  // Use the helper function for a thorough check
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