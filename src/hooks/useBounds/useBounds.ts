import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { Bounds, TableBounds, TablesBoundsResult, AggregateBounds } from './useBounds.types';
import { BASE_URL, PATH_PREFIX, REFETCH_INTERVALS } from '@/utils/api-config';
import { useNetwork } from '@/hooks/useNetwork';

async function fetchBounds(network: string): Promise<Bounds> {
  const response = await fetch(`${BASE_URL}${PATH_PREFIX}/${network}/bounds`);

  if (!response.ok) {
    throw new Error(`Failed to fetch bounds: ${response.statusText}`);
  }

  return response.json();
}

interface UseBoundsOptions<TData = Bounds> {
  select?: (data: Bounds) => TData;
}

/**
 * Hook to fetch and manage network-scoped data bounds.
 *
 * Automatically fetches bounds for the current network and refetches every 5 seconds.
 * Uses TanStack Query for caching and state management.
 *
 * The bounds endpoint returns min/max timestamp boundaries for each table,
 * useful for determining available data ranges.
 *
 * Configuration is resilient to API failures:
 * - Stale data never expires (staleTime: Infinity)
 * - Cached data kept forever (gcTime: Infinity)
 * - Failed refetches keep using last successful data
 * - Only shows error on initial fetch failure (no cached data)
 *
 * @example
 * ```tsx
 * // Get all bounds
 * function MyComponent() {
 *   const { data: bounds, isLoading, error } = useBounds();
 *
 *   if (isLoading && !bounds) return <div>Loading...</div>;
 *   if (error && !bounds) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Block range: {bounds.fct_block?.min} - {bounds.fct_block?.max}</p>
 *     </div>
 *   );
 * }
 *
 * // Select specific data using selector
 * function BlockComponent() {
 *   const { data: blockBounds } = useBounds({
 *     select: (bounds) => bounds.fct_block,
 *   });
 *
 *   return <div>{blockBounds?.min} - {blockBounds?.max}</div>;
 * }
 * ```
 */
export function useBounds<TData = Bounds>(options?: UseBoundsOptions<TData>): UseQueryResult<TData, Error> {
  const { currentNetwork } = useNetwork();

  return useQuery({
    queryKey: ['bounds', currentNetwork?.name],
    queryFn: () => fetchBounds(currentNetwork!.name),
    enabled: !!currentNetwork, // Only run query when network is available
    refetchInterval: REFETCH_INTERVALS.BOUNDS,
    staleTime: Infinity, // Never consider data stale - always use cached data if available
    gcTime: Infinity, // Keep cached data forever
    select: options?.select,
  });
}

/**
 * Get bounds for a specific table.
 *
 * Uses the same cached bounds data, just filters to a single table.
 *
 * @example
 * ```tsx
 * function BlockStats() {
 *   const { data: blockBounds } = useTableBounds('fct_block');
 *
 *   if (!blockBounds) return null;
 *
 *   return <div>Blocks: {blockBounds.min} - {blockBounds.max}</div>;
 * }
 * ```
 */
export function useTableBounds(tableName: string): UseQueryResult<TableBounds | undefined, Error> {
  return useBounds({
    select: bounds => bounds[tableName],
  });
}

/**
 * Get bounds for multiple tables with aggregated statistics.
 *
 * Uses the same cached bounds data, filters to specified tables, and computes
 * aggregate statistics across all tables.
 *
 * @example
 * ```tsx
 * function MultiTableStats() {
 *   const { data } = useTablesBounds(['fct_block', 'fct_attestation']);
 *
 *   if (!data) return null;
 *
 *   return (
 *     <div>
 *       <div>Blocks: {data.tables.fct_block?.min} - {data.tables.fct_block?.max}</div>
 *       <div>Attestations: {data.tables.fct_attestation?.min} - {data.tables.fct_attestation?.max}</div>
 *       <div>Overall range: {data.aggregate.minOfMins} - {data.aggregate.maxOfMaxes}</div>
 *       <div>Intersection: {data.aggregate.maxOfMins} - {data.aggregate.minOfMaxes}</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTablesBounds(tableNames: string[]): UseQueryResult<TablesBoundsResult, Error> {
  return useBounds({
    select: bounds => {
      const tables = tableNames.reduce(
        (acc, name) => {
          if (bounds[name]) {
            acc[name] = bounds[name];
          }
          return acc;
        },
        {} as Record<string, TableBounds>
      );

      const boundsArray = Object.values(tables);

      const aggregate: AggregateBounds = {
        minOfMins: boundsArray.length > 0 ? Math.min(...boundsArray.map(b => b.min)) : undefined,
        maxOfMaxes: boundsArray.length > 0 ? Math.max(...boundsArray.map(b => b.max)) : undefined,
        maxOfMins: boundsArray.length > 0 ? Math.max(...boundsArray.map(b => b.min)) : undefined,
        minOfMaxes: boundsArray.length > 0 ? Math.min(...boundsArray.map(b => b.max)) : undefined,
      };

      return {
        tables,
        aggregate,
      };
    },
  });
}
