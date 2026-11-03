import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { fetchAllPages } from '@/utils/api-pagination';
import { PAGE_SIZE } from '../constants';
import { chunksFor } from './useVersionCounts';

type ListFn = Parameters<typeof fetchAllPages>[0];

export interface UseDailyByClientResult<T> {
  rows: T[];
  /** First day the table has data for (unix seconds), when known */
  dataStart?: number;
  isLoading: boolean;
  error: Error | null;
}

/** Joins the chunk queries */
function combine<T>(results: Array<UseQueryResult<T[]>>): Omit<UseDailyByClientResult<T>, 'dataStart'> {
  return {
    rows: results.flatMap(result => result.data ?? []),
    isLoading: results.some(result => result.isLoading),
    error: (results.find(result => result.error)?.error as Error | undefined) ?? null,
  };
}

/**
 * Every row of a daily table matching `filters` over a window, or all its history, in cached chunks. The window
 * ends now unless `to` (exclusive) is earlier. Pass null filters to skip loading.
 */
export function useDailyByClient<T extends { day_start_date?: string }>(
  list: ListFn,
  dataKey: string,
  filters: Record<string, unknown> | null,
  from: number | undefined,
  to?: number
): UseDailyByClientResult<T> {
  const { currentNetwork } = useNetwork();
  const now = useMemo(() => Math.ceil(Date.now() / 1000 / 600) * 600, []);
  const end = to !== undefined && to < now ? to : now;
  // Start no earlier than the table's data, which may not reach back to genesis
  const bounds = useTableBounds(dataKey);
  const dataStart = bounds.data?.min;
  const start = from === undefined ? dataStart : dataStart === undefined ? from : Math.max(from, dataStart);
  const chunks = useMemo(() => chunksFor('daily', start, end), [start, end]);

  const result = useQueries({
    queries: chunks.map(chunk => ({
      queryKey: ['client-pages', dataKey, currentNetwork?.name, filters, chunk.key],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchAllPages<T>(list, { query: { ...chunk.query, ...filters, page_size: PAGE_SIZE } }, dataKey, signal),
      enabled: !!currentNetwork && filters !== null && !bounds.isLoading,
      staleTime: chunk.open ? 10 * 60 * 1000 : Infinity,
    })),
    combine: combine<T>,
  });

  const fromDay = from === undefined ? '' : new Date(from * 1000).toISOString().slice(0, 10);
  const rows = useMemo(
    () => (fromDay ? result.rows.filter(row => (row.day_start_date ?? '') >= fromDay) : result.rows),
    [result.rows, fromDay]
  );
  return { rows, dataStart, isLoading: result.isLoading || bounds.isLoading, error: result.error };
}
