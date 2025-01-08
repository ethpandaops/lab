import { useEffect, useState } from 'react'

interface ContributorData {
  dates: string[]
  contributors: number[]
}

export const Contributors = () => {
  const [data, setData] = useState<ContributorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data/xatu-public-contributors/contributors_over_time.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch data')
        return res.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return <div>No data available</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Xatu Contributors</h2>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {data.contributors[data.contributors.length - 1]}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Active contributors in the last 24 hours
        </div>
      </div>
      {/* Add chart here once we have a charting library */}
    </div>
  )
} 