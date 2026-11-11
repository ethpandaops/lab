import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { getConfigOptions } from '@/lab-api/@tanstack/react-query.gen';
import type { GetConfigError } from '@/lab-api';
import type { Config } from './useConfig.types';
import { REFETCH_INTERVALS } from '@/utils/api-config';

/**
 * The networks and features the UI offers.
 *
 * They are in the cache before the first render when lab-backend injected them into the page (see
 * `createQueryClient`), and fetched otherwise (the Vite dev server). They never go stale and stay cached for good; a
 * refetch every 60 seconds picks up changes, and a failed refetch keeps the last configuration.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: config } = useConfig();
 *
 *   return <div>{config?.networks.map(n => n.display_name)}</div>;
 * }
 * ```
 */
export function useConfig(): UseQueryResult<Config, GetConfigError> {
  return useQuery({
    ...getConfigOptions(),
    refetchInterval: REFETCH_INTERVALS.CONFIG,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
