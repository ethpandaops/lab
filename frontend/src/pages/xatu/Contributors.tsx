import { useState, useEffect } from 'react'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ContributorsData {
  contributors_over_time: {
    timestamps: string[]
    counts: number[]
  }
  top_client_versions: {
    client: string
    version: string
    count: number
  }[]
  total_contributors: number
  unique_clients: number
  last_updated: string
}

export const Contributors = () => {
  const [data, setData] = useState<ContributorsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/data/xatu/contributors.json')
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const jsonData = await response.json()
        setData(jsonData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <LoadingState message="Loading contributor data..." />
  }

  if (error) {
    return <ErrorState message="Failed to load contributor data" error={error} />
  }

  if (!data) {
    return <ErrorState message="No data available" />
  }

  // Transform data for the chart
  const chartData = data.contributors_over_time.timestamps.map((timestamp, index) => ({
    timestamp,
    contributors: data.contributors_over_time.counts[index]
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Contributors Over Time</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                formatter={(value) => [value, 'Contributors']}
              />
              <Line
                type="monotone"
                dataKey="contributors"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Top Client Versions</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.top_client_versions.map((client, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {client.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {client.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {client.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Total Contributors</h3>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {data.total_contributors.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Unique Clients</h3>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {data.unique_clients.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        Last updated: {new Date(data.last_updated).toLocaleString()}
      </div>
    </div>
  )
} 