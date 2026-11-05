import { useMemo, useRef } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { fetchAllPages } from '@/utils/api-pagination';
import { completeBucketEnd } from '@/utils/time';
import {
  UNRESOLVED_STATUSES,
  fctBlockGraffitiClientVersionByEntityDailyList,
  fctBlockGraffitiClientVersionByEntityHourlyList,
  fctBlockGraffitiClientVersionDailyList,
  fctBlockGraffitiClientVersionHourlyList,
} from '../api/client-models';
import { PAGE_SIZE } from '../constants';
import { entityQuery, type ClientLayer } from '../utils/client-share';
import { toVersionCounts, type VersionCount } from '../utils/client-versions';

const DAY = 86400;
/** Hourly windows load in chunks of this many days, in parallel */
const HOURLY_CHUNK_DAYS = 7;
/** Daily windows up to this long list their dates; longer ones load whole calendar years */
const MAX_LISTED_DAYS = 120;
/** First year with blocks on any network Lab serves */
const FIRST_YEAR = 2020;

export interface UseVersionCountsOptions {
  /** Daily or hourly counts, overall or per entity */
  grain: 'daily' | 'entity-daily' | 'hourly' | 'entity-hourly';
  client?: string;
  layer?: ClientLayer | null;
  /** An entity, or an entity group; per-entity grains only */
  entity?: string;
  /** Only rows that resolve to no release */
  unresolvedOnly?: boolean;
  /** Window start (unix seconds); all history when omitted */
  from?: number;
  /** Window end (unix seconds, exclusive); when omitted, the start of the hour or UTC day in progress */
  to?: number;
  enabled?: boolean;
}

export interface UseVersionCountsResult {
  rows: VersionCount[];
  /** First time the table has data for (unix seconds), when known */
  dataStart?: number;
  isLoading: boolean;
  error: Error | null;
}

export interface Chunk {
  key: string;
  query: Record<string, unknown>;
  /** Whether the chunk can still change */
  open: boolean;
}

/** YYYY-MM-DD of a unix time */
function isoDay(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** The queries a window splits into, each cached on its own so past chunks load once */
export function chunksFor(grain: UseVersionCountsOptions['grain'], from: number | undefined, to: number): Chunk[] {
  const now = Date.now() / 1000;
  if (grain === 'hourly' || grain === 'entity-hourly') {
    const start = Math.floor((from ?? to - 30 * DAY) / 3600) * 3600;
    const chunks: Chunk[] = [];
    for (let chunkStart = start; chunkStart < to; chunkStart += HOURLY_CHUNK_DAYS * DAY) {
      const chunkEnd = Math.min(to, chunkStart + HOURLY_CHUNK_DAYS * DAY);
      chunks.push({
        key: `${chunkStart}-${chunkEnd}`,
        query: { hour_start_date_time_gte: chunkStart, hour_start_date_time_lt: chunkEnd },
        open: chunkEnd > now - 2 * 3600,
      });
    }
    return chunks;
  }

  if (from !== undefined && (to - from) / DAY <= MAX_LISTED_DAYS) {
    const days: string[] = [];
    for (let day = Math.floor(from / DAY) * DAY; day < to; day += DAY) days.push(isoDay(day));
    return [{ key: days.join(','), query: { day_start_date_in_values: days.join(',') }, open: true }];
  }

  // No network Lab serves has blocks before FIRST_YEAR, so an earlier start (0 for all history) begins there
  const firstYear = Math.max(FIRST_YEAR, from === undefined ? FIRST_YEAR : new Date(from * 1000).getUTCFullYear());
  const lastYear = new Date((to - 1) * 1000).getUTCFullYear();
  const thisYear = new Date().getUTCFullYear();
  return Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i).map(year => {
    const open = year >= thisYear;
    if (year < lastYear) return { key: String(year), query: { day_start_date_like: `${year}%` }, open };
    // The year the window ends in lists its days, so the chunk stops where the window does
    const days: string[] = [];
    for (let day = Date.UTC(year, 0, 1) / 1000; day < to; day += DAY) days.push(isoDay(day));
    return { key: `${year}-${isoDay(to)}`, query: { day_start_date_in_values: days.join(',') }, open };
  });
}

/**
 * The last result whose chunks all loaded, returned while the chunks of a new window or filter load, so the page
 * keeps its content and height instead of swapping in a skeleton.
 */
export function useKeepPrevious<T extends { isLoading: boolean; settled: boolean }>(result: T): T {
  const previous = useRef<T | undefined>(undefined);
  if (result.settled) previous.current = result;
  return result.isLoading && previous.current ? previous.current : result;
}

/** Joins the chunk queries; module scoped so React Query only re-runs it when a chunk changes */
function combine(
  results: Array<UseQueryResult<VersionCount[]>>
): UseVersionCountsResult & { /** Whether every chunk loaded */ settled: boolean } {
  return {
    rows: results.flatMap(result => result.data ?? []),
    isLoading: results.some(result => result.isLoading),
    settled: results.length > 0 && results.every(result => result.isSuccess),
    error: (results.find(result => result.error)?.error as Error | undefined) ?? null,
  };
}

/**
 * Blocks per client version from the graffiti version tables, over a window or all history. Windows split into
 * cached chunks that load in parallel.
 */
export function useVersionCounts({
  grain,
  client,
  layer,
  entity,
  unresolvedOnly = false,
  from,
  to,
  enabled = true,
}: UseVersionCountsOptions): UseVersionCountsResult {
  const { currentNetwork } = useNetwork();
  const hourly = grain === 'hourly' || grain === 'entity-hourly';
  const end = useMemo(() => to ?? completeBucketEnd(hourly ? 'hour' : 'day'), [to, hourly]);
  const dataKey = {
    daily: 'fct_block_graffiti_client_version_daily',
    'entity-daily': 'fct_block_graffiti_client_version_by_entity_daily',
    hourly: 'fct_block_graffiti_client_version_hourly',
    'entity-hourly': 'fct_block_graffiti_client_version_by_entity_hourly',
  }[grain];
  // Start no earlier than the table's data, which may not reach back to genesis
  const bounds = useTableBounds(dataKey);
  const dataStart = bounds.data?.min;
  const start = from === undefined ? dataStart : dataStart === undefined ? from : Math.max(from, dataStart);
  const chunks = useMemo(() => chunksFor(grain, start, end), [grain, start, end]);
  const table = {
    daily: fctBlockGraffitiClientVersionDailyList,
    'entity-daily': fctBlockGraffitiClientVersionByEntityDailyList,
    hourly: fctBlockGraffitiClientVersionHourlyList,
    'entity-hourly': fctBlockGraffitiClientVersionByEntityHourlyList,
  }[grain];
  const filters = {
    ...(client && { client_eq: client }),
    ...(layer && { layer_eq: layer }),
    ...(entity && entityQuery(entity)),
    ...(unresolvedOnly && { release_status_in_values: UNRESOLVED_STATUSES.join(',') }),
  };

  const queried = useQueries({
    queries: chunks.map(chunk => ({
      queryKey: ['client-pages', 'version-counts', currentNetwork?.name, grain, filters, chunk.key],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        toVersionCounts(
          await fetchAllPages<Record<string, unknown>>(
            table,
            { query: { ...chunk.query, ...filters, page_size: PAGE_SIZE } },
            dataKey,
            signal
          )
        ),
      enabled: !!currentNetwork && enabled && !bounds.isLoading,
      staleTime: chunk.open ? 10 * 60 * 1000 : Infinity,
    })),
    combine,
  });
  const result = useKeepPrevious(queried);

  // Year chunks overrun a window; trim them to it
  const rows = useMemo(
    () => (from === undefined ? result.rows : result.rows.filter(row => row.time >= from && row.time < end)),
    [result.rows, from, end]
  );
  return { rows, dataStart, isLoading: result.isLoading || bounds.isLoading, error: result.error };
}
