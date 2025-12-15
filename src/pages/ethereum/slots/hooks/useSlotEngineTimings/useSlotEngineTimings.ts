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
  /** newPayload timing data for this slot */
  newPayload: FctEngineNewPayloadBySlot | null;
  /** newPayload per-EL-client breakdown for this slot */
  newPayloadByClient: FctEngineNewPayloadByElClient[];
  /** getBlobs timing data for this slot */
  getBlobs: FctEngineGetBlobsBySlot | null;
  /** getBlobs per-EL-client breakdown for this slot */
  getBlobsByClient: FctEngineGetBlobsByElClient[];
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
 * @param slot - The slot number to fetch engine timing data for
 * @returns Object containing engine timing data, loading state, and error state
 */
export function useSlotEngineTimings(slot: number): UseSlotEngineTimingsResult {
  const { currentNetwork } = useNetwork();

  const queries = useQueries({
    queries: [
      // newPayload timing for this slot
      {
        ...fctEngineNewPayloadBySlotServiceListOptions({
          query: {
            slot_eq: slot,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
      // newPayload per-EL-client for this slot
      {
        ...fctEngineNewPayloadByElClientServiceListOptions({
          query: {
            slot_eq: slot,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
      // getBlobs timing for this slot
      {
        ...fctEngineGetBlobsBySlotServiceListOptions({
          query: {
            slot_eq: slot,
          },
        }),
        enabled: !!currentNetwork && slot > 0,
      },
      // getBlobs per-EL-client for this slot
      {
        ...fctEngineGetBlobsByElClientServiceListOptions({
          query: {
            slot_eq: slot,
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

  const newPayloadList = queries[0].data?.fct_engine_new_payload_by_slot ?? [];
  const newPayloadByClient = queries[1].data?.fct_engine_new_payload_by_el_client ?? [];
  const getBlobsList = queries[2].data?.fct_engine_get_blobs_by_slot ?? [];
  const getBlobsByClient = queries[3].data?.fct_engine_get_blobs_by_el_client ?? [];

  const data: SlotEngineTimingsData = {
    newPayload: newPayloadList.length > 0 ? newPayloadList[0] : null,
    newPayloadByClient,
    getBlobs: getBlobsList.length > 0 ? getBlobsList[0] : null,
    getBlobsByClient,
  };

  return {
    data,
    isLoading: false,
    error: null,
  };
}
