import { useQuery } from '@tanstack/react-query'
import { getDataUrl } from '../config'

export const fetchData = async <T>(path: string): Promise<T> => {
  const response = await fetch(getDataUrl(path))
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }
  return response.json()
}

export const useDataFetch = <T>(path: string | null, options?: { silentFail?: boolean }) => {
  const { data, isLoading: loading, error } = useQuery<T, Error>({
    queryKey: ['data', path],
    queryFn: () => {
      if (!path) {
        throw new Error('No path provided')
      }
      return fetchData<T>(path)
    },
    enabled: !!path,
    retry: options?.silentFail ? false : 3,
  })

  return { data, loading, error }
} 