import { useQuery } from '@tanstack/react-query';
import { fctNodeDiskIoByProcessServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { slotToTimestamp } from '@/utils/beacon';
import type { FctNodeDiskIoByProcess } from '@/api/types.gen';

const SECONDS_TO_MICROSECONDS = 1_000_000;

export interface UseSlotNodeDiskIoResult {
  data: FctNodeDiskIoByProcess[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSlotNodeDiskIo(slot: number): UseSlotNodeDiskIoResult {
  const { currentNetwork } = useNetwork();
  const slotTimestamp = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const slotTimestampUs = slotTimestamp * SECONDS_TO_MICROSECONDS;

  const { data, isLoading, error } = useQuery({
    ...fctNodeDiskIoByProcessServiceListOptions({
      query: {
        wallclock_slot_start_date_time_eq: slotTimestampUs,
        page_size: 10000,
      },
    }),
    enabled: !!currentNetwork && slotTimestamp > 0,
  });

  return {
    data: data?.fct_node_disk_io_by_process ?? null,
    isLoading,
    error: error as Error | null,
  };
}
