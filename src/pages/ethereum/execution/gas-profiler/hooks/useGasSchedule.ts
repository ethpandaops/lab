import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import type { GasScheduleDefaults, GasParameterInfo } from '../SimulatePage.types';

/**
 * API response from the backend (new format with descriptions)
 */
interface ApiGasScheduleResponse {
  parameters: Record<string, GasParameterInfo>;
}

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
export function useGasSchedule({ blockNumber }: UseGasScheduleParams): UseQueryResult<GasScheduleDefaults, Error> {
  const { currentNetwork } = useNetwork();

  return useQuery<GasScheduleDefaults>({
    queryKey: ['gas-schedule', currentNetwork?.name, blockNumber],
    queryFn: async () => {
      if (!currentNetwork) {
        throw new Error('No network selected');
      }

      if (blockNumber === null) {
        throw new Error('Block number is required');
      }

      const response = await fetch(`/api/v1/gas-profiler/${currentNetwork.name}/gas-schedule?block=${blockNumber}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to fetch gas schedule: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data: ApiGasScheduleResponse = await response.json();

      // Return the full response with parameters including descriptions
      return {
        parameters: data.parameters,
      };
    },
    enabled: !!currentNetwork && blockNumber !== null,
    staleTime: 1000 * 60 * 60, // 1 hour - gas schedule for a block never changes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: false, // Don't retry on error - show error immediately
  });
}
