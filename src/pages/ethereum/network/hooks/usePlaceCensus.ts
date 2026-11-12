import { useMemo } from 'react';
import { censusList, type CensusTable } from '@/pages/ethereum/clients/api/client-models';
import { useDailyByClient } from '@/pages/ethereum/clients/hooks/useDailyByClient';
import { dayStart } from '@/pages/ethereum/network/utils/network-census';
import { useRangeEnds, type UseRangeEndsResult } from './useRangeEnds';

/** Census rows of one place: a client's peers on a day */
export type PlaceCensusRow = { day_start_date?: string; client?: string; peer_count?: number };

/** Which census a place comes from, and how to pick it out */
export interface PlaceKind<T extends PlaceCensusRow> {
  table: CensusTable;
  /** Query filter selecting the place */
  filter: Record<string, unknown>;
  /** Place a row belongs to */
  keyOf: (row: T) => string;
}

export interface PlaceCensus<T extends PlaceCensusRow> {
  /** The place's rows on the range's first and last days */
  place: UseRangeEndsResult<T>;
  /** Every place's rows on the range's first and last days */
  all: UseRangeEndsResult<T>;
  /** The place's rows on every day of the range */
  days: T[];
  isLoading: boolean;
}

/**
 * One country's or network's consensus peers over a range: every day of it for the chart (a few rows per day), and
 * every place's rows on the range's first and last days for its share and rank.
 */
export function usePlaceCensus<T extends PlaceCensusRow>(kind: PlaceKind<T>, rangeDays: number | null): PlaceCensus<T> {
  const list = censusList(kind.table);
  const place = useRangeEnds<T>(list, kind.table, kind.filter, rangeDays);
  const all = useRangeEnds<T>(list, kind.table, {}, rangeDays);
  // Wait for the range's first day before loading the days between
  const firstDay = all.isLoading ? null : (all.startDay ?? all.endDay);
  const from = firstDay ? dayStart(firstDay) : undefined;
  const series = useDailyByClient<T>(list, kind.table, firstDay ? kind.filter : null, from);

  const lastDay = all.endDay ?? '';
  const days = useMemo(() => series.rows.filter(row => (row.day_start_date ?? '') <= lastDay), [series.rows, lastDay]);

  return { place, all, days, isLoading: place.isLoading || all.isLoading };
}
