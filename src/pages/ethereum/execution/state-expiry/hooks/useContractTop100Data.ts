import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctStorageSlotTop100ByBytesServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctStorageSlotTop100ByBytes } from '@/api/types.gen';

interface UseContractTop100DataResult {
  data: FctStorageSlotTop100ByBytes[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that fetches the top 100 contracts by storage bytes.
 * Returns contracts sorted by rank (1 = highest bytes usage).
 */
export function useContractTop100Data(): UseContractTop100DataResult {
  const query = useQuery({
    ...fctStorageSlotTop100ByBytesServiceListOptions({
      query: {
        rank_gte: 1,
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const data = query.data?.fct_storage_slot_top_100_by_bytes ?? null;

  // Filter for raw state (null expiry_policy) and sort by rank
  const filteredData = data
    ? [...data].filter(item => item.expiry_policy == null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    : null;

  return {
    data: filteredData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
