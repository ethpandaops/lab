import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export const fetchData = async <T>(baseUrl: string, path: string): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  return response.json();
};

export const useDataFetch = <T>(
  baseUrl: string,
  path: string | null,
  options?: { silentFail?: boolean },
) => {
  console.log('useDataFetch', baseUrl, path);
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery<T, Error>({
    queryKey: ['data', path],
    queryFn: () => {
      if (!path) {
        throw new Error('No path provided');
      }
      return fetchData<T>(baseUrl, path);
    },
    enabled: !!path,
    retry: options?.silentFail ? false : 3,
  });

  return { data, loading, error };
};

/**
 * Hybrid data fetching hook that can fetch from either static JSON or REST API
 * based on a feature flag. This allows gradual migration from static to dynamic data sources.
 *
 * @param staticUrl - URL for the static JSON file
 * @param restFetcher - Function to fetch data from REST API
 * @param featureFlag - Whether to use REST API (true) or static JSON (false)
 * @param queryOptions - Additional react-query options
 * @returns Query result with data, loading state, and error
 */
export function useHybridDataFetch<T>(
  staticUrl: string,
  restFetcher?: () => Promise<T>,
  featureFlag?: boolean,
  queryOptions?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error>({
    queryKey: [featureFlag ? 'rest' : 'static', staticUrl],
    queryFn: async () => {
      if (featureFlag && restFetcher) {
        // Use REST API
        return await restFetcher();
      }
      // Use static JSON
      const response = await fetch(staticUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch static data: ${response.statusText}`);
      }
      return response.json();
    },
    ...queryOptions,
  });
}
