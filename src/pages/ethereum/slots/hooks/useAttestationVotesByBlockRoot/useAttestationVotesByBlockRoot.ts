import { useQuery } from '@tanstack/react-query';
import { fctAttestationVoteByBlockRootHeadServiceList, fctAttestationVoteByBlockRootServiceList } from '@/api/sdk.gen';
import type { FctAttestationVoteByBlockRoot } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';

export interface UseAttestationVotesByBlockRootResult {
  data: FctAttestationVoteByBlockRoot[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Head vote counts for a slot, one row per block root voted for.
 *
 * @param slotTimestamp - The slot's start time
 * @param settled - Read the settled table; false reads its head counterpart
 * @param enabled - Whether the query should run
 */
export function useAttestationVotesByBlockRoot(
  slotTimestamp: number,
  settled: boolean,
  enabled: boolean
): UseAttestationVotesByBlockRootResult {
  const { currentNetwork } = useNetwork();
  const table = settled ? 'fct_attestation_vote_by_block_root' : 'fct_attestation_vote_by_block_root_head';

  const { data, isLoading, error } = useQuery({
    queryKey: ['attestation-votes-by-block-root', currentNetwork?.name, table, slotTimestamp],
    queryFn: async ({ signal }) => {
      const query = { slot_start_date_time_eq: slotTimestamp, page_size: 1000 };
      if (settled) {
        const { data } = await fctAttestationVoteByBlockRootServiceList({ query, signal, throwOnError: true });
        return data.fct_attestation_vote_by_block_root ?? [];
      }
      const { data } = await fctAttestationVoteByBlockRootHeadServiceList({ query, signal, throwOnError: true });
      return data.fct_attestation_vote_by_block_root_head ?? [];
    },
    enabled,
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
