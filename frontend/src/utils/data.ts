import { useQuery } from '@tanstack/react-query';

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
