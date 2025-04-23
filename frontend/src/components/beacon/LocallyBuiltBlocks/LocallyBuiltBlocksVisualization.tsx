import { FC, useMemo } from 'react'
import { Card, CardBody } from '../../common/Card'
import { LocallyBuiltSlotBlocks } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, ScatterChart, Scatter, ZAxis } from 'recharts' // Added ScatterChart, Scatter, ZAxis
import { ChartWithStats } from '../../charts/ChartWithStats'
import { formatBytes } from '../../../utils/format' // Import formatBytes
import { EXECUTION_CLIENTS, CONSENSUS_CLIENTS } from '../../../constants/clients' // Import clients

interface LocallyBuiltBlocksVisualizationProps {
  data: LocallyBuiltSlotBlocks[]
  isLoading: boolean
  isError: boolean
}

// Define tooltip interfaces for different chart types
interface BasePayloadItem {
  color?: string;
}

interface BarLinePayloadItem extends BasePayloadItem {
  value: number;
  name: string;
}

interface ScatterPayloadItem extends BasePayloadItem {
  payload: {
    x: number;
    y: number;
    z: string;
  };
  // Scatter payload might also include dataKey, name, value directly on the item
  dataKey?: string;
  name?: string;
  value?: number | string | Array<number | string>;
}

type TooltipPayload = Array<BarLinePayloadItem | ScatterPayloadItem>;

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload;
  label?: string;
}

export const LocallyBuiltBlocksVisualization: FC<LocallyBuiltBlocksVisualizationProps> = ({
  data,
  isLoading,
  isError
}) => {
  // Process data for last 16 slots client presence
  const last16SlotsPresence = useMemo(() => {
    if (isLoading || isError || data.length === 0) return { execution: [], consensus: [], slotsShown: 0 };

    const SLOTS_TO_SHOW = 16; // Define the number of slots

    // Sort data descending by slot and take the last N
    const sortedData = [...data].sort((a, b) => Number(b.slot) - Number(a.slot));
    const lastSlotsData = sortedData.slice(0, SLOTS_TO_SHOW);
    const lastSlotNumbers = lastSlotsData.map(d => Number(d.slot));

    // Create a map of slot -> set of client names (lowercase) present in that slot
    const slotClientPresenceMap = new Map<number, Set<string>>();
    lastSlotsData.forEach(slotData => {
      const clientsInSlot = new Set<string>();
      slotData.blocks.forEach(block => {
        const clientName = block.metadata?.metaClientName?.toLowerCase();
        if (clientName) {
          clientsInSlot.add(clientName);
        }
      });
      slotClientPresenceMap.set(Number(slotData.slot), clientsInSlot);
    });

    // Helper function to check presence for a specific client across the last N slots
    const getClientPresenceArray = (clientName: string): boolean[] => {
      const lowerClientName = clientName.toLowerCase();
      return lastSlotNumbers.map(slotNum => {
        const clientsInSlot = slotClientPresenceMap.get(slotNum);
        // Check if any client string in the set includes the target client name
        return clientsInSlot ? [...clientsInSlot].some(cn => cn.includes(lowerClientName)) : false;
      });
    };

    const execution = EXECUTION_CLIENTS.map(client => ({
      name: client,
      presence: getClientPresenceArray(client),
    }));

    const consensus = CONSENSUS_CLIENTS.map(client => ({
      name: client,
      presence: getClientPresenceArray(client),
    }));

    return { execution, consensus, slotsShown: lastSlotNumbers.length }; // Return how many slots are actually shown
  }, [data, isLoading, isError]);


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

  // Process data for block size vs tx count scatter plot
  const scatterData = useMemo(() => {
    if (isLoading || isError || data.length === 0) return []

    return data.flatMap(slotBlocks =>
      slotBlocks.blocks.map(block => ({
        x: block.executionPayloadTransactionsCount, // Transaction Count
        y: block.blockTotalBytes, // Block Size
        z: block.metadata?.metaClientName || 'Unknown' // Client Name for color/tooltip
      }))
    )
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
          {/* Handle different tooltip structures */}
          {(() => {
            const item = payload[0];
            // Check if it's scatter chart payload (has nested payload with x, y, z)
            if (item && 'payload' in item && item.payload && 'x' in item.payload && 'y' in item.payload && 'z' in item.payload) {
              const scatterItem = item as ScatterPayloadItem;
              return (
                <>
                  <p className="font-mono text-sm text-primary mb-1">{`Client: ${scatterItem.payload.z}`}</p>
                  <p className="font-mono text-xs text-tertiary">{`Tx Count: ${scatterItem.payload.x}`}</p>
                  <p className="font-mono text-xs text-tertiary">{`Block Size: ${formatBytes(scatterItem.payload.y)}`}</p>
                </>
              );
            }
            // Check if it's bar/line chart payload (has value and name)
            else if (item && 'value' in item && 'name' in item) {
              const barLineItem = item as BarLinePayloadItem;
              return (
                <p className="font-mono text-sm text-primary">{`${label || barLineItem.name}: ${barLineItem.value}`}</p>
              );
            }
            return null; // Fallback if payload structure is unexpected
          })()}
        </div>
      )
    }
    return null
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

  const SLOTS_TO_SHOW = 16; // Define constant here as well for the indicator

  // Small component to render the N slot presence indicators
  const SlotPresenceIndicator: FC<{ presence: boolean[] }> = ({ presence }) => (
    <div className="flex space-x-0.5"> {/* Reduced space for more squares */}
      {/* Pending Slot Indicator */}
      <div
        key="pending"
        title="Current Slot (Pending)"
        className="w-2 h-3 rounded-sm bg-yellow-400 animate-pulse transition-all duration-300 ease-in-out" // Style for pending slot
      />
      {/* Past Slot Indicators */}
      {presence.map((present, index) => (
        <div
          key={`slot-${index}`}
          title={`Slot ${index + 1} ago: ${present ? 'Present' : 'Absent'}`}
          className={`w-2 h-3 rounded-sm ${present ? 'bg-success' : 'bg-surface'} transition-all duration-300 ease-in-out`} // Made slightly narrower, added transition
        />
      ))}
      {/* Pad with empty slots if less than N */}
      {Array.from({ length: Math.max(0, SLOTS_TO_SHOW - presence.length) }).map((_, index) => (
         <div
          key={`pad-${index}`}
          className="w-2 h-3 rounded-sm bg-subtle opacity-50 transition-all duration-300 ease-in-out" // Made slightly narrower, added transition
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Client Presence (Last N Slots) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="text-xl font-sans font-bold text-primary mb-4">Execution Client Presence (Last {last16SlotsPresence.slotsShown} Slots)</h3>
            <div className="space-y-2">
              {last16SlotsPresence.execution.map(client => (
                <div key={client.name} className="flex items-center justify-between">
                  <span className="font-mono text-sm text-primary mr-2">{client.name}</span> {/* Reduced margin */}
                  <SlotPresenceIndicator presence={client.presence} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-xl font-sans font-bold text-primary mb-4">Consensus Client Presence (Last {last16SlotsPresence.slotsShown} Slots)</h3>
             <div className="space-y-2">
              {last16SlotsPresence.consensus.map(client => (
                <div key={client.name} className="flex items-center justify-between">
                  <span className="font-mono text-sm text-primary mr-2">{client.name}</span> {/* Reduced margin */}
                  <SlotPresenceIndicator presence={client.presence} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Block Size vs. Transaction Count (Full Width) */}
       <ChartWithStats
          title="Block Size vs. Transaction Count"
          description="Relationship between block size and transaction count"
          chart={
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Transaction Count"
                  label={{ value: 'Transaction Count', position: 'insideBottom', offset: -10 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Block Size"
                  label={{ value: 'Block Size', angle: -90, position: 'insideLeft' }}
                  tickFormatter={formatBytes} // Use formatBytes for Y-axis ticks
                  tick={{ fontSize: 12 }}
                />
                <ZAxis type="category" dataKey="z" name="Client" />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Blocks" data={scatterData} fill="#8884d8">
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          }
          series={[]} // Add empty series prop to satisfy ChartWithStatsProps
        />

      {/* Other Distributions (Two Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Distribution */}
        <ChartWithStats
          title="Client Distribution"
          description="Distribution of blocks by client implementation"
          chart={
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={clientData}
                layout="vertical" // Use vertical layout for better label readability
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80} // Adjust width for labels
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8884d8">
                  {clientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
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
              <BarChart
                data={locationData}
                layout="vertical" // Use vertical layout
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80} // Adjust width for labels
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#82ca9d">
                  {locationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
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
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Size Range', position: 'insideBottom', offset: -5 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
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
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Tx Count Range', position: 'insideBottom', offset: -5 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
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