import { FC, useState, useMemo } from 'react'
import { LocallyBuiltSlotBlocks } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { EXECUTION_CLIENTS, CONSENSUS_CLIENTS } from '@/constants/clients.ts'
import { ArrowLeftRight } from 'lucide-react'

interface ClientPresenceHeatmapProps {
  data: LocallyBuiltSlotBlocks[]
  isLoading: boolean
}

type ClientType = 'execution' | 'consensus'

export const ClientPresenceHeatmap: FC<ClientPresenceHeatmapProps> = ({ data, isLoading }) => {
  const [clientType, setClientType] = useState<ClientType>('execution')
  const [hoveredCell, setHoveredCell] = useState<{client: string, slot: string} | null>(null)

  // Process data for client presence
  const presenceData = useMemo(() => {
    if (isLoading || data.length === 0) return { clients: [], slots: [], presenceMap: new Map() }

    // Get the last 20 slots
    const SLOTS_TO_SHOW = 20
    const sortedData = [...data]
      .sort((a, b) => Number(b.slot) - Number(a.slot))
      .slice(0, SLOTS_TO_SHOW)
    
    const slots = sortedData.map(d => d.slot.toString())
    
    // Create a map of client presence in each slot
    const presenceMap = new Map<string, Map<string, number>>()
    
    // Set of all client names found
    const clientsFound = new Set<string>()
    
    sortedData.forEach(slotData => {
      const slotNum = slotData.slot.toString()
      
      // Group blocks by client
      const clientCounts = new Map<string, number>()
      
      slotData.blocks.forEach(block => {
        const clientName = block.metadata?.metaClientName
        if (!clientName) return
        
        // For execution clients
        if (clientType === 'execution') {
          const matchingClient = EXECUTION_CLIENTS.find(c => 
            clientName.toLowerCase().includes(c.toLowerCase())
          )
          if (matchingClient) {
            clientsFound.add(matchingClient)
            clientCounts.set(
              matchingClient, 
              (clientCounts.get(matchingClient) || 0) + 1
            )
          }
        } 
        // For consensus clients
        else {
          const matchingClient = CONSENSUS_CLIENTS.find(c => 
            clientName.toLowerCase().includes(c.toLowerCase())
          )
          if (matchingClient) {
            clientsFound.add(matchingClient)
            clientCounts.set(
              matchingClient, 
              (clientCounts.get(matchingClient) || 0) + 1
            )
          }
        }
      })
      
      presenceMap.set(slotNum, clientCounts)
    })
    
    // Use all client types or just the ones found in the data
    const clients = clientType === 'execution' 
      ? EXECUTION_CLIENTS
      : CONSENSUS_CLIENTS
    
    return { clients, slots, presenceMap }
  }, [data, isLoading, clientType])

  const toggleClientType = () => {
    setClientType(prev => prev === 'execution' ? 'consensus' : 'execution')
  }

  if (isLoading) {
    return (
      <div className="rounded-lg bg-surface/20 p-6">
        <div className="h-6 bg-active/30 rounded w-1/4 mb-6 animate-pulse"></div>
        <div className="animate-pulse">
          <div className="h-40 bg-active/20 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-surface/20 border border-subtle p-6">
        <div className="text-center">
          <p className="text-tertiary font-mono">No data available for heatmap</p>
        </div>
      </div>
    )
  }

  // Calculate max count for color intensity
  let maxCount = 0
  presenceData.presenceMap.forEach(clientMap => {
    clientMap.forEach(count => {
      maxCount = Math.max(maxCount, count)
    })
  })

  // Get intensity based on count
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-surface/10'
    const intensity = Math.min(Math.max(count / maxCount * 100, 10), 100)
    return `bg-accent/[${intensity.toFixed(0)}%] border border-accent/20`
  }

  // Get text for tooltip
  const getCellText = (client: string, slot: string) => {
    const count = presenceData.presenceMap.get(slot)?.get(client) || 0
    if (count === 0) return `No ${client} blocks in slot ${slot}`
    return `${count} ${client} block${count > 1 ? 's' : ''} in slot ${slot}`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-sans font-bold text-accent">Client Presence Heatmap</h4>
        <button 
          onClick={toggleClientType}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono bg-surface/40 hover:bg-surface/60 text-tertiary hover:text-primary rounded-md transition-all duration-200"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{clientType === 'execution' ? 'Execution Clients' : 'Consensus Clients'}</span>
        </button>
      </div>

      <div className="relative">
        {/* Tooltip */}
        {hoveredCell && (
          <div 
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-surface/90 backdrop-blur-sm border border-subtle px-3 py-1.5 rounded-md text-xs font-mono text-primary z-10 whitespace-nowrap"
          >
            {getCellText(hoveredCell.client, hoveredCell.slot)}
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Column headers (slots) */}
            <div className="flex mb-2">
              <div className="w-28"></div>
              {presenceData.slots.map(slot => (
                <div key={slot} className="flex-1 px-1 text-center">
                  <div className="text-xs font-mono text-tertiary rotate-[310deg] transform origin-left translate-y-5 truncate">
                    {slot}
                  </div>
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1">
              {presenceData.clients.map(client => (
                <div key={client} className="flex items-center">
                  <div className="w-28 pr-2 text-right text-sm font-mono text-tertiary truncate">
                    {client}
                  </div>
                  {presenceData.slots.map(slot => {
                    const count = presenceData.presenceMap.get(slot)?.get(client) || 0
                    return (
                      <div 
                        key={`${client}-${slot}`} 
                        className="flex-1 px-1"
                        onMouseEnter={() => setHoveredCell({ client, slot })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div 
                          className={`w-full h-6 rounded-sm ${getIntensity(count)} transition-colors duration-200 hover:border-accent/50 cursor-pointer`}
                          title={getCellText(client, slot)}
                        >
                          {count > 0 && (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-mono font-bold text-primary/80">
                              {count}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 