import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctBlockOpcodeGasServiceList } from '@/api/sdk.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';

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
  /** Offset from latest (0 = latest blocks, 6 = 6 blocks back, etc.) */
  offset?: number;
}

export interface UseRecentBlocksResult {
  blocks: BlockSummary[];
  isLoading: boolean;
  error: Error | null;
  /** Whether there are older blocks available to load */
  hasOlderBlocks: boolean;
  /** Whether we're viewing the latest blocks (offset = 0) */
  isAtLatest: boolean;
  /** The bounds of available data */
  bounds: { min: number; max: number } | undefined;
}

/**
 * Hook to fetch lightweight summary data for recent blocks.
 * Uses fct_block_opcode_gas for efficient per-block gas totals.
 */
export function useRecentBlocks({ count = 6, offset = 0 }: UseRecentBlocksOptions = {}): UseRecentBlocksResult {
  const { currentNetwork } = useNetwork();

  // Get bounds from fct_block_opcode_gas table
  const { data: bounds, isLoading: boundsLoading } = useTableBounds('fct_block_opcode_gas');

  // Calculate the block range we want (with offset from latest)
  const maxBlock = bounds?.max ? bounds.max - offset : null;
  const minBlock = maxBlock ? Math.max(bounds?.min ?? 0, maxBlock - count + 1) : null;

  // Fetch opcode gas data for recent blocks
  const {
    data: opcodeGasData,
    isLoading: dataLoading,
    error,
  } = useQuery({
    queryKey: ['gas-profiler', 'recent-blocks-gas', minBlock, maxBlock],
    queryFn: async ({ signal }) => {
      const response = await fctBlockOpcodeGasServiceList({
        query: {
          block_number_gte: minBlock!,
          block_number_lte: maxBlock!,
          page_size: 10000, // Get all opcodes for these blocks
        },
        signal,
      });
      return response.data?.fct_block_opcode_gas ?? [];
    },
    enabled: !!currentNetwork && minBlock !== null && maxBlock !== null,
    staleTime: 30_000, // 30 seconds
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

  // Calculate if there are older blocks available
  const hasOlderBlocks = bounds?.min !== undefined && minBlock !== null && minBlock > bounds.min;
  const isAtLatest = offset === 0;

  return {
    blocks,
    isLoading: boundsLoading || dataLoading,
    error: error as Error | null,
    hasOlderBlocks,
    isAtLatest,
    bounds,
  };
}
