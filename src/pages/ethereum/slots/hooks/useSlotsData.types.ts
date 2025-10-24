/**
 * Data for a single slot in the slots list
 */
export interface SlotData {
  /**
   * Slot number
   */
  slot: number;
  /**
   * Epoch number containing the slot
   */
  epoch: number;
  /**
   * Validator index of the proposer
   */
  proposerIndex: number | null;
  /**
   * Number of blobs in the block
   */
  blobCount: number | null;
  /**
   * Block status (canonical, orphaned, missed)
   */
  status: string | null;
  /**
   * Whether this slot has data available
   */
  hasData: boolean;
  /**
   * Block root hash (for navigation)
   */
  blockRoot: string | null;
  /**
   * Slot timestamp (Unix timestamp in seconds)
   */
  timestamp: number;
  /**
   * Proposer entity name (e.g., "Lido", "Coinbase")
   */
  proposerEntity: string | null;
}

/**
 * Return type for useSlotsData hook
 */
export interface UseSlotsDataReturn {
  /**
   * Array of slot data
   */
  slots: SlotData[];
  /**
   * Whether data is loading
   */
  isLoading: boolean;
  /**
   * Error if any occurred
   */
  error: Error | null;
}
