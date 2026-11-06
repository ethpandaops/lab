import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctEngineGetBlobsByElClientDailyServiceList,
  fctEngineNewPayloadByElClientDailyServiceList,
  fctEngineNewPayloadDurationPercentileWindowServiceList,
  fctEngineNewPayloadWinrateDailyServiceList,
  fctOpcodeCostByElClientDailyServiceList,
  fctOpcodeCostByElClientVersionServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineGetBlobsByElClientDaily,
  FctEngineNewPayloadByElClientDaily,
  FctEngineNewPayloadDurationPercentileWindow,
  FctEngineNewPayloadWinrateDaily,
  FctOpcodeCostByElClientDaily,
  FctOpcodeCostByElClientVersion,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { normalizeClientName } from '@/utils/ethereum';
import { PAGE_SIZE, REFERENCE_NODE_CLASS } from '../constants';
import { completeUtcDays, currentUtcDate } from '@/utils/time';
import { opcodeRowsFromDaily } from '../utils/client-versions';

export interface UseReferenceEngineResult {
  /** Daily engine_newPayload per version of the client on the reference nodes, oldest first */
  newPayload: FctEngineNewPayloadByElClientDaily[];
  /** engine_newPayload P50/P95 over the window per build line of the client on the reference nodes */
  linePercentiles: Map<string, { p50: number; p95: number }>;
  /** Daily engine_getBlobs per version of the client on the reference nodes */
  getBlobs: FctEngineGetBlobsByElClientDaily[];
  /** Daily newPayload wins of every client on the reference nodes */
  winrate: FctEngineNewPayloadWinrateDaily[];
  /** Opcode costs per version of the client on the reference nodes */
  opcodes: FctOpcodeCostByElClientVersion[];
  isLoading: boolean;
  error: Error | null;
}

/** Opcode fits from fewer hours are too noisy to compare versions */
const MIN_OPCODE_HOURS = 24;

const isClient = (client: string) => (row: { meta_execution_implementation?: string }) =>
  normalizeClientName(row.meta_execution_implementation ?? '') === client;

/**
 * Engine API timings, wins and opcode costs of an execution client on the EIP-7870 reference nodes, which run
 * on standardised hardware so versions compare fairly. Covers the last `days` UTC days, or every day when omitted.
 */
export function useReferenceEngine(
  client: string | undefined,
  enabled: boolean,
  days?: number
): UseReferenceEngineResult {
  const { currentNetwork } = useNetwork();
  const network = currentNetwork?.name;
  const on = !!currentNetwork && !!client && enabled;

  // The daily tables only filter their date key by value: list the window's dates, or match every complete date
  const dates = useMemo(() => (days ? completeUtcDays(days).join(',') : null), [days]);
  const today = useMemo(() => currentUtcDate(), []);
  const dateFilter = dates ? { day_start_date_in_values: dates } : { day_start_date_ne: today };
  const dailyQuery = { ...dateFilter, node_class_eq: REFERENCE_NODE_CLASS, page_size: PAGE_SIZE };

  const newPayload = useQuery({
    queryKey: ['client-pages', 'reference', 'new-payload', network, dates ?? today],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadByElClientDaily>(
        fctEngineNewPayloadByElClientDailyServiceList,
        { query: dailyQuery },
        'fct_engine_new_payload_by_el_client_daily',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const getBlobs = useQuery({
    queryKey: ['client-pages', 'reference', 'get-blobs', network, dates ?? today],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineGetBlobsByElClientDaily>(
        fctEngineGetBlobsByElClientDailyServiceList,
        { query: dailyQuery },
        'fct_engine_get_blobs_by_el_client_daily',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const percentiles = useQuery({
    queryKey: ['client-pages', 'reference', 'percentiles', network, days ?? 0],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadDurationPercentileWindow>(
        fctEngineNewPayloadDurationPercentileWindowServiceList,
        {
          query: {
            // Day windows end yesterday like the daily tables; 0 is all history
            window_grain_eq: 'day',
            window_length_in_values: String(days ?? 0),
            node_class_eq: REFERENCE_NODE_CLASS,
            status_eq: 'VALID',
            // Build-line and client rows only
            meta_execution_version_eq: '',
            page_size: PAGE_SIZE,
          },
        },
        'fct_engine_new_payload_duration_percentile_window',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const winrate = useQuery({
    queryKey: ['client-pages', 'reference', 'winrate', network, dates ?? today],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadWinrateDaily>(
        fctEngineNewPayloadWinrateDailyServiceList,
        { query: dailyQuery },
        'fct_engine_new_payload_winrate_daily',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const opcodes = useQuery({
    queryKey: ['client-pages', 'reference', 'opcodes', network, dates ?? today],
    // Over a window, daily fits of the window's days; otherwise each version's fit over its whole life
    queryFn: async ({ signal }): Promise<FctOpcodeCostByElClientVersion[]> =>
      dates
        ? opcodeRowsFromDaily(
            await fetchAllPages<FctOpcodeCostByElClientDaily>(
              fctOpcodeCostByElClientDailyServiceList,
              { query: dailyQuery },
              'fct_opcode_cost_by_el_client_daily',
              signal
            ),
            MIN_OPCODE_HOURS
          )
        : fetchAllPages<FctOpcodeCostByElClientVersion>(
            fctOpcodeCostByElClientVersionServiceList,
            {
              query: { node_class_eq: REFERENCE_NODE_CLASS, hour_count_gte: MIN_OPCODE_HOURS, page_size: PAGE_SIZE },
            },
            'fct_opcode_cost_by_el_client_version',
            signal
          ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return useMemo(
    () => ({
      newPayload: client
        ? (newPayload.data ?? [])
            .filter(isClient(client))
            .sort((a, b) => (a.day_start_date ?? '').localeCompare(b.day_start_date ?? ''))
        : [],
      linePercentiles: new Map(
        client
          ? (percentiles.data ?? [])
              .filter(row => isClient(client)(row) && row.meta_execution_build_line && (row.observation_count ?? 0) > 0)
              .map(row => [
                row.meta_execution_build_line ?? '',
                { p50: row.p50_duration_ms ?? 0, p95: row.p95_duration_ms ?? 0 },
              ])
          : []
      ),
      getBlobs: client ? (getBlobs.data ?? []).filter(isClient(client)) : [],
      winrate: winrate.data ?? [],
      opcodes: client ? (opcodes.data ?? []).filter(isClient(client)) : [],
      isLoading: newPayload.isLoading || percentiles.isLoading || opcodes.isLoading,
      error: newPayload.error ?? percentiles.error ?? opcodes.error ?? null,
    }),
    [client, newPayload, percentiles, getBlobs.data, winrate.data, opcodes]
  );
}
