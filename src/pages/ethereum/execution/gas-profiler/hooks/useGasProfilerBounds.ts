import { useMemo } from 'react';
import { useTablesBounds } from '@/hooks/useBounds';

/**
 * Tables required for full gas profiler functionality.
 * The effective indexed range is the intersection of all these tables.
 */
const GAS_PROFILER_TABLES = [
  'int_block_opcode_gas',
  'int_transaction_call_frame',
  'int_transaction_call_frame_opcode_gas',
] as const;

export interface GasProfilerBounds {
  /** Minimum block number where ALL gas profiler tables have data */
  min: number;
  /** Maximum block number where ALL gas profiler tables have data */
  max: number;
}

export interface UseGasProfilerBoundsResult {
  /** The intersection bounds where all tables have data */
  data: GasProfilerBounds | undefined;
  /** Whether bounds are still loading */
  isLoading: boolean;
  /** Error if bounds fetch failed */
  error: Error | null;
  /** Individual table bounds for debugging/display */
  tables: Record<string, { min: number; max: number }> | undefined;
}

/**
 * Hook to get the effective indexed block range for the gas profiler.
 *
 * Returns the intersection of bounds across all required tables:
 * - int_block_opcode_gas (block-level opcode aggregations)
 * - int_transaction_call_frame (call frame data)
 * - int_transaction_call_frame_opcode_gas (per-frame opcode data)
 *
 * This ensures any block in the returned range has complete data
 * for all gas profiler features.
 *
 * @example
 * ```tsx
 * function GasProfiler() {
 *   const { data: bounds, isLoading } = useGasProfilerBounds();
 *
 *   if (isLoading) return <Loading />;
 *   if (!bounds) return <NoData />;
 *
 *   return <div>Indexed: {bounds.min} - {bounds.max}</div>;
 * }
 * ```
 */
export function useGasProfilerBounds(): UseGasProfilerBoundsResult {
  const { data, isLoading, error } = useTablesBounds([...GAS_PROFILER_TABLES]);

  const bounds = useMemo((): GasProfilerBounds | undefined => {
    if (!data?.aggregate.maxOfMins || !data?.aggregate.minOfMaxes) {
      return undefined;
    }

    // Intersection: max of mins to min of maxes
    const min = data.aggregate.maxOfMins;
    const max = data.aggregate.minOfMaxes;

    // If min > max, there's no valid intersection
    if (min > max) {
      return undefined;
    }

    return { min, max };
  }, [data]);

  return {
    data: bounds,
    isLoading,
    error: error as Error | null,
    tables: data?.tables,
  };
}
