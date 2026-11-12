import { type UseQueryResult, useQueries, useQuery } from '@tanstack/react-query';
import { getBoundsOptions } from '@/lab-api/@tanstack/react-query.gen';
import type { GetBoundsError } from '@/lab-api';
import type { Bounds, TableBounds, TablesBoundsResult, AggregateBounds } from './useBounds.types';
import { REFETCH_INTERVALS } from '@/utils/api-config';
import { useNetwork } from '@/hooks/useNetwork';

/** Bounds never go stale and stay cached for good; a refetch every 5 seconds keeps them current. */
function boundsOptions(network: string): ReturnType<typeof getBoundsOptions> {
  return {
    ...getBoundsOptions({ path: { network } }),
    refetchInterval: REFETCH_INTERVALS.BOUNDS,
    staleTime: Infinity,
    gcTime: Infinity,
  };
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
 *   const { data: bounds } = useBounds();
 *
 *   if (!bounds) return <div>Loading...</div>;
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
export function useBounds<TData = Bounds>(options?: UseBoundsOptions<TData>): UseQueryResult<TData, GetBoundsError> {
  const { currentNetwork } = useNetwork();

  return useQuery({
    ...boundsOptions(currentNetwork?.name ?? ''),
    enabled: !!currentNetwork,
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
export function useTableBounds(tableName: string): UseQueryResult<TableBounds | undefined, GetBoundsError> {
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
export function useTablesBounds(tableNames: string[]): UseQueryResult<TablesBoundsResult, GetBoundsError> {
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

/**
 * Bounds for several networks at once, keyed by network name. Shares the cache with useBounds,
 * so the current network's bounds are not fetched twice.
 */
export function useNetworksBounds(networkNames: string[]): Record<string, UseQueryResult<Bounds, GetBoundsError>> {
  const results = useQueries({ queries: networkNames.map(boundsOptions) });
  return Object.fromEntries(
    networkNames.flatMap((name, index): [string, UseQueryResult<Bounds, GetBoundsError>][] => {
      const result = results[index];
      return result ? [[name, result]] : [];
    })
  );
}
