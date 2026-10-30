import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctOpcodeCostByElClientDailyServiceList, fctOpcodeCostByElClientVersionServiceList } from '@/api/sdk.gen';
import type { FctOpcodeCostByElClientDaily, FctOpcodeCostByElClientVersion } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { TIME_RANGE_CONFIG, type TimeRange } from '../IndexPage.types';
import { buildOpcodeCostModel, MIN_VERSION_HOURS, type OpcodeCostModel } from '../utils/opcode-costs';
import { generateDateRange } from './useEngineTimingsData';

/** The opcode model is fitted only on reference nodes, which share hardware */
const NODE_CLASS = 'eip7870-block-builder';

/** Single days are noisy, and the daily table has one row per opcode per client per day */
const MIN_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;

/**
 * Opcode cost fits for the selected range, clamped to 7–90 days: daily fits per client, and
 * per-release fits for releases that ran in the window.
 */
export function useOpcodeCostData(timeRange: TimeRange): {
  model: OpcodeCostModel | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { currentNetwork } = useNetwork();

  const { start, end } = useMemo(() => {
    const d = Math.min(
      MAX_WINDOW_DAYS,
      Math.max(MIN_WINDOW_DAYS, Math.round(TIME_RANGE_CONFIG[timeRange].seconds / 86400))
    );
    // End at the start of today (UTC): today's fit is still partial
    const todayStart = Math.floor(Date.now() / 1000 / 86400) * 86400;
    return { start: todayStart - d * 86400, end: todayStart - 1 };
  }, [timeRange]);

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
