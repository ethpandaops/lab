import { useDataFetch } from '../../utils/data'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'

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
  const { data, loading, error } = useDataFetch<ContributorsData>('xatu/contributors.json')

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
      <XatuCallToAction />
      <div>
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">Contributors Over Time</h2>
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-4 h-[400px] border border-gray-800 shadow-xl">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                stroke="#94a3b8"
              />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                formatter={(value) => [value, 'Contributors']}
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0'
                }}
              />
              <Line
                type="monotone"
                dataKey="contributors"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">Top Client Versions</h2>
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg overflow-hidden border border-gray-800 shadow-xl">
          <table className="min-w-full divide-y divide-gray-800">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider bg-gray-900/50">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider bg-gray-900/50">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider bg-gray-900/50">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.top_client_versions.map((client, index) => (
                <tr key={index} className="hover:bg-cyan-500/10 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                    {client.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {client.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {client.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl">
          <h3 className="text-lg font-medium mb-2 text-gray-200">Total Contributors</h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
            {data.total_contributors.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl">
          <h3 className="text-lg font-medium mb-2 text-gray-200">Unique Clients</h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
            {data.unique_clients.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="text-sm text-gray-400">
        Last updated: {new Date(data.last_updated).toLocaleString()}
      </div>
    </div>
  )
} 