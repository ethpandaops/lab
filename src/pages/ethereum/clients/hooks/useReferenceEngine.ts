import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fctEngineGetBlobsByElClientDailyServiceList,
  fctEngineNewPayloadByElClientDailyServiceList,
  fctEngineNewPayloadWinrateDailyServiceList,
  fctOpcodeCostByElClientVersionServiceList,
} from '@/api/sdk.gen';
import type {
  FctEngineGetBlobsByElClientDaily,
  FctEngineNewPayloadByElClientDaily,
  FctEngineNewPayloadWinrateDaily,
  FctOpcodeCostByElClientVersion,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { normalizeClientName } from '@/utils/ethereum';
import { PAGE_SIZE, REFERENCE_DAYS, REFERENCE_NODE_CLASS } from '../constants';
import { dailyDateValues } from '../utils/client-share';

export interface UseReferenceEngineResult {
  /** Daily engine_newPayload per version of the client on the reference nodes, oldest first */
  newPayload: FctEngineNewPayloadByElClientDaily[];
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
 * on standardised hardware so versions compare fairly.
 */
export function useReferenceEngine(client: string | undefined, enabled: boolean): UseReferenceEngineResult {
  const { currentNetwork } = useNetwork();
  const dates = useMemo(() => dailyDateValues(REFERENCE_DAYS), []);
  const network = currentNetwork?.name;
  const on = !!currentNetwork && !!client && enabled;

  const dailyQuery = { day_start_date_in_values: dates, node_class_eq: REFERENCE_NODE_CLASS, page_size: PAGE_SIZE };

  const newPayload = useQuery({
    queryKey: ['client-pages', 'reference', 'new-payload', network, dates],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadByElClientDaily>(
        fctEngineNewPayloadByElClientDailyServiceList,
        { query: dailyQuery },
        'fct_engine_new_payload_by_el_client_daily',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
  });
  const getBlobs = useQuery({
    queryKey: ['client-pages', 'reference', 'get-blobs', network, dates],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineGetBlobsByElClientDaily>(
        fctEngineGetBlobsByElClientDailyServiceList,
        { query: dailyQuery },
        'fct_engine_get_blobs_by_el_client_daily',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
  });
  const winrate = useQuery({
    queryKey: ['client-pages', 'reference', 'winrate', network, dates],
    queryFn: ({ signal }) =>
      fetchAllPages<FctEngineNewPayloadWinrateDaily>(
        fctEngineNewPayloadWinrateDailyServiceList,
        { query: dailyQuery },
        'fct_engine_new_payload_winrate_daily',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
  });
  const opcodes = useQuery({
    queryKey: ['client-pages', 'reference', 'opcodes', network, dates],
    queryFn: ({ signal }) =>
      fetchAllPages<FctOpcodeCostByElClientVersion>(
        fctOpcodeCostByElClientVersionServiceList,
        {
          query: {
            node_class_eq: REFERENCE_NODE_CLASS,
            last_seen_date_time_gte: Math.floor(Date.now() / 1000 / 86400) * 86400 - REFERENCE_DAYS * 86400,
            hour_count_gte: MIN_OPCODE_HOURS,
            page_size: PAGE_SIZE,
          },
        },
        'fct_opcode_cost_by_el_client_version',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
  });

  return useMemo(
    () => ({
      newPayload: client
        ? (newPayload.data ?? [])
            .filter(isClient(client))
            .sort((a, b) => (a.day_start_date ?? '').localeCompare(b.day_start_date ?? ''))
        : [],
      getBlobs: client ? (getBlobs.data ?? []).filter(isClient(client)) : [],
      winrate: winrate.data ?? [],
      opcodes: client ? (opcodes.data ?? []).filter(isClient(client)) : [],
      isLoading: newPayload.isLoading || opcodes.isLoading,
      error: newPayload.error ?? opcodes.error ?? null,
    }),
    [client, newPayload, getBlobs.data, winrate.data, opcodes]
  );
}
