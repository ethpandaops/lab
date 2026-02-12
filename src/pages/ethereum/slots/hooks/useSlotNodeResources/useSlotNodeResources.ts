import { useQuery } from '@tanstack/react-query';
import { fctNodeCpuUtilizationByProcessServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import type { FctNodeCpuUtilizationByProcess } from '@/api/types.gen';

/** cbt-api returns DateTime64(3) fields as microseconds */
const SECONDS_TO_MICROSECONDS = 1_000_000;

export interface UseSlotNodeResourcesResult {
  data: FctNodeCpuUtilizationByProcess[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSlotNodeResources(slot: number): UseSlotNodeResourcesResult {
  const { currentNetwork } = useNetwork();
  const slotTimestamp = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const slotTimestampUs = slotTimestamp * SECONDS_TO_MICROSECONDS;

  const { data, isLoading, error } = useQuery({
    ...fctNodeCpuUtilizationByProcessServiceListOptions({
      query: {
        wallclock_slot_start_date_time_eq: slotTimestampUs,
        page_size: 10000,
      },
    }),
    enabled: !!currentNetwork && slotTimestamp > 0,
  });

  const cpuData = data?.fct_node_cpu_utilization_by_process ?? null;

  return {
    data: cpuData,
    isLoading,
    error: error as Error | null,
  };
}
