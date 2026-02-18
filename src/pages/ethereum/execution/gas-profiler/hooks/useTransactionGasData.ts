import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { intTransactionCallFrameServiceList, intTransactionOpcodeGasServiceList } from '@/api/sdk.gen';
import type { IntTransactionCallFrame, IntTransactionOpcodeGas } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import type { TransactionMetadata, CallTreeNode, OpcodeStats } from '../IndexPage.types';
import { useContractOwners, type ContractOwnerMap } from './useContractOwners';
import { useFunctionSignatures, type FunctionSignatureMap } from './useFunctionSignatures';
import { getPrecompileOwnerMap } from '../utils/precompileNames';

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
}

export interface UseTransactionGasDataOptions {
  /** Transaction hash to fetch data for */
  transactionHash: string | null;
  /** Block number for API queries. Optional - if not provided, will be resolved via a lightweight lookup to int_transaction_call_frame (which has a projection for efficient tx hash queries). */
  blockNumber?: number | null;
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
    // Detect contract creation:
    // 1. New data: call_type = 'CREATE' (from transformation)
    // 2. Old data fallback: root frame (depth 0) with no target_address
    const isContractCreation =
      frame.call_type === 'CREATE' ||
      (!frame.target_address &&
        !frame.call_type &&
        (frame.depth === 0 || frame.depth === null || frame.depth === undefined));

    // Look up contract name from dim_contract_owner
    const owner = frame.target_address ? contractOwners[frame.target_address.toLowerCase()] : undefined;
    const targetName = owner?.contract_name ?? null;

    // Look up function name from dim_function_signature
    const functionSelector = frame.function_selector ?? null;
    const functionSig = functionSelector ? functionSignatures[functionSelector.toLowerCase()] : undefined;
    const functionName = functionSig?.name ?? null;

    // Build label: prioritize function name > contract name > truncated address
    // For contract creation without target_address, use 'CREATE' as the fallback
    const fallbackLabel = isContractCreation && !frame.target_address ? 'CREATE' : 'Root';
    const label = getCallLabel(
      frame.target_address,
      functionSelector,
      contractOwners,
      functionSignatures,
      fallbackLabel
    );

    // For contract creation, ensure call type is 'CREATE'
    const effectiveCallType = isContractCreation ? 'CREATE' : frame.call_type || 'CALL';

    const node: CallTreeNode = {
      id: String(frame.call_frame_id ?? 0),
      label,
      value: frame.gas_cumulative ?? 0,
      selfValue: frame.gas ?? 0,
      category: effectiveCallType,
      hasError: (frame.error_count ?? 0) > 0,
      children: [],
      metadata: {
        callFrameId: frame.call_frame_id ?? 0,
        targetAddress: frame.target_address ?? null,
        targetName,
        functionSelector,
        functionName,
        callType: effectiveCallType,
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

  // Use receipt_gas_used directly - this is the source of truth from transaction receipt
  // For failed txs: gas_refund and intrinsic_gas will be NULL
  const receiptGasUsed = rootFrame?.receipt_gas_used ?? 0;
  const evmGasUsed = rootFrame?.gas_cumulative ?? 0;
  const intrinsicGas = rootFrame?.intrinsic_gas ?? null;
  const gasRefund = rootFrame?.gas_refund ?? null;
  const hasErrors = frames.some(f => (f.error_count ?? 0) > 0);
  const maxDepth = Math.max(...frames.map(f => f.depth ?? 0));

  // Detect contract creation:
  // 1. New data: call_type = 'CREATE' (from transformation)
  // 2. Old data fallback: root frame with no target_address and no call_type
  const isContractCreation = rootFrame?.call_type === 'CREATE' || (!rootFrame?.target_address && !rootFrame?.call_type);

  return {
    transactionHash: firstFrame?.transaction_hash ?? '',
    blockNumber: firstFrame?.block_number ?? 0,
    transactionIndex: firstFrame?.transaction_index ?? 0,
    status: hasErrors ? 'failed' : 'success',
    receiptGasUsed,
    intrinsicGas,
    evmGasUsed,
    gasRefund: gasRefund ?? 0,
    frameCount: frames.length,
    maxDepth,
    isContractCreation,
  };
}

/**
 * Hook to fetch transaction gas profiling data
 */
export function useTransactionGasData({
  transactionHash,
  blockNumber: providedBlockNumber,
}: UseTransactionGasDataOptions): UseTransactionGasDataResult {
  const { currentNetwork } = useNetwork();

  // Step 1: If block number not provided, fetch it via a lightweight lookup
  // int_transaction_call_frame has a projection (p_by_transaction) that allows efficient tx hash lookups
  const blockLookupQuery = useQuery({
    queryKey: ['gas-profiler', 'block-lookup', transactionHash],
    queryFn: async ({ signal }) => {
      const response = await intTransactionCallFrameServiceList({
        query: {
          transaction_hash_eq: transactionHash!,
          page_size: 1,
        },
        signal,
        throwOnError: true,
      });
      const items = response.data?.int_transaction_call_frame ?? [];
      if (items.length === 0) return null;
      return items[0].block_number ?? null;
    },
    enabled: !!currentNetwork && !!transactionHash && providedBlockNumber == null,
    staleTime: Infinity, // Block number for a tx never changes
  });

  // Resolved block number: use provided or fetched
  const blockNumber = providedBlockNumber ?? blockLookupQuery.data ?? null;

  // Step 2: Fetch full data once we have block number
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
                transaction_hash_eq: transactionHash!,
                block_number_eq: blockNumber!,
                order_by: 'call_frame_id ASC',
                page_size: 10000,
              },
            },
            'int_transaction_call_frame',
            signal
          ),
        enabled: !!currentNetwork && !!transactionHash && blockNumber != null,
      },
      // Fetch opcode gas data for the transaction
      {
        queryKey: ['gas-profiler', 'opcode-gas', transactionHash, blockNumber],
        queryFn: ({ signal }) =>
          fetchAllPages<IntTransactionOpcodeGas>(
            intTransactionOpcodeGasServiceList,
            {
              query: {
                transaction_hash_eq: transactionHash!,
                block_number_eq: blockNumber!,
                order_by: 'gas DESC',
                page_size: 10000,
              },
            },
            'int_transaction_opcode_gas',
            signal
          ),
        enabled: !!currentNetwork && !!transactionHash && blockNumber != null,
      },
    ],
  });

  const [callFramesQuery, opcodeGasQuery] = queries;

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

  const isLoading =
    blockLookupQuery.isLoading || queries.some(q => q.isLoading) || contractOwnersLoading || functionSignaturesLoading;
  const error = blockLookupQuery.error ?? (queries.find(q => q.error)?.error as Error | null);

  // Merge precompile names into contract owners (API results take priority)
  const enrichedContractOwners = useMemo<ContractOwnerMap>(
    () => ({ ...getPrecompileOwnerMap(), ...contractOwners }),
    [contractOwners]
  );

  const data = useMemo<TransactionGasData | null>(() => {
    if (isLoading || error) return null;
    if (!callFramesQuery.data || callFramesQuery.data.length === 0) return null;

    const callFrames = callFramesQuery.data;
    const opcodeGas = opcodeGasQuery.data ?? [];

    return {
      callFrames,
      opcodeGas,
      metadata: extractMetadata(callFrames),
      callTree: buildCallTree(callFrames, enrichedContractOwners, functionSignatures),
      opcodeStats: calculateOpcodeStats(opcodeGas),
      contractOwners: enrichedContractOwners,
      functionSignatures,
    };
  }, [isLoading, error, callFramesQuery.data, opcodeGasQuery.data, enrichedContractOwners, functionSignatures]);

  return { data, isLoading, error };
}
