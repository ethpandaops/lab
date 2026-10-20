import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctDataColumnCompletionByPathDailyServiceList,
  fctDataColumnCompletionByPathHourlyServiceList,
  fctDataColumnPartialMessageDailyServiceList,
  fctDataColumnPartialMessageHourlyServiceList,
  fctPeerPartialMessageSupportByClientDailyServiceList,
  fctPeerPartialMessageSupportByClientHourlyServiceList,
} from '@/api/sdk.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { dailyDateValues } from '@/pages/ethereum/clients/utils/client-share';
import { PAGE_SIZE, QUERY_RETRIES, TIME_RANGE_CONFIG } from '../constants';
import type { PartialRecord, PathRecord, PeerRecord, TimePeriod } from '../IndexPage.types';
import { bucketKeys, toPartialRecords, toPathRecords, toPeerRecords } from '../utils/partial-columns';

type ListFn = Parameters<typeof fetchAllPages>[0];

export interface UsePartialColumnRollupsResult {
  pathRecords: PathRecord[];
  partialRecords: PartialRecord[];
  peerRecords: PeerRecord[];
  /** Every completion and partial message bucket in the window, gaps included */
  keys: string[];
  /** Every peer adoption bucket in the window, gaps included */
  peerKeys: string[];
  /** Whether the window uses daily buckets */
  isDaily: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Completion, partial message and peer adoption rollups for the period: hourly tables for short windows, daily for
 * long ones.
 */
export function usePartialColumnRollups(timePeriod: TimePeriod): UsePartialColumnRollupsResult {
  const { currentNetwork } = useNetwork();
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  // Hour aligned so the window always starts on a whole bucket.
  const hourlyStart = useMemo(() => {
    const hourNow = Math.floor(Date.now() / 1000 / 3600) * 3600;
    return hourNow - (config.days ?? 0) * 24 * 3600;
  }, [config.days]);

  const fetchRows = async <T>(
    hourly: { fn: ListFn; key: string },
    daily: { fn: ListFn; key: string },
    signal: AbortSignal
  ): Promise<T[]> => {
    if (!isDaily) {
      return fetchAllPages<T>(
        hourly.fn,
        {
          query: { hour_start_date_time_gte: hourlyStart, order_by: 'hour_start_date_time asc', page_size: PAGE_SIZE },
        },
        hourly.key,
        signal
      );
    }
    // The daily tables only filter their date key by value, so bounded windows list their dates.
    const dateFilter =
      config.days === null
        ? { day_start_date_like: '20%' }
        : { day_start_date_in_values: dailyDateValues(config.days) };
    return fetchAllPages<T>(
      daily.fn,
      { query: { ...dateFilter, order_by: 'day_start_date asc', page_size: PAGE_SIZE } },
      daily.key,
      signal
    );
  };

  const queryKey = ['partial-columns', currentNetwork?.name, timePeriod, isDaily ? 'daily' : hourlyStart];

  const paths = useQuery({
    queryKey: [...queryKey, 'paths'],
    queryFn: async ({ signal }) =>
      toPathRecords(
        await fetchRows(
          {
            fn: fctDataColumnCompletionByPathHourlyServiceList as ListFn,
            key: 'fct_data_column_completion_by_path_hourly',
          },
          {
            fn: fctDataColumnCompletionByPathDailyServiceList as ListFn,
            key: 'fct_data_column_completion_by_path_daily',
          },
          signal
        ),
        isDaily
      ),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
    retry: QUERY_RETRIES,
  });

  const partials = useQuery({
    queryKey: [...queryKey, 'partials'],
    queryFn: async ({ signal }) =>
      toPartialRecords(
        await fetchRows(
          { fn: fctDataColumnPartialMessageHourlyServiceList as ListFn, key: 'fct_data_column_partial_message_hourly' },
          { fn: fctDataColumnPartialMessageDailyServiceList as ListFn, key: 'fct_data_column_partial_message_daily' },
          signal
        ),
        isDaily
      ),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
    retry: QUERY_RETRIES,
  });

  const peers = useQuery({
    queryKey: [...queryKey, 'peers'],
    queryFn: async ({ signal }) =>
      toPeerRecords(
        await fetchRows(
          {
            fn: fctPeerPartialMessageSupportByClientHourlyServiceList as ListFn,
            key: 'fct_peer_partial_message_support_by_client_hourly',
          },
          {
            fn: fctPeerPartialMessageSupportByClientDailyServiceList as ListFn,
            key: 'fct_peer_partial_message_support_by_client_daily',
          },
          signal
        ),
        isDaily
      ),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
    retry: QUERY_RETRIES,
  });

  const pathRecords = useMemo(() => paths.data ?? [], [paths.data]);
  const partialRecords = useMemo(() => partials.data ?? [], [partials.data]);
  const peerRecords = useMemo(() => peers.data ?? [], [peers.data]);

  const keys = useMemo(
    () => bucketKeys([...pathRecords.map(r => r.key), ...partialRecords.map(r => r.key)], isDaily),
    [pathRecords, partialRecords, isDaily]
  );
  // Only buckets where some sentry reported subscription flags, so the share lines start where the data does.
  const peerKeys = useMemo(
    () =>
      bucketKeys(
        peerRecords.filter(r => r.subscribed > 0).map(r => r.key),
        isDaily
      ),
    [peerRecords, isDaily]
  );

  return {
    pathRecords,
    partialRecords,
    peerRecords,
    keys,
    peerKeys,
    isDaily,
    isLoading: paths.isLoading || partials.isLoading || peers.isLoading,
    error: paths.error ?? partials.error ?? peers.error ?? null,
  };
}
