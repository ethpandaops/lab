import { useState, useEffect } from 'react'
import { getDataUrl } from '../config'

export const fetchData = async <T>(path: string): Promise<T> => {
  const response = await fetch(getDataUrl(path))
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }
  return response.json()
}

export const useDataFetch = <T>(path: string) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchDataFromPath = async () => {
      try {
        setLoading(true)
        const result = await fetchData<T>(path)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      } finally {
        setLoading(false)
      }
    }

    fetchDataFromPath()
  }, [path])

  return { data, loading, error }
} 