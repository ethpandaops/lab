import { useQuery } from '@tanstack/react-query';
import { getRestApiClient, NodeFilters } from '@/api';
import { transformNodesToUIFormat, aggregateNodesFromNetworks } from '@/utils/transformers';
import { useNetwork } from '@/stores/appStore';

/**
 * Hook to fetch nodes for a specific network
 * @param network - Network name
 * @param filters - Optional filters for nodes
 * @returns Query result with transformed nodes data
 */
export function useNodes(network: string, filters?: NodeFilters) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['nodes', network, filters],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getNodes(network, filters);
      return transformNodesToUIFormat(response);
    },
    enabled: !!network,
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
  });

  return {
    nodes: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch nodes from all available networks (parallel calls)
 * @param filters - Optional filters for nodes
 * @returns Query result with aggregated nodes from all networks
 */
export function useAllNetworkNodes(filters?: NodeFilters) {
  const { availableNetworks } = useNetwork();

  const { data, isLoading, error } = useQuery({
    queryKey: ['nodes', 'all-networks', availableNetworks, filters],
    queryFn: async () => {
      const client = await getRestApiClient();
      // Parallel fetch from all networks
      const responses = await Promise.all(availableNetworks.map(network => client.getNodes(network, filters)));
      // Aggregate and transform all responses
      return aggregateNodesFromNetworks(responses, availableNetworks);
    },
    enabled: availableNetworks.length > 0,
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
  });

  return {
    nodes: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch nodes for a specific contributor/user from all networks
 * @param username - Username to filter by
 * @returns Query result with contributor's nodes from all networks
 */
export function useContributorNodes(username: string) {
  // Fetch contributor's nodes from all networks
  return useAllNetworkNodes({
    username: { eq: username },
  });
}
