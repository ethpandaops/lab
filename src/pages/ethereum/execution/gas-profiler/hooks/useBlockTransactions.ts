import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionCallFrameServiceList } from '@/api/sdk.gen';
import type { IntTransactionCallFrame } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { useGasProfilerBounds } from './useGasProfilerBounds';
import { useContractOwners, type ContractOwnerMap } from './useContractOwners';
import { getPrecompileOwnerMap } from '../utils/precompileNames';

/**
 * Summary of a transaction within a block
 */
export interface TransactionSummary {
  transactionHash: string;
  transactionIndex: number;
  totalGasUsed: number;
  intrinsicGas: number | null;
  gasRefund: number;
  frameCount: number;
  maxDepth: number;
  hasErrors: boolean;
  rootCallType: string;
  targetAddress: string | null;
  targetName: string | null;
}

/**
 * Call type distribution data for charts
 */
export interface CallTypeCount {
  callType: string;
  count: number;
  gasUsed: number;
}

/**
 * Contract gas consumption data
 */
export interface ContractGasData {
  address: string;
  name: string | null;
  gas: number;
  callCount: number;
  callTypes: string[];
  /** First transaction hash that called this contract (for navigation) */
  firstTxHash: string | null;
}

/**
 * Transaction to contract flow data for Sankey diagrams
 */
export interface TxContractFlow {
  txHash: string;
  txIndex: number;
  txName: string | null;
  contractAddress: string;
  contractName: string | null;
  gas: number;
  callCount: number;
}

/**
 * Block data with transaction summaries
 */
export interface BlockData {
  blockNumber: number;
  transactions: TransactionSummary[];
  totalGasUsed: number;
  transactionCount: number;
  /** Aggregated call type distribution across all call frames in the block */
  callTypeDistribution: CallTypeCount[];
  /** Total number of call frames in the block */
  totalCallFrames: number;
  /** Top 10 contracts by gas consumption (for charts) */
  topContractsByGas: ContractGasData[];
  /** All contracts by gas consumption (for Contracts tab) */
  allContractsByGas: ContractGasData[];
  /** Transaction to contract flow data for Sankey visualization */
  txContractFlows: TxContractFlow[];
}

export interface UseBlockTransactionsOptions {
  /** Block number to fetch, or null to use latest */
  blockNumber: number | null;
}

export interface UseBlockTransactionsResult {
  data: BlockData | null;
  isLoading: boolean;
  error: Error | null;
  /** The bounds for indexed blocks */
  bounds: { min: number; max: number } | undefined;
  /** Whether bounds are still loading */
  boundsLoading: boolean;
}

/**
 * Group call frames by transaction and create summaries
 */
function createTransactionSummaries(
  frames: IntTransactionCallFrame[],
  contractOwners: ContractOwnerMap
): TransactionSummary[] {
  // Group frames by transaction hash
  const txMap = new Map<string, IntTransactionCallFrame[]>();

  for (const frame of frames) {
    const hash = frame.transaction_hash ?? '';
    if (!txMap.has(hash)) {
      txMap.set(hash, []);
    }
    txMap.get(hash)!.push(frame);
  }

  // Create summaries for each transaction
  const summaries: TransactionSummary[] = [];

  for (const [hash, txFrames] of txMap) {
    // Find root frame (parent_call_frame_id is null)
    const rootFrame = txFrames.find(f => f.parent_call_frame_id === null || f.parent_call_frame_id === undefined);
    const maxDepth = Math.max(...txFrames.map(f => f.depth ?? 0));
    const hasErrors = txFrames.some(f => (f.error_count ?? 0) > 0);

    // Look up contract name from dim_contract_owner
    const targetAddress = rootFrame?.target_address ?? null;
    const targetName = targetAddress ? (contractOwners[targetAddress.toLowerCase()]?.contract_name ?? null) : null;

    // Use receipt_gas_used directly - this is the source of truth from transaction receipt
    // For failed txs: gas_refund and intrinsic_gas will be NULL
    const totalGas = rootFrame?.receipt_gas_used ?? 0;

    summaries.push({
      transactionHash: hash,
      transactionIndex: rootFrame?.transaction_index ?? 0,
      totalGasUsed: totalGas,
      intrinsicGas: rootFrame?.intrinsic_gas ?? null,
      gasRefund: rootFrame?.gas_refund ?? 0,
      frameCount: txFrames.length,
      maxDepth,
      hasErrors,
      rootCallType: rootFrame?.call_type ?? 'CALL',
      targetAddress,
      targetName,
    });
  }

  // Sort by transaction index
  summaries.sort((a, b) => a.transactionIndex - b.transactionIndex);

  return summaries;
}

/**
 * Hook to fetch all transactions in a block
 */
export function useBlockTransactions({ blockNumber }: UseBlockTransactionsOptions): UseBlockTransactionsResult {
  const { currentNetwork } = useNetwork();

  // Get bounds to know the available block range (intersection of all gas profiler tables)
  const { data: bounds, isLoading: boundsLoading } = useGasProfilerBounds();

  // Determine which block to fetch
  const targetBlock = blockNumber ?? bounds?.max ?? null;

  // Fetch all call frames for the block
  const {
    data: frames,
    isLoading: framesLoading,
    error,
  } = useQuery({
    queryKey: ['gas-profiler', 'block-frames', targetBlock],
    queryFn: ({ signal }) =>
      fetchAllPages<IntTransactionCallFrame>(
        intTransactionCallFrameServiceList,
        {
          query: {
            block_number_eq: targetBlock!,
            order_by: 'transaction_index ASC, call_frame_id ASC',
            page_size: 10000,
          },
        },
        'int_transaction_call_frame',
        signal
      ),
    enabled: !!currentNetwork && targetBlock !== null,
  });

  // Pre-compute top contracts by gas to know which addresses need name lookup
  const topContractAddressesByGas = useMemo(() => {
    if (!frames) return [];
    // Aggregate gas by address
    const gasMap = new Map<string, number>();
    for (const frame of frames) {
      const addr = frame.target_address;
      if (!addr) continue;
      gasMap.set(addr, (gasMap.get(addr) ?? 0) + (frame.gas ?? 0));
    }
    // Get top 10 by gas
    return [...gasMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([addr]) => addr);
  }, [frames]);

  // Extract contract addresses that need name lookup:
  // - Root transaction targets (for transaction summaries)
  // - Top 10 contracts by gas (for the chart)
  const contractAddresses = useMemo(() => {
    if (!frames) return [];
    // Get addresses from root frames (where transaction starts)
    const rootAddresses = frames
      .filter(f => f.parent_call_frame_id === null || f.parent_call_frame_id === undefined)
      .map(f => f.target_address)
      .filter((addr): addr is string => addr != null);
    // Combine with top contracts by gas
    return [...new Set([...rootAddresses, ...topContractAddressesByGas])];
  }, [frames, topContractAddressesByGas]);

  // Fetch contract owner data for name hydration
  const { data: contractOwners, isLoading: contractOwnersLoading } = useContractOwners({
    addresses: contractAddresses,
    enabled: contractAddresses.length > 0,
  });

  // Merge precompile names into contract owners (API results take priority)
  const enrichedContractOwners = useMemo<ContractOwnerMap>(
    () => ({ ...getPrecompileOwnerMap(), ...contractOwners }),
    [contractOwners]
  );

  // Process frames into block data
  const data = useMemo<BlockData | null>(() => {
    if (!frames || targetBlock === null) return null;

    const transactions = createTransactionSummaries(frames, enrichedContractOwners);
    const totalGasUsed = transactions.reduce((sum, tx) => sum + tx.totalGasUsed, 0);

    // Aggregate call type distribution from ALL call frames (not just root)
    const callTypeMap = new Map<string, { count: number; gasUsed: number }>();
    for (const frame of frames) {
      // Skip root frames (transaction entry points, not internal calls)
      // Root frames always have call_frame_id = 0
      if (frame.call_frame_id === 0) continue;
      if (!frame.call_type) continue;
      const ct = frame.call_type;
      const frameGas = frame.gas ?? 0;
      const existing = callTypeMap.get(ct);
      if (existing) {
        existing.count += 1;
        existing.gasUsed += frameGas;
      } else {
        callTypeMap.set(ct, { count: 1, gasUsed: frameGas });
      }
    }
    const callTypeDistribution: CallTypeCount[] = [...callTypeMap.entries()]
      .map(([callType, data]) => ({ callType, count: data.count, gasUsed: data.gasUsed }))
      .sort((a, b) => b.gasUsed - a.gasUsed);

    // Aggregate gas by contract address from ALL call frames
    // Use self gas (frame.gas) not cumulative to avoid double-counting
    // Skip root frames (no call_type) - these are transaction entry points, not contract calls
    const contractGasMap = new Map<
      string,
      {
        gas: number;
        name: string | null;
        callCount: number;
        callTypes: Set<string>;
        firstTxHash: string | null;
      }
    >();
    for (const frame of frames) {
      // Skip root frames (transaction entry points, not internal calls)
      // Root frames always have call_frame_id = 0
      if (frame.call_frame_id === 0) continue;
      if (!frame.call_type) continue;

      const addr = frame.target_address;
      if (!addr) continue; // Skip frames without target address

      const selfGas = frame.gas ?? 0;
      const callType = frame.call_type;

      const existing = contractGasMap.get(addr);
      if (existing) {
        existing.gas += selfGas;
        existing.callCount += 1;
        existing.callTypes.add(callType);
      } else {
        const name = enrichedContractOwners[addr.toLowerCase()]?.contract_name ?? null;
        contractGasMap.set(addr, {
          gas: selfGas,
          name,
          callCount: 1,
          callTypes: new Set([callType]),
          firstTxHash: frame.transaction_hash ?? null,
        });
      }
    }

    // Sort by gas descending and filter out 0-gas entries
    // 0-gas entries are typically calls to EOAs (no code to execute) and don't
    // provide useful gas profiling information
    const allContractsByGas: ContractGasData[] = [...contractGasMap.entries()]
      .filter(([, data]) => data.gas > 0)
      .sort((a, b) => b[1].gas - a[1].gas)
      .map(([address, data]) => ({
        address,
        name: data.name,
        gas: data.gas,
        callCount: data.callCount,
        callTypes: [...data.callTypes],
        firstTxHash: data.firstTxHash,
      }));

    // Top 10 for charts
    const topContractsByGas = allContractsByGas.slice(0, 10);

    // Build transaction-to-contract flow data for Sankey visualization
    // Group by (txHash, contractAddress) to get gas flow between each tx and contract
    const txContractFlowMap = new Map<string, TxContractFlow>();
    for (const frame of frames) {
      // Skip root frames (transaction entry points, not internal calls)
      // Root frames always have call_frame_id = 0
      if (frame.call_frame_id === 0) continue;
      if (!frame.call_type) continue;
      const addr = frame.target_address;
      if (!addr) continue;

      const txHash = frame.transaction_hash ?? '';
      const key = `${txHash}:${addr}`;
      const selfGas = frame.gas ?? 0;

      const existing = txContractFlowMap.get(key);
      if (existing) {
        existing.gas += selfGas;
        existing.callCount += 1;
      } else {
        const txSummary = transactions.find(t => t.transactionHash === txHash);
        txContractFlowMap.set(key, {
          txHash,
          txIndex: txSummary?.transactionIndex ?? 0,
          txName: txSummary?.targetName ?? null,
          contractAddress: addr,
          contractName: enrichedContractOwners[addr.toLowerCase()]?.contract_name ?? null,
          gas: selfGas,
          callCount: 1,
        });
      }
    }
    // Filter out 0-gas flows (calls to EOAs) and sort by gas descending
    const txContractFlows = [...txContractFlowMap.values()].filter(flow => flow.gas > 0).sort((a, b) => b.gas - a.gas);

    return {
      blockNumber: targetBlock,
      transactions,
      totalGasUsed,
      transactionCount: transactions.length,
      callTypeDistribution,
      totalCallFrames: frames.filter(f => f.call_type).length,
      topContractsByGas,
      allContractsByGas,
      txContractFlows,
    };
  }, [frames, targetBlock, enrichedContractOwners]);

  return {
    data,
    isLoading: boundsLoading || framesLoading || contractOwnersLoading,
    error: error as Error | null,
    bounds,
    boundsLoading,
  };
}
