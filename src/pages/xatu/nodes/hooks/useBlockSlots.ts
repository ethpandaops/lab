import { useQuery } from '@tanstack/react-query';
import { fctBlockProposalStatusDailyServiceList, fctBlockProposalStatusHourlyServiceList } from '@/api/sdk.gen';
import type { FctBlockProposalStatusDaily, FctBlockProposalStatusHourly } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { NODE_RANGE_CONFIG, type NodeRange } from '@/pages/xatu/nodes/constants';
import { bucketFilter, getBuckets, rowBucket, weekStart } from '@/pages/xatu/nodes/utils/time-buckets';

type ListFn = Parameters<typeof fetchAllPages>[0];

/**
 * Slots that had a block (canonical or orphaned) in each hour, day or week of a range, by bucket start. A bucket the
 * proposal table hasn't written yet is absent; every bucket is when the network has no proposal table.
 */
export function useBlockSlots(range: NodeRange): { data: Map<number, number> | null; isLoading: boolean } {
  const { currentNetwork } = useNetwork();
  const { granularity } = NODE_RANGE_CONFIG[range];
  // There is no weekly proposal table, so weeks add up their days
  const tableGranularity = granularity === 'weekly' ? 'daily' : granularity;
  const buckets = getBuckets(range, Date.now() / 1000, undefined, tableGranularity);

  const { data, isLoading, error } = useQuery({
    queryKey: ['xatu-nodes', 'block-slots', currentNetwork?.name, range, buckets[0]],
    queryFn: async ({ signal }) => {
      const hourly = tableGranularity === 'hourly';
      const rows = await fetchAllPages<FctBlockProposalStatusHourly & FctBlockProposalStatusDaily>(
        (hourly ? fctBlockProposalStatusHourlyServiceList : fctBlockProposalStatusDailyServiceList) as ListFn,
        {
          query: { ...bucketFilter(tableGranularity, buckets, range === 'all'), status_ne: 'missed', page_size: 10000 },
        },
        `fct_block_proposal_status_${tableGranularity}`,
        signal
      );
      const bySlot = new Map<number, number>();
      rows.forEach(row => {
        const bucket = rowBucket(row, tableGranularity);
        if (bucket === null) return;
        const start = granularity === 'weekly' ? weekStart(bucket) : bucket;
        bySlot.set(start, (bySlot.get(start) ?? 0) + (row.slot_count ?? 0));
      });
      return bySlot;
    },
    enabled: !!currentNetwork,
    // Overrides the app's retry-forever default, so a network without the table settles to no counts
    retry: 2,
  });

  return { data: data ?? (error ? new Map() : null), isLoading: isLoading && !error };
}
