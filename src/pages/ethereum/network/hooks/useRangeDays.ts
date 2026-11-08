import { useMemo } from 'react';
import { useDailyByClient } from '@/pages/ethereum/clients/hooks/useDailyByClient';
import { windowStart } from '@/pages/ethereum/clients/utils/client-versions';
import type { fetchAllPages } from '@/utils/api-pagination';
import { dayStart } from '../utils/network-census';

type ListFn = Parameters<typeof fetchAllPages>[0];

export interface UseRangeDaysResult<T> {
  /** Rows of every full day in the range */
  rows: T[];
  isLoading: boolean;
}

const ALL = {};

/**
 * Every row of a daily table matching `filters` over the last `days` full days, or all its history when null, from
 * `floor` at the earliest. For tables of a few rows a day, so a whole range stays within a few thousand rows. Pass
 * null filters to skip loading.
 */
export function useRangeDays<T extends { day_start_date?: string }>(
  list: ListFn,
  table: string,
  days: number | null,
  { filters = ALL, floor }: { filters?: Record<string, unknown> | null; floor?: string } = {}
): UseRangeDaysResult<T> {
  const from = useMemo(() => {
    const start = days === null ? undefined : windowStart(days);
    const lowest = floor ? dayStart(floor) : undefined;
    return start === undefined ? lowest : lowest === undefined ? start : Math.max(start, lowest);
  }, [days, floor]);
  const { rows, isLoading } = useDailyByClient<T>(list, table, filters, from);
  return { rows, isLoading: filters !== null && isLoading };
}
