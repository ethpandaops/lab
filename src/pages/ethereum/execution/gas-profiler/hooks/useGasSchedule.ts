import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getGasScheduleOptions } from '@/lab-api/@tanstack/react-query.gen';
import type { GetGasScheduleError } from '@/lab-api';
import { useNetwork } from '@/hooks/useNetwork';
import type { GasScheduleDefaults } from '../SimulatePage.types';

/**
 * Parameters for useGasSchedule hook
 */
export interface UseGasScheduleParams {
  /** Block number to get gas schedule for - determines which fork's parameters are returned */
  blockNumber: number | null;
}

/**
 * Hook to fetch the gas schedule for a specific block's fork from the API.
 *
 * Returns the gas parameters with both values and descriptions for that fork.
 * For example, pre-Berlin blocks won't include SLOAD_COLD/SLOAD_WARM.
 *
 * @example
 * ```tsx
 * const { data: defaults, isLoading } = useGasSchedule({ blockNumber: 19000000 });
 * // defaults.parameters = {
 * //   SLOAD_COLD: { value: 2100, description: "Reading storage slot for first time..." },
 * //   ...
 * // }
 * ```
 */
export function useGasSchedule({
  blockNumber,
}: UseGasScheduleParams): UseQueryResult<GasScheduleDefaults, GetGasScheduleError> {
  const { currentNetwork } = useNetwork();

  return useQuery({
    ...getGasScheduleOptions({ path: { network: currentNetwork?.name ?? '' }, query: { block: blockNumber ?? 0 } }),
    enabled: !!currentNetwork && blockNumber !== null,
    staleTime: 1000 * 60 * 60, // 1 hour - gas schedule for a block never changes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: false, // Don't retry on error - show error immediately
  });
}
