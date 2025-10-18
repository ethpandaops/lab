import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { Config } from './useConfig.types';
import { BASE_URL, PATH_PREFIX, REFETCH_INTERVALS } from '@/utils/api-config';

async function fetchConfig(): Promise<Config> {
  const response = await fetch(`${BASE_URL}${PATH_PREFIX}/config`);

  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch and manage app configuration.
 *
 * Automatically fetches config on mount and refetches every 60 seconds.
 * Uses TanStack Query for caching and state management.
 *
 * Configuration is resilient to API failures:
 * - Stale data never expires (staleTime: Infinity)
 * - Cached data kept forever (gcTime: Infinity)
 * - Failed refetches keep using last successful data
 * - Only shows error on initial fetch failure (no cached data)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: config, isLoading, error } = useConfig();
 *
 *   if (isLoading && !config) return <div>Loading...</div>;
 *   if (error && !config) return <div>Error: {error.message}</div>;
 *
 *   return <div>{config.networks.map(n => n.display_name)}</div>;
 * }
 * ```
 */
export function useConfig(): UseQueryResult<Config, Error> {
  return useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
    refetchInterval: REFETCH_INTERVALS.CONFIG,
    staleTime: Infinity, // Never consider data stale - always use cached data if available
    gcTime: Infinity, // Keep cached data forever
  });
}
