import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { BeaconSlotData } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { GetSlotDataRequest } from '@/api/gen/backend/pkg/api/proto/lab_api_pb';
import { useBeaconSlotData } from './useBeaconSlotData';
import useApiMode from '@/contexts/apiMode';
import useApi from '@/contexts/api';
import { useSlotDataTracker } from '@/contexts/slotDataTracker';
import { useSlotProgress, useSlotState } from '@/hooks/useSlot';

interface UseSlotDataOptions {
  network: string;
  slot?: number;
  isLive?: boolean;
  enabled?: boolean;
  prefetchNext?: boolean; // Enable prefetch of next slot
  prefetchAt?: number; // When to trigger prefetch (ms into slot)
}

interface SlotDataResponse {
  data: BeaconSlotData;
}

/**
 * Unified hook for fetching beacon slot data
 * Automatically chooses between REST and gRPC based on the global API mode
 * Components using this hook don't need to know about the underlying implementation
 *
 * New: Supports automatic prefetching of next slot at specified time threshold
 */
export function useSlotData({
  network,
  slot,
  isLive = false,
  enabled = true,
  prefetchNext = false,
  prefetchAt = 8000, // Default to 8 seconds into slot
}: UseSlotDataOptions) {
  const { useRestApi } = useApiMode();
  const { client } = useApi();
  const { trackRequest, updateRequest } = useSlotDataTracker();
  const queryClient = useQueryClient();

  // Get slot timing info for prefetch logic
  const { slotProgress } = useSlotProgress();
  const { isPlaying, mode } = useSlotState();
  const hasPrefetchedRef = useRef(false);

  // REST-based implementation
  const restQuery = useBeaconSlotData(network, slot, isLive, enabled && useRestApi);

  // gRPC-based implementation
  const grpcQuery = useQuery<SlotDataResponse, Error>({
    queryKey: ['slotData-grpc', network, slot],
    queryFn: async () => {
      if (!slot) {
        throw new Error('No slot provided');
      }

      // Track the request
      const requestId = trackRequest({
        slot,
        network,
        apiMode: 'gRPC',
      });

      try {
        const request = new GetSlotDataRequest({
          network: network,
          slot: BigInt(slot),
        });

        const response = await client.getSlotData(request);

        // Update with success
        updateRequest(requestId, {
          payload: response.data?.toJson(),
        });

        return response;
      } catch (error) {
        // Update with error
        updateRequest(requestId, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    enabled: !!slot && enabled && !useRestApi,
    staleTime: 60000, // 60s - data stays fresh longer than refetch interval
    refetchInterval: isLive ? 20000 : false, // 20s - less aggressive polling
    placeholderData: previousData => previousData, // Keep showing previous data while refetching
    retry: (failureCount, error) => {
      if (error?.message?.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Prefetch logic for next slot
  useEffect(() => {
    // Only prefetch if enabled and conditions are met
    if (!prefetchNext || !isPlaying || mode !== 'continuous' || !slot || !enabled) {
      return;
    }

    // Reset prefetch flag when we're in a new slot (early in the slot)
    if (slotProgress < 1000) {
      hasPrefetchedRef.current = false;
    }

    // Check if we're in the prefetch window (e.g., 8000-8100ms)
    const inPrefetchWindow = slotProgress >= prefetchAt && slotProgress < prefetchAt + 100;

    if (!hasPrefetchedRef.current && inPrefetchWindow) {
      hasPrefetchedRef.current = true;
      const nextSlot = slot + 1;

      // Determine which query key to use based on API mode
      const queryKey = useRestApi
        ? ['slotData', network, nextSlot]
        : ['slotData-grpc', network, nextSlot];

      // Use fetchQuery instead of prefetchQuery to force fetch
      // prefetchQuery won't fetch if data is fresh, but fetchQuery will
      queryClient
        .fetchQuery({
          queryKey,
          queryFn: async () => {
            // Track the prefetch request
            const requestId = trackRequest({
              slot: nextSlot,
              network,
              apiMode: useRestApi ? 'REST' : 'gRPC',
            });

            try {
              if (useRestApi) {
                // For REST API, we need to replicate the logic from useBeaconSlotData
                // Since there's no single getBeaconSlotData method
                const { getRestApiClient } = await import('@/api');
                const { transformToBeaconSlotData } = await import('@/utils/slotDataTransformer');
                const restClient = await getRestApiClient();

                // Fetch all data sources in parallel - need ALL endpoints for transformer
                const [
                  blockResult,
                  blockTimingResult,
                  blobTimingResult,
                  blobTotalResult,
                  attestationTimingResult,
                  attestationCorrectnessResult,
                  proposerEntityResult,
                  mevBlockResult,
                  mevRelayResult,
                  mevBuilderResult,
                ] = await Promise.allSettled([
                  restClient.getBeaconBlock(network, nextSlot),
                  restClient.getBeaconBlockTiming(network, nextSlot),
                  restClient.getBeaconBlobTiming(network, nextSlot),
                  restClient.getBeaconBlobTotal(network, nextSlot),
                  restClient.getBeaconAttestationTiming(network, nextSlot),
                  restClient.getBeaconAttestationCorrectness(network, nextSlot),
                  restClient.getBeaconProposerEntity(network, nextSlot),
                  restClient.getMevBlock(network, nextSlot),
                  restClient.getMevRelayCount(network, nextSlot),
                  restClient.getMevBuilderBid(network, nextSlot),
                ]);

                // Transform the responses
                const slotData = transformToBeaconSlotData({
                  network,
                  slot: nextSlot,
                  blockResult,
                  blockTimingResult,
                  blobTimingResult,
                  blobTotalResult,
                  attestationTimingResult,
                  attestationCorrectnessResult,
                  proposerEntityResult,
                  mevBlockResult,
                  mevRelayResult,
                  mevBuilderResult,
                });

                // Update with success
                updateRequest(requestId, {
                  payload: slotData.toJson(),
                });

                return { data: slotData }; // Match the structure of the main query
              } else {
                // Use gRPC API - this will use the same logic as grpcQuery
                const request = new GetSlotDataRequest({
                  network: network,
                  slot: BigInt(nextSlot),
                });
                const response = await client.getSlotData(request);

                // Update with success
                updateRequest(requestId, {
                  payload: response.data?.toJson(),
                });

                return response;
              }
            } catch (error) {
              // Update with error
              updateRequest(requestId, {
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              throw error;
            }
          },
          staleTime: 60000, // Same as main query
        })
        .catch(error => {
          // Silently catch errors to prevent unhandled promise rejections
          // Errors are already tracked via updateRequest
        });
    }
  }, [
    prefetchNext,
    prefetchAt,
    slotProgress,
    isPlaying,
    mode,
    slot,
    enabled,
    network,
    useRestApi,
    queryClient,
    client,
    trackRequest,
    updateRequest,
  ]);

  // Return the appropriate query based on the mode
  // This provides a unified interface regardless of the underlying API
  if (useRestApi) {
    return {
      data: restQuery.data?.data,
      isLoading: restQuery.isLoading,
      isError: restQuery.isError,
      error: restQuery.error,
      refetch: restQuery.refetch,
      isRefetching: restQuery.isRefetching,
    };
  } else {
    return {
      data: grpcQuery.data?.data,
      isLoading: grpcQuery.isLoading,
      isError: grpcQuery.isError,
      error: grpcQuery.error,
      refetch: grpcQuery.refetch,
      isRefetching: grpcQuery.isRefetching,
    };
  }
}
