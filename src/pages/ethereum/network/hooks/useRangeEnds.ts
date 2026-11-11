import { useMemo } from 'react';
import { useDailyByClient } from '@/pages/ethereum/clients/hooks/useDailyByClient';
import { windowStart } from '@/pages/ethereum/clients/utils/client-versions';
import type { fetchAllPages } from '@/utils/api-pagination';
import { dayBounds, dayStart, isoDay, rangeStartDay } from '@/pages/ethereum/network/utils/network-census';

type ListFn = Parameters<typeof fetchAllPages>[0];

/** Days read to find a table's latest day, or its first day at or after the range start */
const SEARCH_DAYS = 2;

export interface UseRangeEndsResult<T> {
  /** Rows of the range's last full day */
  end: T[];
  /** Rows of the range's first day, null while unknown or when the range holds only its last day */
  start: T[] | null;
  endDay: string | null;
  startDay: string | null;
  isLoading: boolean;
}

/**
 * A daily table's rows on the first and last days of a range of `days` days (all history when null): the values
 * shown are those of the last day, compared with the first. Reads two or three days, never the range between.
 * `floor` keeps the range from starting on days that are not comparable. Pass null filters to skip loading.
 */
export function useRangeEnds<T extends { day_start_date?: string }>(
  list: ListFn,
  table: string,
  filters: Record<string, unknown> | null,
  days: number | null,
  floor?: string
): UseRangeEndsResult<T> {
  const latestFrom = useMemo(() => windowStart(SEARCH_DAYS), []);
  const latest = useDailyByClient<T>(list, table, filters, latestFrom);
  const endDay = useMemo(() => dayBounds(latest.rows).last, [latest.rows]);
  const end = useMemo(() => latest.rows.filter(row => row.day_start_date === endDay), [latest.rows, endDay]);

  const firstDay = latest.dataStart === undefined ? undefined : isoDay(latest.dataStart);
  const target = endDay ? rangeStartDay(endDay, days, firstDay, floor) : null;
  const single = target === null || target === endDay;
  const from = target ? dayStart(target) : undefined;
  const first = useDailyByClient<T>(
    list,
    table,
    single ? null : filters,
    from,
    from === undefined ? undefined : from + SEARCH_DAYS * 86400
  );
  const startDay = single ? null : dayBounds(first.rows).first;
  const start = useMemo(
    () => (startDay && startDay < (endDay ?? '') ? first.rows.filter(row => row.day_start_date === startDay) : null),
    [first.rows, startDay, endDay]
  );

  return {
    end,
    start,
    endDay,
    startDay: start ? startDay : null,
    isLoading: latest.isLoading || (!single && first.isLoading),
  };
}
