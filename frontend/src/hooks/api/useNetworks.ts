import { useQuery } from '@tanstack/react-query';
import { getRestApiClient } from '@/api';

/**
 * Hook to fetch list of available networks from the REST API
 * @param activeOnly - Whether to fetch only active networks
 * @returns Query result with networks data, loading state, and error
 */
export function useNetworks(activeOnly?: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['networks', activeOnly],
    queryFn: async () => {
      const client = await getRestApiClient();
      return client.getNetworks({ active_only: activeOnly });
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  return {
    networks: data?.networks,
    isLoading,
    error,
  };
}
