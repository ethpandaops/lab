import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctOpcodeCostByElClientDailyServiceList, fctOpcodeCostByElClientVersionServiceList } from '@/api/sdk.gen';
import type { FctOpcodeCostByElClientDaily, FctOpcodeCostByElClientVersion } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { buildOpcodeCostModel, MIN_VERSION_HOURS, type OpcodeCostModel } from '../utils/opcode-costs';
import { rangeDays } from '../utils/performance';
import { generateDateRange } from '@/pages/ethereum/execution/timings/hooks/useEngineTimingsData';

/** The opcode model is fitted only on reference nodes, which share hardware */
const NODE_CLASS = 'eip7870-block-builder';

/**
 * Opcode cost fits over the complete UTC days that contain the range [rangeStart, rangeEnd), since the
 * fits are daily: daily fits per client, and per-release fits for releases that ran in those days.
 */
export function useOpcodeCostData(
  rangeStart: number,
  rangeEnd: number
): {
  model: OpcodeCostModel | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { currentNetwork } = useNetwork();

  const { start, end } = useMemo(() => {
    const days = rangeDays(rangeStart, rangeEnd);
    return { start: days.start, end: days.end - 1 };
  }, [rangeStart, rangeEnd]);

  const daily = useQuery({
    queryKey: ['opcode-cost', 'daily', currentNetwork?.name, start, end],
    queryFn: ({ signal }) =>
      fetchAllPages<FctOpcodeCostByElClientDaily>(
        fctOpcodeCostByElClientDailyServiceList,
        {
          query: {
            day_start_date_in_values: generateDateRange(start, end),
            node_class_eq: NODE_CLASS,
            page_size: 10000,
          },
        },
        'fct_opcode_cost_by_el_client_daily',
        signal
      ),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
  });

  const versions = useQuery({
    queryKey: ['opcode-cost', 'versions', currentNetwork?.name, start],
    queryFn: ({ signal }) =>
      fetchAllPages<FctOpcodeCostByElClientVersion>(
        fctOpcodeCostByElClientVersionServiceList,
        {
          query: {
            node_class_eq: NODE_CLASS,
            last_seen_date_time_gte: start,
            hour_count_gte: MIN_VERSION_HOURS,
            page_size: 10000,
          },
        },
        'fct_opcode_cost_by_el_client_version',
        signal
      ),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
  });

  const model = useMemo(
    () => (daily.data ? buildOpcodeCostModel(daily.data, versions.data ?? []) : null),
    [daily.data, versions.data]
  );

  return {
    model,
    isLoading: daily.isLoading,
    error: (daily.error as Error | null) ?? null,
  };
}
