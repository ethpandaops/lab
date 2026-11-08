import { useMemo } from 'react';
import { useDailyByClient } from '@/pages/ethereum/clients/hooks/useDailyByClient';
import { windowStart } from '@/pages/ethereum/clients/utils/client-versions';
import type { fetchAllPages } from '@/utils/api-pagination';

type ListFn = Parameters<typeof fetchAllPages>[0];

export interface UseRangeDaysResult<T> {
  /** Rows of every full day in the range */
  rows: T[];
  isLoading: boolean;
}

const ALL = {};

/**
 * Every row of a daily table over the last `days` full days, or all its history when null. For tables of a few rows
 * a day, so a whole range stays within a few thousand rows.
 */
export function useRangeDays<T extends { day_start_date?: string }>(
  list: ListFn,
  table: string,
  days: number | null
): UseRangeDaysResult<T> {
  const from = useMemo(() => (days === null ? undefined : windowStart(days)), [days]);
  const { rows, isLoading } = useDailyByClient<T>(list, table, ALL, from);
  return { rows, isLoading };
}
