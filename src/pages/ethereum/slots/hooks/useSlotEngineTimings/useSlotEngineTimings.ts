import { useQueries } from '@tanstack/react-query';
import {
  fctEngineNewPayloadBySlotServiceListOptions,
  fctEngineNewPayloadByElClientServiceListOptions,
  fctEngineGetBlobsBySlotServiceListOptions,
  fctEngineGetBlobsByElClientServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
import type {
  FctEngineNewPayloadBySlot,
  FctEngineNewPayloadByElClient,
  FctEngineGetBlobsBySlot,
  FctEngineGetBlobsByElClient,
} from '@/api/types.gen';

export interface SlotEngineTimingsData {
  /** newPayload timing data for this slot (one row per status: VALID, INVALID, etc.) */
  newPayloadByStatus: FctEngineNewPayloadBySlot[];
  /** newPayload per-EL-client breakdown for this slot (one row per client per status) */
  newPayloadByClient: FctEngineNewPayloadByElClient[];
  /** getBlobs timing data for this slot (one row per status: SUCCESS, PARTIAL, etc.) */
  getBlobsByStatus: FctEngineGetBlobsBySlot[];
  /** getBlobs per-EL-client breakdown for this slot (one row per client per status) */
  getBlobsByClient: FctEngineGetBlobsByElClient[];
}

export interface UseSlotEngineTimingsOptions {
  /** The slot number to fetch engine timing data for */
  slot: number;
  /** If true, only include data from EIP-7870 reference nodes */
  referenceNodesOnly?: boolean;
}

export interface UseSlotEngineTimingsResult {
  data: SlotEngineTimingsData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch engine API timing data for a specific slot.
 * Fetches both newPayload and getBlobs timing data along with per-client breakdowns.
 *
 * @param options - Options including slot number and optional reference nodes filter
 * @returns Object containing engine timing data, loading state, and error state
 */
export function useSlotEngineTimings({
  slot,
  referenceNodesOnly = true,
}: UseSlotEngineTimingsOptions): UseSlotEngineTimingsResult {
  const { currentNetwork } = useNetwork();

  // Build node_class filter if reference nodes only is enabled
  const refNodeFilter = referenceNodesOnly ? { node_class_eq: 'eip7870-block-builder' } : {};

  const queries = useQueries({
    queries: [
      // newPayload timing for this slot
      {
        ...fctEngineNewPayloadBySlotServiceListOptions({
          query: {
            slot_eq: slot,
            ...refNodeFilter,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
      // newPayload per-EL-client for this slot
      {
        ...fctEngineNewPayloadByElClientServiceListOptions({
          query: {
            slot_eq: slot,
            ...refNodeFilter,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
      // getBlobs timing for this slot
      {
        ...fctEngineGetBlobsBySlotServiceListOptions({
          query: {
            slot_eq: slot,
            ...refNodeFilter,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
      // getBlobs per-EL-client for this slot
      {
        ...fctEngineGetBlobsByElClientServiceListOptions({
          query: {
            slot_eq: slot,
            ...refNodeFilter,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
    ],
  });

  const isLoading = queries.some(query => query.isLoading);
  const error = (queries.find(query => query.error)?.error as Error) || null;

  if (isLoading || error) {
    return {
      data: null,
      isLoading,
      error,
    };
  }

  const newPayloadByStatus = queries[0].data?.fct_engine_new_payload_by_slot ?? [];
  const newPayloadByClient = queries[1].data?.fct_engine_new_payload_by_el_client ?? [];
  const getBlobsByStatus = queries[2].data?.fct_engine_get_blobs_by_slot ?? [];
  const getBlobsByClient = queries[3].data?.fct_engine_get_blobs_by_el_client ?? [];

  const data: SlotEngineTimingsData = {
    newPayloadByStatus,
    newPayloadByClient,
    getBlobsByStatus,
    getBlobsByClient,
  };

  return {
    data,
    isLoading: false,
    error: null,
  };
}
