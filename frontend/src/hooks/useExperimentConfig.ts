import { useQuery } from '@tanstack/react-query';
import { getRestApiClient } from '@/api';
import { GetExperimentConfigResponse } from '@/api/gen/backend/pkg/api/v1/proto/public_pb';

interface DataAvailability {
  availableFromTimestamp: number;
  availableUntilTimestamp: number;
  minSlot: number;
  maxSlot: number;
  safeSlot: number;
  headSlot: number;
  hasData: boolean;
}

interface ExperimentConfig {
  id: string;
  enabled: boolean;
  networks: string[];
  dataAvailability: Record<string, DataAvailability>;
}

/**
 * Hook to fetch and manage experiment configuration
 * Provides data availability information for positioning and validation
 * Automatically refreshes every 12 seconds to keep bounds current
 */
export function useExperimentConfig(experimentId: string, network?: string) {
  const query = useQuery<ExperimentConfig, Error>({
    queryKey: ['experimentConfig', experimentId, network],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getExperimentConfig(experimentId);

      // Transform the response to a more usable format
      const config = response.experiment;
      if (!config) {
        throw new Error('Experiment config not found');
      }

      // Convert the data_availability map to a JS object
      const dataAvailability: Record<string, DataAvailability> = {};

      if (config.dataAvailability) {
        Object.entries(config.dataAvailability).forEach(([net, data]) => {
          dataAvailability[net] = {
            availableFromTimestamp: Number(data.availableFromTimestamp || 0),
            availableUntilTimestamp: Number(data.availableUntilTimestamp || 0),
            minSlot: Number(data.minSlot || 0),
            maxSlot: Number(data.maxSlot || 0),
            safeSlot: Number(data.safeSlot || 0),
            headSlot: Number(data.headSlot || 0),
            hasData: data.hasData || false,
          };
        });
      }

      // Log fresh config load for debugging
      console.debug('Fresh experiment config loaded:', {
        experimentId,
        networks: Object.keys(dataAvailability),
        ranges: Object.entries(dataAvailability).map(([net, data]) => ({
          network: net,
          range: `${data.minSlot}-${data.maxSlot}`,
          safeSlot: data.safeSlot,
        })),
      });

      return {
        id: config.id || '',
        enabled: config.enabled || false,
        networks: config.networks || [],
        dataAvailability,
      };
    },
    refetchInterval: 12000, // Refresh every 12 seconds (same as slot timing)
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });

  // Helper functions
  const getNetworkAvailability = (net?: string) => {
    if (!net || !query.data) return null;
    return query.data.dataAvailability[net];
  };

  const isSlotInRange = (slot: number, net?: string, tolerance = 5) => {
    const availability = getNetworkAvailability(net || network);
    if (!availability) return true; // Allow if no data

    // With smart polling, bounds should be fresh. Use tolerance for edge cases.
    const effectiveMaxSlot = availability.maxSlot + tolerance;
    return slot >= availability.minSlot && slot <= effectiveMaxSlot;
  };

  const getSafeSlot = (net?: string) => {
    const availability = getNetworkAvailability(net || network);
    return availability?.safeSlot || null;
  };

  const getDataStaleness = (net?: string) => {
    const availability = getNetworkAvailability(net || network);
    if (!availability) return null;

    // Real pipeline lag: how far behind is our data vs blockchain head
    const pipelineLagSlots = availability.headSlot - availability.maxSlot;
    const pipelineLagSeconds = pipelineLagSlots * 12; // 12 seconds per slot

    return {
      lagSlots: pipelineLagSlots,
      lagSeconds: pipelineLagSeconds,
      isStale: pipelineLagSlots > 10, // Consider stale if more than 10 slots behind
      message: pipelineLagSlots > 10 ? `Data pipeline is ${pipelineLagSlots} slots (${pipelineLagSeconds}s) behind head` : null,
    };
  };

  const isSlotBeyondAvailableData = (slot: number, net?: string) => {
    const availability = getNetworkAvailability(net || network);
    if (!availability) return false;
    return slot > availability.maxSlot;
  };


  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isReady: !query.isLoading && !query.error && !!query.data,
    getNetworkAvailability,
    isSlotInRange,
    getSafeSlot,
    getDataStaleness,
    isSlotBeyondAvailableData,
  };
}
