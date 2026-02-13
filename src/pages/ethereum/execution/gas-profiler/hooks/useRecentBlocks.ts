import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { intBlockOpcodeGasServiceList } from '@/api/sdk.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useGasProfilerBounds } from './useGasProfilerBounds';

/**
 * Lightweight block summary for Recent Blocks visualization
 */
export interface BlockSummary {
  blockNumber: number;
  gasUsed: number;
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
 * Uses int_block_opcode_gas for efficient per-block gas totals.
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

  // Fetch opcode gas data for recent blocks
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

  // Aggregate gas and opcode count by block
  const blocks = useMemo<BlockSummary[]>(() => {
    if (!opcodeGasData || !maxBlock) return [];

    // Sum gas and count per block
    const blockMap = new Map<number, { gasUsed: number; opcodeCount: number }>();
    for (const row of opcodeGasData) {
      if (row.block_number === undefined) continue;
      const current = blockMap.get(row.block_number) ?? { gasUsed: 0, opcodeCount: 0 };
      blockMap.set(row.block_number, {
        gasUsed: current.gasUsed + (row.gas ?? 0),
        opcodeCount: current.opcodeCount + (row.count ?? 0),
      });
    }

    // Convert to sorted array
    return [...blockMap.entries()]
      .map(([blockNumber, data]) => ({ blockNumber, gasUsed: data.gasUsed, opcodeCount: data.opcodeCount }))
      .sort((a, b) => a.blockNumber - b.blockNumber);
  }, [opcodeGasData, maxBlock]);

  // Calculate navigation availability
  const hasOlderBlocks = bounds?.min !== undefined && minBlock !== null && minBlock > bounds.min;
  const viewMax = maxBlock ?? 0;
  const hasNewerBlocks = bounds?.max !== undefined && viewMax > 0 && viewMax < bounds.max;
  const newerBlockCount = bounds?.max !== undefined && viewMax > 0 ? Math.max(0, bounds.max - viewMax) : 0;
  const isAtLatest = !hasNewerBlocks;

  return {
    blocks,
    isLoading: boundsLoading || dataLoading,
    isFetching: dataFetching,
    error: error as Error | null,
    hasOlderBlocks,
    hasNewerBlocks,
    isAtLatest,
    newerBlockCount,
    bounds,
  };
}
