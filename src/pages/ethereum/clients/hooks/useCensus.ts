import { useMemo } from 'react';
import { censusList, type CensusTable } from '../api/client-models';
import { latestFullDay } from '../utils/census';
import { windowStart } from '../utils/client-versions';
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
 * A census table's rows matching `filters` over a window (the last few days when `from` is omitted), with the
 * latest full day picked out. Pass null filters to skip loading.
 */
export function useCensus<T extends { day_start_date?: string; client?: string }>(
  table: CensusTable,
  filters: Record<string, unknown> | null,
  from?: number
): UseCensusResult<T> {
  const start = useMemo(() => from ?? windowStart(LATEST_DAYS), [from]);
  const { rows, dataStart, isLoading } = useDailyByClient<T>(censusList(table), table, filters, start);
  const day = useMemo(() => latestFullDay(rows), [rows]);
  // Today is still filling, so trends stop at the latest full day
  const fullRows = useMemo(() => (day ? rows.filter(row => (row.day_start_date ?? '') <= day) : rows), [rows, day]);
  const latest = useMemo(() => rows.filter(row => row.day_start_date === day), [rows, day]);
  return { rows: fullRows, latest, day, dataStart, isLoading };
}
