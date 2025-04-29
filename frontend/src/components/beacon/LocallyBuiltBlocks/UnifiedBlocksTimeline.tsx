import { FC, useEffect, useState, useMemo } from 'react'
import { LocallyBuiltSlotBlocks, LocallyBuiltBlock } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { Clock, Database, Package, Cpu } from 'lucide-react'
import { Timestamp } from '@bufbuild/protobuf'
import { EXECUTION_CLIENTS, CONSENSUS_CLIENTS } from '@/constants/clients.ts'

// Simple timestamp formatter component
const FormattedTimestamp: FC<{ timestamp?: Timestamp }> = ({ timestamp }) => {
  if (!timestamp) return <span className="text-tertiary">-</span>
  
  const date = timestamp.toDate()
  const relativeTime = getRelativeTimeStr(date)
  
  return <span title={date.toLocaleString()}>{relativeTime}</span>
}

// Helper function to get relative time
const getRelativeTimeStr = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  if (diffSec < 5) {
    return 'just now'
  } else if (diffSec < 60) {
    return `${diffSec}s ago`
  } else if (diffMin < 60) {
    return `${diffMin}m ago`
  } else if (diffHour < 24) {
    return `${diffHour}h ago`
  } else if (diffDay < 30) {
    return `${diffDay}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

interface UnifiedBlocksTimelineProps {
  data: LocallyBuiltSlotBlocks[]
  isLoading: boolean
  onSelectBlock?: (block: LocallyBuiltBlock) => void
  currentSlot?: number | null
}

export const UnifiedBlocksTimeline: FC<UnifiedBlocksTimelineProps> = ({
  data,
  isLoading,
  onSelectBlock,
  currentSlot
}) => {
  const [timelineBlocks, setTimelineBlocks] = useState<{slot: string, blocks: LocallyBuiltBlock[], isPending: boolean}[]>([])
  
  // Process the most recent blocks for the timeline and client presence
  useEffect(() => {
    if (isLoading || data.length === 0) return
    
    // Sort data by slot (most recent first)
    const sortedData = [...data].sort((a, b) => Number(b.slot) - Number(a.slot))
    
    // Get the latest 7 slots for the timeline
    const latestSlots = sortedData.slice(0, 7)
    
    // Get the blocks for each slot
    const processedBlocks = latestSlots.map(slotBlock => ({
      slot: slotBlock.slot.toString(),
      blocks: slotBlock.blocks,
      isPending: slotBlock === sortedData[0] // Mark the most recent slot as pending
    }))
    
    setTimelineBlocks(processedBlocks)
  }, [data, isLoading])

  // Process client presence data for both execution and consensus clients
  const clientPresence = useMemo(() => {
    if (timelineBlocks.length === 0) return []
    
    return timelineBlocks.map(slotData => {
      // Process execution clients
      const executionCounts = new Map<string, number>()
      EXECUTION_CLIENTS.forEach(client => {
        executionCounts.set(client, 0)
      })
      
      // Process consensus clients
      const consensusCounts = new Map<string, number>()
      CONSENSUS_CLIENTS.forEach(client => {
        consensusCounts.set(client, 0)
      })
      
      // Count blocks by client
      slotData.blocks.forEach(block => {
        const clientName = block.metadata?.metaClientName
        if (!clientName) return
        
        // Find matching execution client
        const matchingExecution = EXECUTION_CLIENTS.find(c => 
          clientName.toLowerCase().includes(c.toLowerCase())
        )
        
        if (matchingExecution) {
          executionCounts.set(
            matchingExecution, 
            (executionCounts.get(matchingExecution) || 0) + 1
          )
        }
        
        // Find matching consensus client
        const matchingConsensus = CONSENSUS_CLIENTS.find(c => 
          clientName.toLowerCase().includes(c.toLowerCase())
        )
        
        if (matchingConsensus) {
          consensusCounts.set(
            matchingConsensus, 
            (consensusCounts.get(matchingConsensus) || 0) + 1
          )
        }
      })
      
      // Convert maps to arrays of clients with counts
      return {
        slot: slotData.slot,
        isPending: slotData.isPending,
        executionClients: Array.from(executionCounts.entries()).map(([name, count]) => ({ name, count })),
        consensusClients: Array.from(consensusCounts.entries()).map(([name, count]) => ({ name, count }))
      }
    })
  }, [timelineBlocks])

  // If loading or no data
  if (isLoading || timelineBlocks.length === 0) {
    return (
      <div className="p-4 bg-surface/30 backdrop-blur-sm rounded-lg border border-subtle/30 animate-pulse">
        <div className="flex justify-between items-start">
          <div className="text-sm font-mono text-tertiary">Loading timeline...</div>
        </div>
      </div>
    )
  }

  // Get a representative block for the slot
  const getRepresentativeBlock = (slot: string) => {
    const slotData = timelineBlocks.find(sb => sb.slot === slot)
    return slotData?.blocks[0] || null
  }

  // Calculate intensity based on count for cell coloring
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-surface/10'
    return count === 1 
      ? 'bg-accent/30 border border-accent/20' 
      : 'bg-accent/60 border border-accent/40'
  }

  // Reverse the timeline blocks once for reuse
  const reversedBlocks = [...clientPresence].reverse()

  return (
    <div className="p-4 bg-surface/30 backdrop-blur-sm rounded-lg border border-subtle/30">
      <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-subtle scrollbar-track-transparent">
        <div className="min-w-[700px]">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="w-24 pr-3 text-left pb-4 font-normal">
                  <div className="text-sm font-mono text-tertiary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent/70" />
                    <span>Timeline</span>
                  </div>
                </th>
                {reversedBlocks.map(({ slot, isPending }) => (
                  <th key={`header-${slot}`} className="text-center font-normal pb-2 align-bottom">
                    {isPending && (
                      <div className="mb-1">
                        <div className="inline-block bg-accent/20 text-accent px-2 py-0.5 rounded text-xs font-mono animate-pulse">
                          PENDING
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="w-24 pr-3 text-right"></th>
                {reversedBlocks.map(({ slot, isPending }) => {
                  const block = getRepresentativeBlock(slot)
                  if (!block) return <th key={`block-header-${slot}`}></th>
                  
                  return (
                    <th key={`block-header-${slot}`} className="pb-4">
                      <div 
                        className={`
                          cursor-pointer transition-all duration-200 
                          flex flex-col items-center
                          ${isPending ? 'scale-105' : ''}
                        `}
                        onClick={() => onSelectBlock && onSelectBlock(block)}
                      >
                        <div 
                          className={`
                            w-12 h-12 rounded-lg flex items-center justify-center
                            ${isPending 
                              ? 'bg-accent/20 border border-accent shadow-lg shadow-accent/10' 
                              : 'bg-surface/70 border border-subtle/50'}
                          `}
                        >
                          <Database className={`w-5 h-5 ${isPending ? 'text-accent' : 'text-tertiary'}`} />
                        </div>
                        <div className="mt-1 text-center">
                          <div className={`font-mono text-xs ${isPending ? 'text-accent font-bold' : 'text-secondary'}`}>
                            Slot {slot}
                          </div>
                          <div className="font-mono text-[10px] text-tertiary mt-1">
                            <FormattedTimestamp timestamp={block.slotStartDateTime} />
                          </div>
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {/* Section divider */}
              <tr>
                <td colSpan={reversedBlocks.length + 1} className="pt-2 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-accent/70" />
                    <span className="text-xs font-mono text-tertiary">Execution Clients</span>
                  </div>
                </td>
              </tr>
              
              {/* Execution clients */}
              {EXECUTION_CLIENTS.map(client => (
                <tr key={`el-${client}`}>
                  <td className="w-24 pr-3 text-right text-xs font-mono text-tertiary truncate py-1">
                    {client}
                  </td>
                  {reversedBlocks.map(({ slot, executionClients, isPending }) => {
                    const clientData = executionClients.find(c => c.name === client)
                    const count = clientData?.count || 0
                    
                    return (
                      <td key={`el-presence-${client}-${slot}`} className="px-1 py-1">
                        <div
                          className={`h-6 rounded-sm ${getIntensity(count)} transition-colors duration-200 flex items-center justify-center ${isPending ? 'animate-pulse' : ''}`}
                          title={`${count} ${client} block${count !== 1 ? 's' : ''} in slot ${slot}`}
                        >
                          {count > 0 && (
                            <span className="text-xs font-mono font-bold text-primary">
                              {count}
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              
              {/* Section divider */}
              <tr>
                <td colSpan={reversedBlocks.length + 1} className="pt-4 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-accent/70" />
                    <span className="text-xs font-mono text-tertiary">Consensus Clients</span>
                  </div>
                </td>
              </tr>
              
              {/* Consensus clients */}
              {CONSENSUS_CLIENTS.map(client => (
                <tr key={`cl-${client}`}>
                  <td className="w-24 pr-3 text-right text-xs font-mono text-tertiary truncate py-1">
                    {client}
                  </td>
                  {reversedBlocks.map(({ slot, consensusClients, isPending }) => {
                    const clientData = consensusClients.find(c => c.name === client)
                    const count = clientData?.count || 0
                    
                    return (
                      <td key={`cl-presence-${client}-${slot}`} className="px-1 py-1">
                        <div
                          className={`h-6 rounded-sm ${getIntensity(count)} transition-colors duration-200 flex items-center justify-center ${isPending ? 'animate-pulse' : ''}`}
                          title={`${count} ${client} block${count !== 1 ? 's' : ''} in slot ${slot}`}
                        >
                          {count > 0 && (
                            <span className="text-xs font-mono font-bold text-primary">
                              {count}
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}