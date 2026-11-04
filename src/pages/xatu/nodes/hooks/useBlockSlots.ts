import { useQuery } from '@tanstack/react-query';
import { fctBlockProposalStatusDailyServiceList, fctBlockProposalStatusHourlyServiceList } from '@/api/sdk.gen';
import type { FctBlockProposalStatusDaily, FctBlockProposalStatusHourly } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { NODE_RANGE_CONFIG, type NodeRange } from '../constants';
import { getBuckets, parseBucket, toDateString } from '../utils/time-buckets';

type ListFn = Parameters<typeof fetchAllPages>[0];

/**
 * Slots that had a block (canonical or orphaned) in each hour or day of a range, by bucket start. A bucket the
 * proposal table hasn't written yet is absent; every bucket is when the network has no proposal table.
 */
export function useBlockSlots(range: NodeRange): { data: Map<number, number> | null; isLoading: boolean } {
  const { currentNetwork } = useNetwork();
  const { granularity } = NODE_RANGE_CONFIG[range];
  const buckets = getBuckets(range, Date.now() / 1000);

  const { data, isLoading, error } = useQuery({
    queryKey: ['xatu-nodes', 'block-slots', currentNetwork?.name, range, buckets[0]],
    queryFn: async ({ signal }) => {
      const hourly = granularity === 'hourly';
      const bucketFilter = hourly
        ? { hour_start_date_time_gte: buckets[0] }
        : range === 'all'
          ? { day_start_date_like: '20%' }
          : { day_start_date_in_values: buckets.map(toDateString).join(',') };
      const rows = await fetchAllPages<FctBlockProposalStatusHourly & FctBlockProposalStatusDaily>(
        (hourly ? fctBlockProposalStatusHourlyServiceList : fctBlockProposalStatusDailyServiceList) as ListFn,
        { query: { ...bucketFilter, status_ne: 'missed', page_size: 10000 } },
        `fct_block_proposal_status_${granularity}`,
        signal
      );
      const bySlot = new Map<number, number>();
      rows.forEach(row => {
        const start = parseBucket(hourly ? row.hour_start_date_time : row.day_start_date);
        if (start !== null) bySlot.set(start, (bySlot.get(start) ?? 0) + (row.slot_count ?? 0));
      });
      return bySlot;
    },
    enabled: !!currentNetwork,
    // Overrides the app's retry-forever default, so a network without the table settles to no counts
    retry: 2,
  });

  return { data: data ?? (error ? new Map() : null), isLoading: isLoading && !error };
}
