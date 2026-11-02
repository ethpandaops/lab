import { useMemo } from 'react';
import { CENSUS_TABLES, censusList, type CensusTable } from '../api/client-models';
import { censusSummaries, latestFullDay } from '../utils/census';
import type { ClientLayer, ClientSummary } from '../utils/client-share';
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

/** Per-client shares of one layer, counted by peers on the P2P network and by nodes in the ENR crawl */
export interface NodeWeightedShares {
  p2p: ClientSummary[];
  p2pDay: string | null;
  enr: ClientSummary[];
  enrDay: string | null;
  isLoading: boolean;
}

/**
 * The latest full day's client shares of a layer from the P2P census and the ENR crawl.
 */
export function useNodeWeightedShares(layer: ClientLayer | null): NodeWeightedShares {
  const p2p = useCensus<{ day_start_date?: string; client?: string; peer_count?: number }>(
    layer === 'execution' ? CENSUS_TABLES.elPeers : CENSUS_TABLES.clPeers,
    layer ? {} : null
  );
  const enr = useCensus<{ day_start_date?: string; client?: string; node_count?: number }>(
    layer === 'execution' ? CENSUS_TABLES.elReadiness : CENSUS_TABLES.clReadiness,
    layer ? {} : null
  );
  const p2pShares = useMemo(() => censusSummaries(p2p.latest, row => row.peer_count), [p2p.latest]);
  const enrShares = useMemo(() => censusSummaries(enr.latest, row => row.node_count), [enr.latest]);
  return {
    p2p: p2pShares,
    p2pDay: p2p.day,
    enr: enrShares,
    enrDay: enr.day,
    isLoading: p2p.isLoading || enr.isLoading,
  };
}
