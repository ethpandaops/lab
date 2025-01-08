import { useQuery } from '@tanstack/react-query'
import { getDataUrl } from '../config'

export const fetchData = async <T>(path: string): Promise<T> => {
  const response = await fetch(getDataUrl(path))
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }
  return response.json()
}

export const useDataFetch = <T>(path: string) => {
  const { data, isLoading: loading, error } = useQuery<T, Error>({
    queryKey: ['data', path],
    queryFn: () => fetchData<T>(path),
  })

  return { data, loading, error }
} 