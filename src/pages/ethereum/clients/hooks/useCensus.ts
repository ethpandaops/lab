import { useMemo } from 'react';
import { censusList, type CensusTable } from '@/pages/ethereum/clients/api/client-models';
import { latestDay } from '@/pages/ethereum/clients/utils/census';
import { windowStart } from '@/pages/ethereum/clients/utils/client-versions';
import { useDailyByClient } from './useDailyByClient';

/** Days loaded to find the latest full day */
const LATEST_DAYS = 3;

export interface UseCensusResult<T> {
  /** Rows of every full day in the window */
  rows: T[];
  /** Rows of the latest full day */
  latest: T[];
  /** The latest full day (YYYY-MM-DD) */
  day: string | null;
  dataStart?: number;
  isLoading: boolean;
}

/**
 * A census table's rows matching `filters` over a window (the last few complete days when `from` is omitted, ending
 * yesterday unless `to` is earlier), with the latest day picked out. Pass null filters to skip loading.
 */
export function useCensus<T extends { day_start_date?: string; client?: string }>(
  table: CensusTable,
  filters: Record<string, unknown> | null,
  from?: number,
  to?: number
): UseCensusResult<T> {
  const start = useMemo(() => from ?? windowStart(LATEST_DAYS), [from]);
  const { rows, dataStart, isLoading } = useDailyByClient<T>(censusList(table), table, filters, start, to);
  const day = useMemo(() => latestDay(rows), [rows]);
  const latest = useMemo(() => rows.filter(row => row.day_start_date === day), [rows, day]);
  return { rows, latest, day, dataStart, isLoading };
}
