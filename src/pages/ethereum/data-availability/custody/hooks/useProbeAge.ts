import { useQuery } from '@tanstack/react-query';
import { fctCustodyProbeBySlotAgeDailyServiceList } from '@/api/sdk.gen';
import type { FctCustodyProbeBySlotAgeDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { currentUtcDate } from '@/utils/time';
import { summariseProbeAge, type ProbeAgeSummary } from '@/pages/ethereum/data-availability/custody/utils/probe-age';

/**
 * Custody probes per complete UTC day, slot age bucket and probed peer client, summarised by slot age. The daily
 * table holds one row per day, bucket and client, so every complete day is read.
 */
export function useProbeAge(enabled: boolean): {
  data: ProbeAgeSummary | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { currentNetwork } = useNetwork();
  const today = currentUtcDate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['custody', 'probe-age', currentNetwork?.name, today],
    queryFn: async ({ signal }) =>
      summariseProbeAge(
        await fetchAllPages<FctCustodyProbeBySlotAgeDaily>(
          fctCustodyProbeBySlotAgeDailyServiceList,
          { query: { day_start_date_ne: today, page_size: 10000 } },
          'fct_custody_probe_by_slot_age_daily',
          signal
        )
      ),
    enabled: enabled && !!currentNetwork,
  });
  return { data, isLoading, error: error as Error | null };
}
