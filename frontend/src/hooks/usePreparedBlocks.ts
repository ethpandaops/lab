import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getRestApiClient } from '@/api';
import { GetRecentLocallyBuiltBlocksRequest } from '@/api/gen/backend/pkg/api/proto/lab_api_pb';
import {
  LocallyBuiltSlotBlocks,
  LocallyBuiltBlock,
} from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import {
  ListPreparedBlocksResponse,
  PreparedBlock,
} from '@/api/gen/backend/pkg/api/v1/proto/public_pb';
import { useSlotDataTracker } from '@/contexts/slotDataTracker';
import useApiMode from '@/contexts/apiMode';
import useApi from '@/contexts/api';
import { Timestamp } from '@bufbuild/protobuf';

interface UsePreparedBlocksOptions {
  network: string;
  slots?: number[]; // Required for REST API
  enabled?: boolean;
}

/**
 * Unified hook for fetching prepared blocks (formerly locally built blocks)
 * Automatically chooses between REST and gRPC based on the global API mode
 * Components using this hook don't need to know about the underlying implementation
 */
export function usePreparedBlocks({ network, slots, enabled = true }: UsePreparedBlocksOptions) {
  const { useRestApi } = useApiMode();
  const { client } = useApi();
  const { trackRequest, updateRequest } = useSlotDataTracker();

  // REST implementation
  const restQuery = useQuery<LocallyBuiltSlotBlocks[], Error>({
    queryKey: ['preparedBlocks', network, slots],
    placeholderData: keepPreviousData, // Keep showing old data while fetching new data
    queryFn: async () => {
      // Track request for debugging
      const requestId = trackRequest({
        slot: slots?.[0] || 0, // Use first slot for tracking
        network,
        apiMode: 'REST',
        endpoints: ['prepared/blocks'],
      });

      try {
        const client = await getRestApiClient();

        // Fetch all slots in a single request
        const response = await client.getPreparedBlocks(network, {
          slot: slots,
          page_size: 1000,
        });

        // Transform response to match existing data structure
        const slotBlocks: LocallyBuiltSlotBlocks[] = [];

        // Group blocks by slot
        const blocksBySlot = new Map<number, PreparedBlock[]>();
        if (response.preparedBlocks && Array.isArray(response.preparedBlocks)) {
          response.preparedBlocks.forEach((block: PreparedBlock) => {
            const slot = Number(block.slot);
            if (!blocksBySlot.has(slot)) {
              blocksBySlot.set(slot, []);
            }
            blocksBySlot.get(slot)!.push(block);
          });
        }

        // Convert to LocallyBuiltSlotBlocks structure
        blocksBySlot.forEach((blocks, slot) => {
          slotBlocks.push(
            new LocallyBuiltSlotBlocks({
              slot: BigInt(slot),
              blocks: blocks.map(block => transformRestToGrpc(block)),
            }),
          );
        });

        updateRequest(requestId, { payload: response.toJson() });
        return slotBlocks;
      } catch (error) {
        updateRequest(requestId, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    enabled: enabled && useRestApi && !!slots?.length, // Only run when REST API mode is enabled and slots provided
    staleTime: 5000,
    refetchInterval: 5000,
    retry: (failureCount, error) => {
      // Don't retry if no data found (404)
      if (error?.message?.includes('404')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  // gRPC-based implementation (fetches recent blocks)
  const grpcQuery = useQuery<LocallyBuiltSlotBlocks[], Error>({
    queryKey: ['preparedBlocks-grpc', network],
    queryFn: async () => {
      const requestId = trackRequest({
        slot: 0, // No specific slot for gRPC
        network,
        apiMode: 'gRPC',
      });

      try {
        const request = new GetRecentLocallyBuiltBlocksRequest({
          network: network,
        });

        const response = await client.getRecentLocallyBuiltBlocks(request);

        updateRequest(requestId, {
          payload: response.slotBlocks,
        });

        return response.slotBlocks;
      } catch (error) {
        updateRequest(requestId, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    enabled: enabled && !useRestApi,
    staleTime: 5000,
    refetchInterval: 5000,
  });

  // Return the appropriate query based on the mode
  if (useRestApi) {
    return {
      data: restQuery.data,
      isLoading: restQuery.isLoading && !restQuery.isPlaceholderData,
      isError: restQuery.isError,
      error: restQuery.error,
      refetch: restQuery.refetch,
      isRefetching: restQuery.isRefetching || (restQuery.isFetching && restQuery.isPlaceholderData),
    };
  } else {
    return {
      data: grpcQuery.data,
      isLoading: grpcQuery.isLoading,
      isError: grpcQuery.isError,
      error: grpcQuery.error,
      refetch: grpcQuery.refetch,
      isRefetching: grpcQuery.isRefetching,
    };
  }
}

// Helper to transform REST response to match existing gRPC structure
function transformRestToGrpc(preparedBlock: PreparedBlock): LocallyBuiltBlock {
  // Convert ISO 8601 string to protobuf Timestamp
  let slotStartDateTime: Timestamp | undefined;
  if (preparedBlock.slotStartTime) {
    const date = new Date(preparedBlock.slotStartTime);
    slotStartDateTime = Timestamp.fromDate(date);
  }

  return new LocallyBuiltBlock({
    slot: BigInt(preparedBlock.slot || 0),
    slotStartDateTime,
    metadata: {
      metaClientName: preparedBlock.client?.name,
      metaClientVersion: preparedBlock.client?.version,
      metaClientImplementation: preparedBlock.client?.implementation,
      metaConsensusImplementation: preparedBlock.consensus?.implementation,
      metaConsensusVersion: preparedBlock.consensus?.version,
      metaClientGeoCity: preparedBlock.geo?.city,
      metaClientGeoCountry: preparedBlock.geo?.country,
      metaClientGeoCountryCode: preparedBlock.geo?.countryCode,
    },
    blockVersion: preparedBlock.blockMetrics?.version,
    blockTotalBytes: preparedBlock.blockMetrics?.totalBytes,
    blockTotalBytesCompressed: preparedBlock.blockMetrics?.totalBytesCompressed,
    executionPayloadValue: preparedBlock.executionMetrics?.valueWei?.toString(),
    consensusPayloadValue: preparedBlock.executionMetrics?.consensusValueWei?.toString(),
    executionPayloadBlockNumber: BigInt(preparedBlock.executionMetrics?.blockNumber || 0),
    executionPayloadGasLimit: BigInt(preparedBlock.executionMetrics?.gasLimit?.toString() || 0),
    executionPayloadGasUsed: BigInt(preparedBlock.executionMetrics?.gasUsed?.toString() || 0),
    executionPayloadTransactionsCount: preparedBlock.executionMetrics?.transactionsCount,
    executionPayloadTransactionsTotalBytes: preparedBlock.executionMetrics?.transactionsTotalBytes,
  });
}
