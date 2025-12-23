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
        page_size: 100,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const data = query.data?.fct_storage_slot_top_100_by_bytes ?? null;

  // Sort by rank to ensure correct order
  const sortedData = data ? [...data].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) : null;

  return {
    data: sortedData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
