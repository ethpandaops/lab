import { BlockData } from './types';

/**
 * NormalizedBlockData provides a consistent interface to block data
 * regardless of the naming convention used in the API
 */
export interface NormalizedBlockData {
  // Basic block info
  slot?: number;
  blockRoot?: string;
  stateRoot?: string;
  parentRoot?: string;
  proposerIndex?: number;
  blockVersion?: string;

  // Execution payload info
  executionPayloadBlockHash?: string;
  executionPayloadBlockNumber?: number;
  executionPayloadTransactionsCount?: number;
  executionPayloadGasUsed?: number;
  executionPayloadGasLimit?: number;
  executionPayloadBlobGasUsed?: number;
  executionPayloadBaseFeePerGas?: number;
  executionPayloadFeeRecipient?: string;
  executionPayloadTimestamp?: number;
  executionPayloadParentHash?: string;
  executionPayloadStateRoot?: string;
  executionPayloadExcessBlobGas?: number;

  // Size metrics
  blockTotalBytes?: number;
  blockTotalBytesCompressed?: number;
  transactionsTotalBytes?: number;
  slotTime?: number;

  // Original data
  raw: BlockData;
}

/**
 * Safely converts a value to a number, handling various input types
 */
const safeNumberConversion = (value: any): number | undefined => {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  return undefined;
};

/**
 * Debugging helper to log field availability
 */
function logFieldAvailability(field: string, value: any) {
  // Function left for reference but logging disabled
}

/**
 * Normalizes block data from different field naming conventions to a consistent format
 */
export function normalizeBlockData(block?: BlockData): NormalizedBlockData | undefined {
  if (!block) return undefined;

  // Initialize the result object

  const result: NormalizedBlockData = {
    raw: block,
  };

  // Handle block root
  result.blockRoot = block.block_root || block.blockRoot;

  // Handle state root
  result.stateRoot = block.state_root || block.stateRoot;

  // Handle parent root
  result.parentRoot = block.parent_root || block.parentRoot;

  // Handle proposer index
  result.proposerIndex = safeNumberConversion(block.proposer_index || block.proposerIndex);

  // Handle slot
  result.slot = safeNumberConversion(block.slot);

  // Check for execution payload

  // Handle execution payload block hash
  result.executionPayloadBlockHash =
    block.execution_payload_block_hash ||
    block.executionPayloadBlockHash ||
    (block.execution_payload && block.execution_payload.block_hash);

  // Handle execution payload block number
  result.executionPayloadBlockNumber = safeNumberConversion(
    block.execution_payload_block_number ||
      block.executionPayloadBlockNumber ||
      (block.execution_payload && block.execution_payload.block_number),
  );

  // Handle execution payload transactions count
  result.executionPayloadTransactionsCount = safeNumberConversion(
    block.execution_payload_transactions_count ||
      block.executionPayloadTransactionsCount ||
      (block.execution_payload && block.execution_payload.transactions_count),
  );

  // Handle execution payload gas used
  result.executionPayloadGasUsed = safeNumberConversion(
    block.execution_payload_gas_used ||
      block.executionPayloadGasUsed ||
      (block.execution_payload && block.execution_payload.gas_used),
  );

  // Handle execution payload gas limit
  result.executionPayloadGasLimit = safeNumberConversion(
    block.execution_payload_gas_limit ||
      block.executionPayloadGasLimit ||
      (block.execution_payload && block.execution_payload.gas_limit),
  );

  // Handle execution payload blob gas used
  result.executionPayloadBlobGasUsed = safeNumberConversion(
    block.execution_payload_blob_gas_used ||
      block.executionPayloadBlobGasUsed ||
      (block.execution_payload && block.execution_payload.blob_gas_used),
  );

  // Handle execution payload base fee per gas
  result.executionPayloadBaseFeePerGas = safeNumberConversion(
    block.execution_payload_base_fee_per_gas ||
      block.executionPayloadBaseFeePerGas ||
      (block.execution_payload && block.execution_payload.base_fee_per_gas),
  );

  // Handle execution payload fee recipient
  result.executionPayloadFeeRecipient =
    block.execution_payload_fee_recipient ||
    block.executionPayloadFeeRecipient ||
    (block.execution_payload && block.execution_payload.fee_recipient);

  // Handle execution payload timestamp
  result.executionPayloadTimestamp = safeNumberConversion(
    block.execution_payload_timestamp ||
      block.executionPayloadTimestamp ||
      (block.execution_payload && block.execution_payload.timestamp),
  );

  // Handle execution payload parent hash
  result.executionPayloadParentHash =
    block.execution_payload_parent_hash ||
    block.executionPayloadParentHash ||
    (block.execution_payload && block.execution_payload.parent_hash);

  // Handle execution payload state root
  result.executionPayloadStateRoot =
    block.execution_payload_state_root ||
    block.executionPayloadStateRoot ||
    (block.execution_payload && block.execution_payload.state_root);

  // Handle execution payload excess blob gas
  result.executionPayloadExcessBlobGas = safeNumberConversion(
    block.execution_payload_excess_blob_gas ||
      block.executionPayloadExcessBlobGas ||
      (block.execution_payload && block.execution_payload.excess_blob_gas),
  );

  // Handle size metrics
  result.blockTotalBytes = safeNumberConversion(block.blockTotalBytes || block.block_total_bytes);
  result.blockTotalBytesCompressed = safeNumberConversion(
    block.blockTotalBytesCompressed || block.block_total_bytes_compressed,
  );
  result.transactionsTotalBytes = safeNumberConversion(
    block.transactionsTotalBytes ||
      block.transactions_total_bytes ||
      (block.execution_payload && block.execution_payload.transactions_total_bytes),
  );

  // Handle slot time
  result.slotTime = safeNumberConversion(block.slotTime);

  // Handle block version
  result.blockVersion = block.block_version || block.blockVersion;

  return result;
}

/**
 * Calculate the number of blobs in a block based on blob gas used
 */
export function calculateBlobCount(normalizedBlock?: NormalizedBlockData): number {
  if (!normalizedBlock || normalizedBlock.executionPayloadBlobGasUsed === undefined) {
    return 0;
  }

  const blobGasUsed = normalizedBlock.executionPayloadBlobGasUsed;

  // Each blob uses 131072 gas
  return blobGasUsed > 0 ? Math.ceil(blobGasUsed / 131072) : 0;
}

/**
 * Format a hash string for display
 */
export function formatHash(hash?: string, startChars = 6, endChars = 4): string {
  if (!hash) return '—';
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '—';
  return new Date(timestamp * 1000).toLocaleTimeString();
}

/**
 * Format file size for display (KB, MB)
 */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return '—';

  if (bytes < 1024) {
    return `${bytes.toFixed(1)} KB`;
  }

  return `${(bytes / 1024).toFixed(1)} MB`;
}

/**
 * Format gas price in Gwei
 */
export function formatGwei(wei?: number): string {
  if (wei === undefined) return '—';
  return `${(wei / 1e9).toFixed(2)} Gwei`;
}
