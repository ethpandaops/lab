import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctBlockGraffitiClientByEntityDailyServiceList,
  fctBlockGraffitiClientByEntityGroupDailyServiceList,
  fctBlockGraffitiClientByEntityHourlyServiceList,
  fctBlockGraffitiClientDailyServiceList,
  fctBlockGraffitiClientHourlyServiceList,
} from '@/api/sdk.gen';
import type {
  FctBlockGraffitiClientByEntityDaily,
  FctBlockGraffitiClientByEntityGroupDaily,
  FctBlockGraffitiClientByEntityHourly,
  FctBlockGraffitiClientDaily,
  FctBlockGraffitiClientHourly,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { fetchAllPages } from '@/utils/api-pagination';
import { completeBucketEnd, completeUtcDays, currentUtcDate, toUtcDate } from '@/utils/time';
import { fillTimeKeys } from '@/pages/ethereum/execution/overview/overview.utils';
import { PAGE_SIZE, TIME_RANGE_CONFIG, type TimePeriod } from '../constants';
import { entityQuery, isEntityGroup, toClientCountRecords, type ClientCountRecord } from '../utils/client-share';
import { chunksFor } from './useVersionCounts';

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

const DAY = 86400;

/**
 * Block counts per client pair for the period: hourly table for short windows, daily for long ones.
 * With an entity or entity group, counts come from the per-entity tables and cover only those blocks; daily counts
 * for a group come from the per-group table, and from the per-entity table for days before the group table starts.
 */
export function useClientCounts(timePeriod: TimePeriod, entity?: string): UseClientCountsResult {
  const { currentNetwork } = useNetwork();
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  const hourlyEnd = useMemo(() => completeBucketEnd('hour'), []);
  const today = useMemo(() => currentUtcDate(), []);
  const hourlyStart = hourlyEnd - (config.days ?? 0) * 24 * 3600;

  // The group table's first complete day, unless it reaches back as far as the per-entity table
  const group = isDaily && entity && isEntityGroup(entity) ? entity.slice(1) : undefined;
  const groupBounds = useTableBounds('fct_block_graffiti_client_by_entity_group_daily');
  const entityBounds = useTableBounds('fct_block_graffiti_client_by_entity_daily');
  const groupMin = groupBounds.data?.min;
  const entityMin = entityBounds.data?.min;
  const groupFrom =
    groupMin !== undefined && entityMin !== undefined && groupMin > entityMin
      ? toUtcDate(Math.ceil(groupMin / DAY) * DAY)
      : '';

  const query = useQuery({
    queryKey: [
      'graffiti-clients',
      'counts',
      currentNetwork?.name,
      timePeriod,
      isDaily ? today : hourlyStart,
      entity ?? '',
      group && groupMin !== undefined ? groupFrom : '',
    ],
    queryFn: async ({ signal }): Promise<ClientCountRecord[]> => {
      if (!isDaily) {
        const query = {
          hour_start_date_time_gte: hourlyStart,
          hour_start_date_time_lt: hourlyEnd,
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

      // The daily tables only filter their date key by value, so bounded windows list their dates and all history
      // loads a query per calendar year, in parallel. A group's window splits where its table starts.
      const windowEnd = completeBucketEnd('day');
      const filtersFor = (from?: number, to = windowEnd): Array<Record<string, unknown>> => {
        if (config.days === null) return chunksFor('daily', from, to).map(chunk => chunk.query);
        const days = completeUtcDays(config.days).filter(day => day >= toUtcDate(from ?? 0) && day < toUtcDate(to));
        return days.length > 0 ? [{ day_start_date_in_values: days.join(',') }] : [];
      };
      const dateFilters = filtersFor();

      if (group && groupMin !== undefined) {
        const groupStart = groupFrom ? Date.parse(groupFrom) / 1000 : undefined;
        const order = { order_by: 'day_start_date asc', page_size: PAGE_SIZE };
        const [groupRows, headRows] = await Promise.all([
          Promise.all(
            filtersFor(groupStart).map(dateFilter =>
              fetchAllPages<FctBlockGraffitiClientByEntityGroupDaily>(
                fctBlockGraffitiClientByEntityGroupDailyServiceList,
                { query: { ...dateFilter, entity_group_eq: group, ...order } },
                'fct_block_graffiti_client_by_entity_group_daily',
                signal
              )
            )
          ),
          groupStart === undefined
            ? []
            : Promise.all(
                filtersFor(undefined, groupStart).map(dateFilter =>
                  fetchAllPages<FctBlockGraffitiClientByEntityDaily>(
                    fctBlockGraffitiClientByEntityDailyServiceList,
                    { query: { ...dateFilter, ...entityQuery(`*${group}`), ...order } },
                    'fct_block_graffiti_client_by_entity_daily',
                    signal
                  )
                )
              ),
        ]);
        // A year query can reach back past the group table's first complete day
        return toClientCountRecords(
          [...groupRows.flat().filter(row => (row.day_start_date ?? '') >= groupFrom), ...headRows.flat()],
          true
        );
      }

      const chunks = await Promise.all(
        dateFilters.map(dateFilter => {
          const query = { ...dateFilter, order_by: 'day_start_date asc', page_size: PAGE_SIZE };
          return entity
            ? fetchAllPages<FctBlockGraffitiClientByEntityDaily>(
                fctBlockGraffitiClientByEntityDailyServiceList,
                { query: { ...query, ...entityQuery(entity) } },
                'fct_block_graffiti_client_by_entity_daily',
                signal
              )
            : fetchAllPages<FctBlockGraffitiClientDaily>(
                fctBlockGraffitiClientDailyServiceList,
                { query },
                'fct_block_graffiti_client_daily',
                signal
              );
        })
      );
      return toClientCountRecords(chunks.flat(), true);
    },
    // A group waits for the bounds that say where its table starts
    enabled: !!currentNetwork && !(group && (groupBounds.isLoading || entityBounds.isLoading)),
    placeholderData: keepPreviousData,
  });

  const records = useMemo(() => query.data ?? [], [query.data]);
  // While another window loads, the previous window's records stay, keyed by their own bucket: days have dashes
  const recordsDaily = query.isPlaceholderData && records.length > 0 ? records[0].key.includes('-') : isDaily;

  const keys = useMemo(() => {
    const unique = [...new Set(records.map(record => record.key))].sort();
    return fillTimeKeys(unique, recordsDaily);
  }, [records, recordsDaily]);

  return { records, keys, isDaily: recordsDaily, isLoading: query.isLoading, error: query.error };
}
