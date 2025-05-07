/**
 * Helper functions to check block properties
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