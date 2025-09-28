import { useQuery } from '@tanstack/react-query';
import { BeaconSlotData } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { GetSlotDataRequest } from '@/api/gen/backend/pkg/api/proto/lab_api_pb';
import { useBeaconSlotData } from './useBeaconSlotData';
import useApiMode from '@/contexts/apiMode';
import useApi from '@/contexts/api';

interface UseSlotDataOptions {
  network: string;
  slot?: number;
  isLive?: boolean;
  enabled?: boolean;
}

interface SlotDataResponse {
  data: BeaconSlotData;
}

/**
 * Unified hook for fetching beacon slot data
 * Automatically chooses between REST and gRPC based on the global API mode
 * Components using this hook don't need to know about the underlying implementation
 */
export function useSlotData({ network, slot, isLive = false, enabled = true }: UseSlotDataOptions) {
  const { useRestApi } = useApiMode();
  const { client } = useApi();

  // REST-based implementation
  const restQuery = useBeaconSlotData(network, slot, isLive, enabled && useRestApi);

  // gRPC-based implementation
  const grpcQuery = useQuery<SlotDataResponse, Error>({
    queryKey: ['slotData-grpc', network, slot],
    queryFn: async () => {
      if (!slot) {
        throw new Error('No slot provided');
      }

      const request = new GetSlotDataRequest({
        network: network,
        slot: BigInt(slot),
      });

      return client.getSlotData(request);
    },
    enabled: !!slot && enabled && !useRestApi,
    staleTime: 11000,
    refetchInterval: isLive ? 12000 : false,
    retry: (failureCount, error) => {
      if (error?.message?.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });

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
