import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSlotState, useSlotConfig, useSlotActions } from '@/hooks/useSlot';
import { useSlotData } from '@/hooks/useSlotData';
import { getRestApiClient } from '@/api';
import { GetSlotDataRequest } from '@/api/gen/backend/pkg/api/proto/lab_api_pb';
import { transformToBeaconSlotData } from '@/utils/slotDataTransformer';
import useBeacon from '@/contexts/beacon';
import useApiMode from '@/contexts/apiMode';
import useApi from '@/contexts/api';
import { useSlotDataTracker } from '@/contexts/slotDataTracker';

export function useSlotDataWithPreload(network: string, enabled = true) {
  const queryClient = useQueryClient();
  const { currentSlot, mode, isPlaying } = useSlotState();
  const { headSlot, safeSlot } = useSlotConfig();
  const actions = useSlotActions();
  const { getBeaconClock } = useBeacon();
  const { useRestApi } = useApiMode();
  const { client } = useApi();
  const { trackRequest, updateRequest } = useSlotDataTracker();

  const query = useSlotData({
    network,
    slot: currentSlot,
    isLive: true,
    enabled,
  });

  useEffect(() => {
    if (query.data) {
      actions.clearStalled();
      return;
    }

    if (mode === 'continuous' && isPlaying) {
      return;
    }

    const stallTimeoutId = setTimeout(() => {
      if (query.error && query.error.message?.includes('404')) {
        const latestAvailableSlot = safeSlot > 0 ? safeSlot : headSlot;
        if (currentSlot <= latestAvailableSlot) {
          actions.markStalled();
        }
      }
    }, 1000);

    return () => clearTimeout(stallTimeoutId);
  }, [query.error, query.data, actions, currentSlot, headSlot, safeSlot, mode, isPlaying]);

  useEffect(() => {
    if (mode !== 'continuous') return;

    const prefetchSlot = currentSlot + 1;

    const timeoutId = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: useRestApi
          ? ['slotData', network, prefetchSlot]
          : ['slotData-grpc', network, prefetchSlot],
        queryFn: async () => {
          // Track the prefetch request for debugging
          const requestId = trackRequest({
            slot: prefetchSlot,
            network,
            apiMode: useRestApi ? 'REST' : 'gRPC',
            endpoints: useRestApi
              ? [
                  'beacon/block',
                  'beacon/block/timing',
                  'beacon/blob/timing',
                  'beacon/blob/total',
                  'beacon/attestation/timing',
                  'beacon/attestation/correctness',
                  'beacon/proposer/entity',
                  'mev/block',
                  'mev/relay/count',
                  'mev/builder/bid',
                ]
              : undefined,
          });

          try {
            if (!useRestApi) {
              // gRPC mode prefetch
              const request = new GetSlotDataRequest({
                network: network,
                slot: BigInt(prefetchSlot),
              });
              const response = await client.getSlotData(request);

              // Update with success
              updateRequest(requestId, {
                payload: response.data?.toJson(),
              });

              return response;
            } else {
              // REST mode prefetch
              const restClient = await getRestApiClient();
              const beaconClock = getBeaconClock(network);
              const genesisTime = beaconClock ? beaconClock.getSlotStartTime(0) : undefined;

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
                restClient.getBeaconBlock(network, prefetchSlot),
                restClient.getBeaconBlockTiming(network, prefetchSlot),
                restClient.getBeaconBlobTiming(network, prefetchSlot),
                restClient.getBeaconBlobTotal(network, prefetchSlot),
                restClient.getBeaconAttestationTiming(network, prefetchSlot),
                restClient.getBeaconAttestationCorrectness(network, prefetchSlot),
                restClient.getBeaconProposerEntity(network, prefetchSlot),
                restClient.getMevBlock(network, prefetchSlot),
                restClient.getMevRelayCount(network, prefetchSlot),
                restClient.getMevBuilderBid(network, prefetchSlot),
              ]);

              const slotData = transformToBeaconSlotData({
                network,
                slot: prefetchSlot,
                genesisTime,
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

              return { data: slotData };
            }
          } catch (error) {
            // Update with error
            updateRequest(requestId, {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
          }
        },
      });
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [mode, currentSlot, network, queryClient, getBeaconClock, useRestApi, client]);

  return query;
}
