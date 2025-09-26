import { useQuery } from '@tanstack/react-query';
import { getRestApiClient } from '@/api';
import { transformToBeaconSlotData } from '@/utils/slotDataTransformer';
import { BeaconSlotData } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import useBeacon from '@/contexts/beacon';
import useApiMode from '@/contexts/apiMode';

/**
 * Custom hook to fetch and transform beacon slot data from multiple REST endpoints
 * This hook respects the global API mode setting from the ApiModeContext
 * When REST API mode is disabled globally, this hook will be disabled
 *
 * @param network - The network to fetch data for
 * @param slot - The slot number to fetch
 * @param isLive - Whether this is for live slot viewing (affects caching)
 * @param enabled - Whether the query should be enabled
 * @returns Query result with BeaconSlotData
 */
export function useBeaconSlotData(
  network: string,
  slot: number | undefined,
  isLive = false,
  enabled = true,
) {
  const { getBeaconClock } = useBeacon();
  const { useRestApi } = useApiMode();

  return useQuery<{ data: BeaconSlotData }, Error>({
    queryKey: ['slotData', network, slot],
    queryFn: async () => {
      if (!slot) {
        throw new Error('No slot provided');
      }

      const client = await getRestApiClient();

      // Get network-specific genesis time from beacon clock
      const beaconClock = getBeaconClock(network);
      const genesisTime = beaconClock ? beaconClock.getSlotStartTime(0) : undefined;

      // Fetch all data sources in parallel for performance
      // Using Promise.allSettled to handle partial failures gracefully
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
        client.getBeaconBlock(network, slot),
        client.getBeaconBlockTiming(network, slot),
        client.getBeaconBlobTiming(network, slot),
        client.getBeaconBlobTotal(network, slot),
        client.getBeaconAttestationTiming(network, slot),
        client.getBeaconAttestationCorrectness(network, slot),
        client.getBeaconProposerEntity(network, slot),
        client.getMevBlock(network, slot),
        client.getMevRelayCount(network, slot),
        client.getMevBuilderBid(network, slot),
      ]);

      // Log any failures for debugging
      const logFailure = (name: string, result: PromiseSettledResult<any>) => {
        if (result.status === 'rejected') {
          console.warn(`${name} fetch failed for slot ${slot}:`, result.reason);
        }
      };

      logFailure('Block data', blockResult);
      logFailure('Block timing', blockTimingResult);
      logFailure('Blob timing', blobTimingResult);
      logFailure('Blob total', blobTotalResult);
      logFailure('Attestation timing', attestationTimingResult);
      logFailure('Attestation correctness', attestationCorrectnessResult);
      logFailure('Proposer entity', proposerEntityResult);
      logFailure('MEV block', mevBlockResult);
      logFailure('MEV relay', mevRelayResult);
      logFailure('MEV builder', mevBuilderResult);

      // Transform all the responses into the expected BeaconSlotData format
      const slotData = transformToBeaconSlotData({
        network,
        slot,
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

      // Return in the same format as the original gRPC response
      return { data: slotData };
    },
    enabled: !!slot && enabled && useRestApi,
    // Dynamic stale time based on whether viewing live or historical slots
    staleTime: isLive ? 100 : 5 * 60 * 1000, // 100ms for live, 5 minutes for historical
    // Only refetch for live slots
    refetchInterval: isLive ? 12000 : false, // 12 seconds = 1 slot
    retry: (failureCount, error) => {
      // Don't retry if slot doesn't exist (404)
      if (error?.message?.includes('404')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}
