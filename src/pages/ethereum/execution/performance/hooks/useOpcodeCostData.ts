import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctOpcodeCostByElClientDailyServiceList, fctOpcodeCostByElClientWeeklyServiceList } from '@/api/sdk.gen';
import type { FctOpcodeCostByElClientDaily, FctOpcodeCostByElClientWeekly } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { currentUtcWeek } from '@/utils/time';
import { buildOpcodeCostModel, type OpcodeCostModel } from '@/pages/ethereum/execution/performance/utils/opcode-costs';
import { rangeDays } from '@/pages/ethereum/execution/performance/utils/performance';
import { generateDateRange } from '@/pages/ethereum/execution/timings/hooks/useEngineTimingsData';

/** The opcode model is fitted only on reference nodes, which share hardware */
const NODE_CLASS = 'eip7870-block-builder';

/**
 * Opcode cost fits over the complete UTC days that contain the range [rangeStart, rangeEnd), since the
 * fits are daily: daily fits per client. `allDays`
 * reads the weekly fits of every complete week the table holds instead, the same model at a coarser grain.
 */
export function useOpcodeCostData(
  rangeStart: number,
  rangeEnd: number,
  allDays = false
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
    queryKey: ['opcode-cost', 'daily', currentNetwork?.name, allDays, start, end],
    queryFn: ({ signal }): Promise<Array<FctOpcodeCostByElClientDaily | FctOpcodeCostByElClientWeekly>> =>
      allDays
        ? fetchAllPages<FctOpcodeCostByElClientWeekly>(
            fctOpcodeCostByElClientWeeklyServiceList,
            { query: { week_start_date_ne: currentUtcWeek(), node_class_eq: NODE_CLASS, page_size: 10000 } },
            'fct_opcode_cost_by_el_client_weekly',
            signal
          )
        : fetchAllPages<FctOpcodeCostByElClientDaily>(
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

  const model = useMemo(() => (daily.data ? buildOpcodeCostModel(daily.data) : null), [daily.data]);

  return {
    model,
    isLoading: daily.isLoading,
    error: (daily.error as Error | null) ?? null,
  };
}
