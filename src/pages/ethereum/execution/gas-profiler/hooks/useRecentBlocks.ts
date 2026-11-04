import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { intBlockCanonicalServiceList, intBlockOpcodeGasServiceList } from '@/api/sdk.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useGasProfilerBounds } from './useGasProfilerBounds';

/**
 * Lightweight block summary for Recent Blocks visualization
 */
export interface BlockSummary {
  blockNumber: number;
  /** Receipt gas used by the block, or null when the block header isn't available */
  gasUsed: number | null;
  /** Block gas limit, or null when the block header isn't available */
  gasLimit: number | null;
  opcodeCount: number;
}

export interface UseRecentBlocksOptions {
  /** Number of recent blocks to fetch (default: 6) */
  count?: number;
  /** Offset from the anchor block (0 = at anchor, 6 = 6 blocks back, etc.) */
  offset?: number;
  /** Pin view to this block number instead of always chasing bounds.max */
  anchorBlock?: number;
}

export interface UseRecentBlocksResult {
  blocks: BlockSummary[];
  /** True only on initial load (no data yet) */
  isLoading: boolean;
  /** True when fetching new data (including background refetch) */
  isFetching: boolean;
  error: Error | null;
  /** Whether there are older blocks available to load */
  hasOlderBlocks: boolean;
  /** Whether there are newer blocks beyond the current view */
  hasNewerBlocks: boolean;
  /** Whether the view includes the actual latest indexed block */
  isAtLatest: boolean;
  /** Number of new blocks available beyond the current view */
  newerBlockCount: number;
  /** The bounds of available data */
  bounds: { min: number; max: number } | undefined;
}

/**
 * Hook to fetch lightweight summary data for recent blocks.
 * Gas used and gas limit come from the block header (int_block_canonical);
 * opcode counts come from int_block_opcode_gas.
 *
 * When `anchorBlock` is provided, the view is pinned to that block
 * instead of always following bounds.max. This prevents the view
 * from jumping when new blocks are indexed.
 */
export function useRecentBlocks({
  count = 6,
  offset = 0,
  anchorBlock,
}: UseRecentBlocksOptions = {}): UseRecentBlocksResult {
  const { currentNetwork } = useNetwork();

  // Get bounds (intersection of all gas profiler tables)
  const { data: bounds, isLoading: boundsLoading } = useGasProfilerBounds();

  // Use anchor block if provided, otherwise fall back to bounds.max
  const effectiveMax = anchorBlock ?? bounds?.max ?? null;
  const maxBlock = effectiveMax ? effectiveMax - offset : null;
  const minBlock = maxBlock ? Math.max(bounds?.min ?? 0, maxBlock - count + 1) : null;

  // Fetch opcode data for recent blocks
  const {
    data: opcodeGasData,
    isLoading: dataLoading,
    isFetching: dataFetching,
    error,
  } = useQuery({
    queryKey: ['gas-profiler', 'recent-blocks-gas', minBlock, maxBlock],
    queryFn: async ({ signal }) => {
      const response = await intBlockOpcodeGasServiceList({
        query: {
          block_number_gte: minBlock!,
          block_number_lte: maxBlock!,
          page_size: 10000, // Get all opcodes for these blocks
        },
        signal,
      });
      return response.data?.int_block_opcode_gas ?? [];
    },
    enabled: !!currentNetwork && minBlock !== null && maxBlock !== null,
    staleTime: 30_000, // 30 seconds
    placeholderData: keepPreviousData, // Keep showing previous data while new data loads
  });

  // The table is keyed by slot time. Each post-merge block takes at least one 12s slot, so a block
  // can't be older than this lower bound, which keeps the scan small.
  const mergeAnchor = currentNetwork?.forks?.execution?.paris;
  const minSlotTime =
    minBlock === null || !currentNetwork
      ? null
      : mergeAnchor
        ? mergeAnchor.timestamp + 12 * Math.max(0, minBlock - mergeAnchor.block)
        : currentNetwork.genesis_time;

  // Header gas used and gas limit for the same blocks
  const {
    data: headerData,
    isLoading: headerLoading,
    isFetching: headerFetching,
    error: headerError,
  } = useQuery({
    queryKey: ['gas-profiler', 'recent-blocks-header', minBlock, maxBlock, minSlotTime],
    queryFn: async ({ signal }) => {
      const response = await intBlockCanonicalServiceList({
        query: {
          slot_start_date_time_gte: minSlotTime!,
          execution_payload_block_number_gte: minBlock!,
          execution_payload_block_number_lte: maxBlock!,
          page_size: 100,
        },
        signal,
      });
      return response.data?.int_block_canonical ?? [];
    },
    enabled: minBlock !== null && maxBlock !== null && minSlotTime !== null,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Combine opcode counts with header gas per block
  const blocks = useMemo<BlockSummary[]>(() => {
    if (!opcodeGasData || !maxBlock) return [];

    const opcodeCounts = new Map<number, number>();
    for (const row of opcodeGasData) {
      if (row.block_number === undefined) continue;
      opcodeCounts.set(row.block_number, (opcodeCounts.get(row.block_number) ?? 0) + (row.count ?? 0));
    }

    const headers = new Map<number, { gasUsed: number | null; gasLimit: number | null }>();
    for (const row of headerData ?? []) {
      if (row.execution_payload_block_number === undefined) continue;
      headers.set(row.execution_payload_block_number, {
        gasUsed: row.execution_payload_gas_used ?? null,
        gasLimit: row.execution_payload_gas_limit ?? null,
      });
    }

    return [...opcodeCounts.entries()]
      .map(([blockNumber, opcodeCount]) => ({
        blockNumber,
        gasUsed: headers.get(blockNumber)?.gasUsed ?? null,
        gasLimit: headers.get(blockNumber)?.gasLimit ?? null,
        opcodeCount,
      }))
      .sort((a, b) => a.blockNumber - b.blockNumber);
  }, [opcodeGasData, headerData, maxBlock]);

  // Calculate navigation availability
  const hasOlderBlocks = bounds?.min !== undefined && minBlock !== null && minBlock > bounds.min;
  const viewMax = maxBlock ?? 0;
  const hasNewerBlocks = bounds?.max !== undefined && viewMax > 0 && viewMax < bounds.max;
  const newerBlockCount = bounds?.max !== undefined && viewMax > 0 ? Math.max(0, bounds.max - viewMax) : 0;
  const isAtLatest = !hasNewerBlocks;

  return {
    blocks,
    isLoading: boundsLoading || dataLoading || headerLoading,
    isFetching: dataFetching || headerFetching,
    error: (error ?? headerError) as Error | null,
    hasOlderBlocks,
    hasNewerBlocks,
    isAtLatest,
    newerBlockCount,
    bounds,
  };
}
