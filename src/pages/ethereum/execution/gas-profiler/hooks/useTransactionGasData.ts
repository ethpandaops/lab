import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  intTransactionCallFrameServiceList,
  intTransactionOpcodeGasServiceList,
  intTransactionCallFrameOpcodeGasServiceList,
} from '@/api/sdk.gen';
import type {
  IntTransactionCallFrame,
  IntTransactionOpcodeGas,
  IntTransactionCallFrameOpcodeGas,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import type { TransactionMetadata, CallTreeNode, OpcodeStats } from '../IndexPage.types';
import { useContractOwners, type ContractOwnerMap } from './useContractOwners';
import { useFunctionSignatures, type FunctionSignatureMap } from './useFunctionSignatures';

/**
 * Per-call-frame opcode statistics for "interesting" opcodes
 */
export interface CallFrameOpcodeStats {
  /** Number of SSTORE operations (storage writes) */
  sstoreCount: number;
  /** Gas used by SSTORE operations */
  sstoreGas: number;
  /** Number of SLOAD operations (storage reads) */
  sloadCount: number;
  /** Gas used by SLOAD operations */
  sloadGas: number;
  /** Number of LOG operations (events emitted) */
  logCount: number;
  /** Gas used by LOG operations */
  logGas: number;
  /** Number of CREATE/CREATE2 operations */
  createCount: number;
  /** Number of SELFDESTRUCT operations */
  selfdestructCount: number;
  /** Whether any opcode resulted in an error */
  hasError: boolean;
}

export interface TransactionGasData {
  /** Raw call frames from API */
  callFrames: IntTransactionCallFrame[];
  /** Raw opcode gas data from API */
  opcodeGas: IntTransactionOpcodeGas[];
  /** Processed transaction metadata */
  metadata: TransactionMetadata;
  /** Call tree structure for FlameGraph */
  callTree: CallTreeNode | null;
  /** Aggregated opcode statistics */
  opcodeStats: OpcodeStats[];
  /** Contract owner data for name lookup */
  contractOwners: ContractOwnerMap;
  /** Function signature data for name lookup */
  functionSignatures: FunctionSignatureMap;
  /** Per-call-frame opcode stats for badges (call_frame_id -> stats) */
  callFrameOpcodeStats: Map<number, CallFrameOpcodeStats>;
}

export interface UseTransactionGasDataOptions {
  /** Transaction hash to fetch data for */
  transactionHash: string | null;
  /** Block number containing the transaction (required for efficient queries) */
  blockNumber: number | null;
}

export interface UseTransactionGasDataResult {
  data: TransactionGasData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Get a display label for a contract address.
 * Prioritizes: contract_name > truncated address > fallback
 */
export function getContractLabel(
  targetAddress: string | null | undefined,
  contractOwners: ContractOwnerMap,
  fallback = 'Root'
): string {
  if (!targetAddress) return fallback;

  const owner = contractOwners[targetAddress.toLowerCase()];
  if (owner?.contract_name) {
    return owner.contract_name;
  }

  return truncateAddress(targetAddress);
}

/**
 * Get a function name from a selector.
 * Returns just the function name without parameters, or null if not found.
 */
export function getFunctionName(
  functionSelector: string | null | undefined,
  functionSignatures: FunctionSignatureMap
): string | null {
  if (!functionSelector) return null;

  const sig = functionSignatures[functionSelector.toLowerCase()];
  if (sig?.name) {
    // Return just the function name without parameters
    return sig.name.split('(')[0];
  }

  return null;
}

/**
 * Get a combined label for a call frame.
 * Priority: function name > contract name > truncated address > fallback
 * Like Phalcon, we show just the function name when available for cleaner display.
 */
export function getCallLabel(
  targetAddress: string | null | undefined,
  functionSelector: string | null | undefined,
  contractOwners: ContractOwnerMap,
  functionSignatures: FunctionSignatureMap,
  fallback = 'Root'
): string {
  // If we have a function name, just show that (cleanest display)
  const funcName = getFunctionName(functionSelector, functionSignatures);
  if (funcName) {
    return funcName;
  }

  // Otherwise fall back to contract name or address
  return getContractLabel(targetAddress, contractOwners, fallback);
}

/**
 * Build a tree structure from flat call frames
 */
function buildCallTree(
  frames: IntTransactionCallFrame[],
  contractOwners: ContractOwnerMap,
  functionSignatures: FunctionSignatureMap
): CallTreeNode | null {
  if (frames.length === 0) return null;

  // Create a map of call_frame_id to node
  const nodeMap = new Map<number, CallTreeNode>();

  // First pass: create all nodes
  for (const frame of frames) {
    // Look up contract name from dim_contract_owner
    const owner = frame.target_address ? contractOwners[frame.target_address.toLowerCase()] : undefined;
    const targetName = owner?.contract_name ?? null;

    // Look up function name from dim_function_signature
    const functionSelector = frame.function_selector ?? null;
    const functionSig = functionSelector ? functionSignatures[functionSelector.toLowerCase()] : undefined;
    const functionName = functionSig?.name ?? null;

    // Build label: prioritize function name > contract name > truncated address
    const label = getCallLabel(frame.target_address, functionSelector, contractOwners, functionSignatures);

    const node: CallTreeNode = {
      id: String(frame.call_frame_id ?? 0),
      label,
      value: frame.gas_cumulative ?? 0,
      selfValue: frame.gas ?? 0,
      category: frame.call_type ?? 'CALL',
      hasError: (frame.error_count ?? 0) > 0,
      children: [],
      metadata: {
        callFrameId: frame.call_frame_id ?? 0,
        targetAddress: frame.target_address ?? null,
        targetName,
        functionSelector,
        functionName,
        callType: frame.call_type ?? 'CALL',
        depth: frame.depth ?? 0,
        opcodeCount: frame.opcode_count ?? 0,
        gasRefund: frame.gas_refund ?? null,
      },
    };
    nodeMap.set(frame.call_frame_id ?? 0, node);
  }

  // Second pass: build tree structure
  let rootNode: CallTreeNode | null = null;
  for (const frame of frames) {
    const node = nodeMap.get(frame.call_frame_id ?? 0);
    if (!node) continue;

    if (frame.parent_call_frame_id === null || frame.parent_call_frame_id === undefined) {
      // This is the root
      rootNode = node;
    } else {
      const parent = nodeMap.get(frame.parent_call_frame_id);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  return rootNode;
}

/**
 * Truncate Ethereum address for display
 */
function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Calculate aggregated opcode statistics
 */
function calculateOpcodeStats(opcodeGas: IntTransactionOpcodeGas[]): OpcodeStats[] {
  const totalGas = opcodeGas.reduce((sum, og) => sum + (og.gas ?? 0), 0);

  return opcodeGas
    .map(og => ({
      opcode: og.opcode ?? 'UNKNOWN',
      totalGas: og.gas ?? 0,
      count: og.count ?? 0,
      errorCount: og.error_count ?? 0,
      percentage: totalGas > 0 ? ((og.gas ?? 0) / totalGas) * 100 : 0,
    }))
    .sort((a, b) => b.totalGas - a.totalGas);
}

/**
 * Process per-call-frame opcode data into stats for UI badges
 */
function processCallFrameOpcodeStats(
  opcodeData: IntTransactionCallFrameOpcodeGas[]
): Map<number, CallFrameOpcodeStats> {
  const statsMap = new Map<number, CallFrameOpcodeStats>();

  for (const item of opcodeData) {
    const frameId = item.call_frame_id ?? 0;
    const opcode = item.opcode?.toUpperCase() ?? '';
    const count = item.count ?? 0;
    const gas = item.gas ?? 0;
    const errorCount = item.error_count ?? 0;

    // Get or create stats for this frame
    let stats = statsMap.get(frameId);
    if (!stats) {
      stats = {
        sstoreCount: 0,
        sstoreGas: 0,
        sloadCount: 0,
        sloadGas: 0,
        logCount: 0,
        logGas: 0,
        createCount: 0,
        selfdestructCount: 0,
        hasError: false,
      };
      statsMap.set(frameId, stats);
    }

    // Categorize the opcode
    if (opcode === 'SSTORE') {
      stats.sstoreCount += count;
      stats.sstoreGas += gas;
    } else if (opcode === 'SLOAD') {
      stats.sloadCount += count;
      stats.sloadGas += gas;
    } else if (opcode.startsWith('LOG')) {
      // LOG0, LOG1, LOG2, LOG3, LOG4
      stats.logCount += count;
      stats.logGas += gas;
    } else if (opcode === 'CREATE' || opcode === 'CREATE2') {
      stats.createCount += count;
    } else if (opcode === 'SELFDESTRUCT') {
      stats.selfdestructCount += count;
    }

    // Track errors
    if (errorCount > 0) {
      stats.hasError = true;
    }
  }

  return statsMap;
}

/**
 * Extract transaction metadata from call frames
 *
 * Gas semantics:
 * - root frame total_gas_used = EVM execution gas only (does NOT include intrinsic)
 * - intrinsic_gas = base tx cost (21000) + calldata + access list
 * - total consumed = intrinsic_gas + total_gas_used
 * - receipt gas = total consumed - effective refund
 */
function extractMetadata(frames: IntTransactionCallFrame[]): TransactionMetadata {
  const rootFrame = frames.find(f => f.parent_call_frame_id === null || f.parent_call_frame_id === undefined);
  const firstFrame = frames[0];

  // EVM execution gas from root frame (does NOT include intrinsic)
  const evmGasUsed = rootFrame?.gas_cumulative ?? 0;
  const intrinsicGas = rootFrame?.intrinsic_gas ?? null;
  const gasRefund = rootFrame?.gas_refund ?? 0;
  const hasErrors = frames.some(f => (f.error_count ?? 0) > 0);
  const maxDepth = Math.max(...frames.map(f => f.depth ?? 0));

  // Total gas consumed = intrinsic + EVM execution
  const totalGasConsumed = (intrinsicGas ?? 0) + evmGasUsed;

  // Receipt gas = total consumed - refund (capped at 20% of total)
  const maxRefund = Math.floor(totalGasConsumed / 5); // 20% cap per EIP-3529
  const effectiveRefund = Math.min(gasRefund, maxRefund);
  const receiptGasUsed = totalGasConsumed - effectiveRefund;

  return {
    transactionHash: firstFrame?.transaction_hash ?? '',
    blockNumber: firstFrame?.block_number ?? 0,
    transactionIndex: firstFrame?.transaction_index ?? 0,
    status: hasErrors ? 'failed' : 'success',
    receiptGasUsed,
    intrinsicGas,
    evmGasUsed,
    gasRefund: effectiveRefund, // Use capped refund (20% of total per EIP-3529)
    frameCount: frames.length,
    maxDepth,
  };
}

/**
 * Hook to fetch transaction gas profiling data
 */
export function useTransactionGasData({
  transactionHash,
  blockNumber,
}: UseTransactionGasDataOptions): UseTransactionGasDataResult {
  const { currentNetwork } = useNetwork();

  const queries = useQueries({
    queries: [
      // Fetch call frames for the transaction
      {
        queryKey: ['gas-profiler', 'call-frames', transactionHash, blockNumber],
        queryFn: ({ signal }) =>
          fetchAllPages<IntTransactionCallFrame>(
            intTransactionCallFrameServiceList,
            {
              query: {
                block_number_eq: blockNumber!,
                transaction_hash_eq: transactionHash!,
                order_by: 'call_frame_id ASC',
                page_size: 10000,
              },
            },
            'int_transaction_call_frame',
            signal
          ),
        enabled: !!currentNetwork && !!transactionHash && !!blockNumber,
      },
      // Fetch opcode gas data for the transaction
      {
        queryKey: ['gas-profiler', 'opcode-gas', transactionHash, blockNumber],
        queryFn: ({ signal }) =>
          fetchAllPages<IntTransactionOpcodeGas>(
            intTransactionOpcodeGasServiceList,
            {
              query: {
                block_number_eq: blockNumber!,
                transaction_hash_eq: transactionHash!,
                order_by: 'gas DESC',
                page_size: 10000,
              },
            },
            'int_transaction_opcode_gas',
            signal
          ),
        enabled: !!currentNetwork && !!transactionHash && !!blockNumber,
      },
      // Fetch per-call-frame opcode gas data for badges (only interesting opcodes)
      {
        queryKey: ['gas-profiler', 'call-frame-opcode-gas', transactionHash, blockNumber],
        queryFn: ({ signal }) =>
          fetchAllPages<IntTransactionCallFrameOpcodeGas>(
            intTransactionCallFrameOpcodeGasServiceList,
            {
              query: {
                block_number_eq: blockNumber!,
                transaction_hash_eq: transactionHash!,
                // Only fetch opcodes we display badges for
                opcode_in_values: 'SSTORE,SLOAD,LOG0,LOG1,LOG2,LOG3,LOG4,CREATE,CREATE2,SELFDESTRUCT',
                page_size: 10000,
              },
            },
            'int_transaction_call_frame_opcode_gas',
            signal
          ),
        enabled: !!currentNetwork && !!transactionHash && !!blockNumber,
      },
    ],
  });

  const [callFramesQuery, opcodeGasQuery, callFrameOpcodeGasQuery] = queries;

  // Extract unique contract addresses from call frames for contract owner lookup
  const contractAddresses = useMemo(() => {
    if (!callFramesQuery.data) return [];
    return callFramesQuery.data.map(f => f.target_address).filter((addr): addr is string => addr != null);
  }, [callFramesQuery.data]);

  // Extract unique function selectors from call frames for function signature lookup
  const functionSelectors = useMemo(() => {
    if (!callFramesQuery.data) return [];
    return callFramesQuery.data.map(f => f.function_selector).filter((sel): sel is string => sel != null);
  }, [callFramesQuery.data]);

  // Fetch contract owner data for name hydration
  const { data: contractOwners, isLoading: contractOwnersLoading } = useContractOwners({
    addresses: contractAddresses,
    enabled: contractAddresses.length > 0,
  });

  // Fetch function signature data for name hydration
  const { data: functionSignatures, isLoading: functionSignaturesLoading } = useFunctionSignatures({
    selectors: functionSelectors,
    enabled: functionSelectors.length > 0,
  });

  const isLoading = queries.some(q => q.isLoading) || contractOwnersLoading || functionSignaturesLoading;
  const error = queries.find(q => q.error)?.error as Error | null;

  const data = useMemo<TransactionGasData | null>(() => {
    if (isLoading || error) return null;
    if (!callFramesQuery.data || callFramesQuery.data.length === 0) return null;

    const callFrames = callFramesQuery.data;
    const opcodeGas = opcodeGasQuery.data ?? [];
    const callFrameOpcodeGas = callFrameOpcodeGasQuery.data ?? [];

    return {
      callFrames,
      opcodeGas,
      metadata: extractMetadata(callFrames),
      callTree: buildCallTree(callFrames, contractOwners, functionSignatures),
      opcodeStats: calculateOpcodeStats(opcodeGas),
      contractOwners,
      functionSignatures,
      callFrameOpcodeStats: processCallFrameOpcodeStats(callFrameOpcodeGas),
    };
  }, [
    isLoading,
    error,
    callFramesQuery.data,
    opcodeGasQuery.data,
    callFrameOpcodeGasQuery.data,
    contractOwners,
    functionSignatures,
  ]);

  return { data, isLoading, error };
}
