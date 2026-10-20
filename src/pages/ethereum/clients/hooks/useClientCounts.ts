import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctBlockGraffitiClientByEntityDailyServiceList,
  fctBlockGraffitiClientByEntityHourlyServiceList,
  fctBlockGraffitiClientDailyServiceList,
  fctBlockGraffitiClientHourlyServiceList,
} from '@/api/sdk.gen';
import type {
  FctBlockGraffitiClientByEntityDaily,
  FctBlockGraffitiClientByEntityHourly,
  FctBlockGraffitiClientDaily,
  FctBlockGraffitiClientHourly,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { fillTimeKeys } from '@/pages/ethereum/execution/overview/overview.utils';
import { PAGE_SIZE, TIME_RANGE_CONFIG, type TimePeriod } from '../constants';
import { dailyDateValues, entityQuery, toClientCountRecords, type ClientCountRecord } from '../utils/client-share';

export interface UseClientCountsResult {
  /** Aggregate rows for the selected window */
  records: ClientCountRecord[];
  /** Every time bucket in the window, gaps included */
  keys: string[];
  /** Whether the window uses daily buckets */
  isDaily: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Block counts per client pair for the period: hourly table for short windows, daily for long ones.
 * With an entity or entity group, counts come from the per-entity tables and cover only those blocks.
 */
export function useClientCounts(timePeriod: TimePeriod, entity?: string): UseClientCountsResult {
  const { currentNetwork } = useNetwork();
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  // Hour aligned so the window always starts on a whole bucket.
  const hourlyStart = useMemo(() => {
    const hourNow = Math.floor(Date.now() / 1000 / 3600) * 3600;
    return hourNow - (config.days ?? 0) * 24 * 3600;
  }, [config.days]);

  const query = useQuery({
    queryKey: [
      'graffiti-clients',
      'counts',
      currentNetwork?.name,
      timePeriod,
      isDaily ? 'daily' : hourlyStart,
      entity ?? '',
    ],
    queryFn: async ({ signal }): Promise<ClientCountRecord[]> => {
      if (!isDaily) {
        const query = {
          hour_start_date_time_gte: hourlyStart,
          order_by: 'hour_start_date_time asc',
          page_size: PAGE_SIZE,
        };
        const rows = entity
          ? await fetchAllPages<FctBlockGraffitiClientByEntityHourly>(
              fctBlockGraffitiClientByEntityHourlyServiceList,
              { query: { ...query, ...entityQuery(entity) } },
              'fct_block_graffiti_client_by_entity_hourly',
              signal
            )
          : await fetchAllPages<FctBlockGraffitiClientHourly>(
              fctBlockGraffitiClientHourlyServiceList,
              { query },
              'fct_block_graffiti_client_hourly',
              signal
            );
        return toClientCountRecords(rows, false);
      }

      // The daily table only filters its date key by value, so bounded windows list their dates.
      const dateFilter =
        config.days === null
          ? { day_start_date_like: '20%' }
          : { day_start_date_in_values: dailyDateValues(config.days) };
      const query = { ...dateFilter, order_by: 'day_start_date asc', page_size: PAGE_SIZE };
      const rows = entity
        ? await fetchAllPages<FctBlockGraffitiClientByEntityDaily>(
            fctBlockGraffitiClientByEntityDailyServiceList,
            { query: { ...query, ...entityQuery(entity) } },
            'fct_block_graffiti_client_by_entity_daily',
            signal
          )
        : await fetchAllPages<FctBlockGraffitiClientDaily>(
            fctBlockGraffitiClientDailyServiceList,
            { query },
            'fct_block_graffiti_client_daily',
            signal
          );
      return toClientCountRecords(rows, true);
    },
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
  });

  const records = useMemo(() => query.data ?? [], [query.data]);

  const keys = useMemo(() => {
    const unique = [...new Set(records.map(record => record.key))].sort();
    return fillTimeKeys(unique, isDaily);
  }, [records, isDaily]);

  return { records, keys, isDaily, isLoading: query.isLoading, error: query.error };
}
