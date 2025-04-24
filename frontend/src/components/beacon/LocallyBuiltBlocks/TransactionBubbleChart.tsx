import { FC, useMemo } from 'react'
import { LocallyBuiltSlotBlocks, LocallyBuiltBlock } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBytes } from '../../../utils/format'
import { EXECUTION_CLIENTS } from '../../../constants/clients'

interface TransactionBubbleChartProps {
  data: LocallyBuiltSlotBlocks[]
  isLoading: boolean
}

// Custom Tooltip for ScatterChart
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      client: string
      blockSize: number
      txCount: number
      value: number
      slot: string
    }
  }>
}

const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload
  
  return (
    <div className="bg-surface/90 backdrop-blur-sm border border-subtle shadow-md p-3 rounded text-xs font-mono">
      <p className="font-medium text-primary">{data.client}</p>
      <p className="text-tertiary">Slot: {data.slot}</p>
      <p className="text-tertiary">Size: {formatBytes(data.blockSize)}</p>
      <p className="text-tertiary">Transactions: {data.txCount}</p>
      <p className="text-tertiary">Value: {(data.value / 1e9).toFixed(4)} ETH</p>
    </div>
  )
}

// Custom Legend
interface LegendProps {
  payload?: Array<{
    value: string
    color: string
  }>
}

const CustomLegend: FC<LegendProps> = ({ payload }) => {
  if (!payload) return null
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono mt-1">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          ></div>
          <span className="text-tertiary truncate">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export const TransactionBubbleChart: FC<TransactionBubbleChartProps> = ({ data, isLoading }) => {
  // Process data for bubble chart
  const bubbleData = useMemo(() => {
    if (isLoading || data.length === 0) return []
    
    // Function to determine client category
    const getClientCategory = (block: LocallyBuiltBlock): string => {
      const clientName = block.metadata?.metaClientName?.toLowerCase() || ''
      
      for (const client of EXECUTION_CLIENTS) {
        if (clientName.includes(client.toLowerCase())) {
          return client
        }
      }
      
      return 'Other'
    }
    
    // Transform all blocks into data points
    const flattenedData = data.flatMap(slotBlocks => 
      slotBlocks.blocks.map(block => {
        const execValue = block.executionPayloadValue 
          ? Number(block.executionPayloadValue.toString()) 
          : 0
        const consValue = block.consensusPayloadValue 
          ? Number(block.consensusPayloadValue.toString()) 
          : 0
        
        return {
          slot: slotBlocks.slot.toString(),
          client: getClientCategory(block),
          blockSize: block.blockTotalBytes,
          txCount: block.executionPayloadTransactionsCount,
          value: execValue + consValue
        }
      })
    )
    
    // Group by client for the chart
    const clientMap = new Map<string, Array<{
      blockSize: number
      txCount: number
      value: number
      slot: string
    }>>()
    
    flattenedData.forEach(item => {
      if (!clientMap.has(item.client)) {
        clientMap.set(item.client, [])
      }
      
      clientMap.get(item.client)?.push({
        blockSize: item.blockSize,
        txCount: item.txCount,
        value: item.value,
        slot: item.slot
      })
    })
    
    return Array.from(clientMap.entries())
      .map(([client, points]) => ({
        client,
        data: points
      }))
  }, [data, isLoading])
  
  // Color map for clients
  const colorMap: Record<string, string> = {
    'Geth': '#6366f1',
    'Erigon': '#8b5cf6',
    'Nethermind': '#ec4899',
    'Besu': '#f43f5e',
    'Other': '#94a3b8'
  }
  
  if (isLoading) {
    return (
      <div className="rounded-lg bg-surface/20 p-6">
        <div className="h-6 bg-active/30 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="animate-pulse">
          <div className="h-60 bg-active/20 rounded-lg"></div>
        </div>
      </div>
    )
  }
  
  if (data.length === 0 || bubbleData.length === 0) {
    return (
      <div className="rounded-lg bg-surface/20 border border-subtle p-6">
        <div className="text-center">
          <p className="text-tertiary font-mono">No transaction data available</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-sans font-bold text-accent">Transaction Distribution By Client</h4>
      <p className="text-sm font-mono text-tertiary">
        Visualization of block size vs. transaction count, with bubble size representing block value
      </p>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 10, right: 30, bottom: 40, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-subtle/30" />
            <XAxis 
              type="number" 
              dataKey="blockSize" 
              name="Block Size" 
              unit=" bytes"
              tickFormatter={(value) => formatBytes(value).replace(' ', '')} 
              label={{ 
                value: 'Block Size', 
                position: 'bottom', 
                offset: 0,
                className: "fill-tertiary font-mono text-xs" 
              }}
              className="fill-tertiary font-mono text-xs"
            />
            <YAxis 
              type="number" 
              dataKey="txCount" 
              name="Transactions" 
              label={{ 
                value: 'Transaction Count', 
                angle: -90, 
                position: 'left',
                className: "fill-tertiary font-mono text-xs" 
              }}
              className="fill-tertiary font-mono text-xs"
            />
            <ZAxis 
              type="number" 
              dataKey="value" 
              range={[30, 400]} 
              name="Block Value" 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            
            {bubbleData.map((clientData, index) => (
              <Scatter 
                key={`scatter-${index}`}
                name={clientData.client} 
                data={clientData.data} 
                fill={colorMap[clientData.client] || '#6b7280'} 
                fillOpacity={0.6}
                stroke={colorMap[clientData.client] || '#6b7280'}
                strokeWidth={1}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="text-xs font-mono text-tertiary mt-2 text-center">
        Bubble size represents the total value of the block
      </div>
    </div>
  )
} 