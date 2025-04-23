import { FC, useMemo } from 'react'
import { Card, CardBody } from '../../common/Card'
import { LocallyBuiltSlotBlocks } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from 'recharts'
import { ChartWithStats } from '../../charts/ChartWithStats'

interface LocallyBuiltBlocksVisualizationProps {
  data: LocallyBuiltSlotBlocks[]
  isLoading: boolean
  isError: boolean
}

// Define tooltip interfaces
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

export const LocallyBuiltBlocksVisualization: FC<LocallyBuiltBlocksVisualizationProps> = ({ 
  data, 
  isLoading, 
  isError
}) => {
  // Process data for client distribution
  const clientData = useMemo(() => {
    if (isLoading || isError || data.length === 0) return []
    
    const clientCounts: Record<string, number> = {}
    
    data.forEach(slotBlocks => {
      slotBlocks.blocks.forEach(block => {
        const clientName = block.metadata?.metaClientName || 'Unknown'
        clientCounts[clientName] = (clientCounts[clientName] || 0) + 1
      })
    })
    
    return Object.entries(clientCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data, isLoading, isError])

  // Process data for client rewards over time
  const clientRewardsOverTimeData = useMemo(() => {
    if (isLoading || isError || data.length === 0) return { timeData: [], clientNames: [] }
    
    // Sort data by slot to ensure it's in chronological order
    // Convert BigInt to Number for sorting
    const sortedData = [...data].sort((a, b) => {
      // Convert slot values to numbers for comparison
      return Number(a.slot) - Number(b.slot)
    })
    
    // Extract all client names for consistent colors
    const clientSet = new Set<string>()
    sortedData.forEach(slotBlocks => {
      slotBlocks.blocks.forEach(block => {
        const clientName = block.metadata?.metaClientName || 'Unknown'
        clientSet.add(clientName)
      })
    })
    const clientNames = Array.from(clientSet)
    
    // Create data points for each slot with clients and their rewards
    const timeData = sortedData.map(slotBlocks => {
      const slotData: Record<string, number | string> = {
        slot: Number(slotBlocks.slot),
        time: new Date(slotBlocks.blocks[0]?.slotStartDateTime?.toDate() || Date.now()).toISOString(),
      }
      
      // Initialize all clients with 0 rewards
      clientNames.forEach(client => {
        slotData[client] = 0
      })
      
      // Populate actual rewards
      slotBlocks.blocks.forEach(block => {
        const clientName = block.metadata?.metaClientName || 'Unknown'
        // Calculate combined reward (execution + consensus)
        const executionValue = block.executionPayloadValue ? Number(String(block.executionPayloadValue)) : 0
        const consensusValue = block.consensusPayloadValue ? Number(String(block.consensusPayloadValue)) : 0
        const totalValue = executionValue + consensusValue
        
        // Convert wei to ether for better visualization
        slotData[clientName] = parseFloat((totalValue / 1e18).toFixed(6))
      })
      
      return slotData
    })
    
    return { timeData, clientNames }
  }, [data, isLoading, isError])

  // Process data for location distribution
  const locationData = useMemo(() => {
    if (isLoading || isError || data.length === 0) return []
    
    const locationCounts: Record<string, number> = {}
    
    data.forEach(slotBlocks => {
      slotBlocks.blocks.forEach(block => {
        const location = block.metadata?.metaClientGeoCountry || 'Unknown'
        locationCounts[location] = (locationCounts[location] || 0) + 1
      })
    })
    
    return Object.entries(locationCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data, isLoading, isError])

  // Process data for block size distribution
  const blockSizeData = useMemo(() => {
    if (isLoading || isError || data.length === 0) return []
    
    const sizes = data.flatMap(slotBlocks => 
      slotBlocks.blocks.map(block => block.blockTotalBytes)
    )
    
    // Create size buckets
    const buckets: Record<string, number> = {
      '0-100KB': 0,
      '100-200KB': 0,
      '200-300KB': 0,
      '300-400KB': 0,
      '400-500KB': 0,
      '500KB+': 0
    }
    
    sizes.forEach(size => {
      const sizeKB = size / 1024
      
      if (sizeKB < 100) buckets['0-100KB']++
      else if (sizeKB < 200) buckets['100-200KB']++
      else if (sizeKB < 300) buckets['200-300KB']++
      else if (sizeKB < 400) buckets['300-400KB']++
      else if (sizeKB < 500) buckets['400-500KB']++
      else buckets['500KB+']++
    })
    
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
  }, [data, isLoading, isError])

  // Process data for transaction count distribution
  const txCountData = useMemo(() => {
    if (isLoading || isError || data.length === 0) return []
    
    const txCounts = data.flatMap(slotBlocks => 
      slotBlocks.blocks.map(block => block.executionPayloadTransactionsCount)
    )
    
    // Create count buckets
    const buckets: Record<string, number> = {
      '0-50': 0,
      '51-100': 0,
      '101-150': 0,
      '151-200': 0,
      '201-250': 0,
      '250+': 0
    }
    
    txCounts.forEach(count => {
      if (count < 50) buckets['0-50']++
      else if (count < 100) buckets['51-100']++
      else if (count < 150) buckets['101-150']++
      else if (count < 200) buckets['151-200']++
      else if (count < 250) buckets['201-250']++
      else buckets['250+']++
    })
    
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
  }, [data, isLoading, isError])

  // Calculate total stats
  const totalStats = useMemo(() => {
    if (isLoading || isError || data.length === 0) return {
      totalBlocks: 0,
      uniqueSlots: 0,
      avgBlocksPerSlot: 0,
      totalValue: 0
    }
    
    const totalBlocks = data.reduce((sum, slotBlocks) => sum + slotBlocks.blocks.length, 0)
    const uniqueSlots = data.length
    const avgBlocksPerSlot = totalBlocks / uniqueSlots
    
    let totalValue = 0
    data.forEach(slotBlocks => {
      slotBlocks.blocks.forEach(block => {
        if (block.executionPayloadValue) {
          totalValue += Number(String(block.executionPayloadValue))
        }
        if (block.consensusPayloadValue) {
          totalValue += Number(String(block.consensusPayloadValue))
        }
      })
    })
    
    return {
      totalBlocks,
      uniqueSlots,
      avgBlocksPerSlot,
      totalValue
    }
  }, [data, isLoading, isError])

  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', 
    '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', '#83a6ed', '#6a4c93'
  ]

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface/90 backdrop-blur-sm p-2 border border-subtle rounded-md shadow-lg">
          <p className="font-mono text-sm text-primary">{`${label}: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  // Custom tooltip for the rewards chart
  const RewardsTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface/90 backdrop-blur-sm p-2 border border-subtle rounded-md shadow-lg">
          <p className="font-mono text-sm text-primary mb-1">{`Slot: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="font-mono text-xs" style={{ color: entry.color }}>
              {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toFixed(6) : entry.value} ETH`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Format ETH value
  const formatEther = (value: number): string => {
    return (value / 1e18).toFixed(6) + ' ETH'
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="animate-pulse">
            <div className="h-6 bg-active rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-60 bg-active rounded"></div>
              <div className="h-60 bg-active rounded"></div>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-6">
            <p className="text-error font-mono">Error loading visualization data. Please try again.</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-6">
            <p className="text-tertiary font-mono">No data available for visualization.</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <Card>
        <CardBody>
          <h3 className="text-xl font-sans font-bold text-primary mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface/30 p-4 rounded-lg">
              <h4 className="text-sm font-mono text-tertiary mb-1">Total Blocks</h4>
              <p className="text-2xl font-sans font-bold text-primary">{totalStats.totalBlocks}</p>
            </div>
            <div className="bg-surface/30 p-4 rounded-lg">
              <h4 className="text-sm font-mono text-tertiary mb-1">Unique Slots</h4>
              <p className="text-2xl font-sans font-bold text-primary">{totalStats.uniqueSlots}</p>
            </div>
            <div className="bg-surface/30 p-4 rounded-lg">
              <h4 className="text-sm font-mono text-tertiary mb-1">Avg Blocks/Slot</h4>
              <p className="text-2xl font-sans font-bold text-primary">{totalStats.avgBlocksPerSlot.toFixed(2)}</p>
            </div>
            <div className="bg-surface/30 p-4 rounded-lg">
              <h4 className="text-sm font-mono text-tertiary mb-1">Total Value</h4>
              <p className="text-2xl font-sans font-bold text-accent">{formatEther(totalStats.totalValue)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Client Rewards Over Time (New Chart) */}
      <Card>
        <CardBody>
          <h3 className="text-xl font-sans font-bold text-primary mb-4">Client Rewards Over Time</h3>
          <div className="mb-2 text-sm font-mono text-tertiary">
            Combined consensus + execution rewards (ETH) for each client over time
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={clientRewardsOverTimeData.timeData}
                margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="slot" 
                  label={{ value: 'Slot', position: 'insideBottom', offset: -10 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Reward (ETH)', angle: -90, position: 'insideLeft' }} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<RewardsTooltip />} />
                <Legend />
                {clientRewardsOverTimeData.clientNames.map((client, index) => (
                  <Line
                    key={client}
                    type="monotone"
                    dataKey={client}
                    name={client}
                    stroke={COLORS[index % COLORS.length]}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Distribution */}
        <ChartWithStats
          title="Client Distribution"
          description="Distribution of blocks by client implementation"
          chart={
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {clientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          }
          series={clientData.map((item, index) => ({
            name: item.name,
            color: COLORS[index % COLORS.length],
            min: 0,
            max: item.value,
            avg: item.value,
            last: item.value
          }))}
        />

        {/* Location Distribution */}
        <ChartWithStats
          title="Location Distribution"
          description="Distribution of blocks by country"
          chart={
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={locationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {locationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          }
          series={locationData.map((item, index) => ({
            name: item.name,
            color: COLORS[index % COLORS.length],
            min: 0,
            max: item.value,
            avg: item.value,
            last: item.value
          }))}
        />

        {/* Block Size Distribution */}
        <ChartWithStats
          title="Block Size Distribution"
          description="Distribution of blocks by size"
          chart={
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={blockSizeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  tick={{ fontSize: 12 }}
                  height={60}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8884d8">
                  {blockSizeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
          series={blockSizeData.map((item, index) => ({
            name: item.name,
            color: COLORS[index % COLORS.length],
            min: 0,
            max: item.value,
            avg: item.value,
            last: item.value
          }))}
        />

        {/* Transaction Count Distribution */}
        <ChartWithStats
          title="Transaction Count Distribution"
          description="Distribution of blocks by transaction count"
          chart={
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={txCountData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  tick={{ fontSize: 12 }}
                  height={60}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#82ca9d">
                  {txCountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
          series={txCountData.map((item, index) => ({
            name: item.name,
            color: COLORS[index % COLORS.length],
            min: 0,
            max: item.value,
            avg: item.value,
            last: item.value
          }))}
        />
      </div>
    </div>
  )
} 