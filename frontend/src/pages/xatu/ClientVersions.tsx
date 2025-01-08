import { useDataFetch } from '../../utils/data'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

interface ClientVersion {
  client_name: string
  client_version: string
  count: number
}

const COLORS = [
  '#22d3ee', // Cyan
  '#a855f7', // Purple
  '#f472b6', // Pink
  '#38bdf8', // Light Blue
  '#818cf8', // Indigo
  '#c084fc', // Purple
  '#34d399', // Emerald
  '#60a5fa', // Blue
]

export const ClientVersions = () => {
  const { data, loading, error } = useDataFetch<ClientVersion[]>('xatu-public-contributors/top_client_versions.json')

  if (loading) return <LoadingState message="Loading client version data..." />
  if (error) return <ErrorState message="Failed to load client version data" error={error} />
  if (!data?.length) return <ErrorState message="No data available" />

  // Calculate total nodes
  const totalNodes = data.reduce((sum, item) => sum + item.count, 0)

  // Aggregate data by client name
  const clientData = data.reduce((acc, item) => {
    const existing = acc.find((x) => x.client_name === item.client_name)
    if (existing) {
      existing.count += item.count
    } else {
      acc.push({
        client_name: item.client_name,
        count: item.count
      })
    }
    return acc
  }, [] as { client_name: string; count: number }[])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cyan-400">Client Versions</h2>

      {/* Summary Card */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl">
        <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
          {totalNodes.toLocaleString()}
        </div>
        <div className="text-sm text-gray-200">
          Total active nodes
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Client Distribution</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientData}
                  dataKey="count"
                  nameKey="client_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    value,
                    name
                  }) => {
                    const RADIAN = Math.PI / 180
                    const radius = 25 + innerRadius + (outerRadius - innerRadius)
                    const x = cx + radius * Math.cos(-midAngle * RADIAN)
                    const y = cy + radius * Math.sin(-midAngle * RADIAN)
                    const percent = ((value / totalNodes) * 100).toFixed(1)

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#e2e8f0"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                      >
                        {name} ({percent}%)
                      </text>
                    )
                  }}
                >
                  {clientData.map((entry, index) => (
                    <Cell
                      key={entry.client_name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0'
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    'Nodes'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Version Distribution</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 100,
                  bottom: 5
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#e2e8f0' }}
                  tickFormatter={(value) => value.toLocaleString()}
                  stroke="#94a3b8"
                />
                <YAxis
                  type="category"
                  dataKey="client_version"
                  tick={{ fill: '#e2e8f0' }}
                  width={100}
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0'
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    'Nodes'
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#22d3ee"
                  radius={[0, 4, 4, 0]}
                  label={{
                    position: 'right',
                    fill: '#e2e8f0',
                    formatter: (value: number) =>
                      `${((value / totalNodes) * 100).toFixed(1)}%`
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Versions Table */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg overflow-hidden border border-gray-800 shadow-xl">
        <table className="min-w-full divide-y divide-gray-800">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-cyan-500/10 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                  {item.client_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {item.client_version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {item.count.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {((item.count / totalNodes) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 