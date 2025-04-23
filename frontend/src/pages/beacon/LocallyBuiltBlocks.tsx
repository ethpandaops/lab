import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody } from '../../components/common/Card'
import { NetworkContext } from '../../App'
import { useContext } from 'react'
import { getLabApiClient } from '../../api'
import { GetRecentLocallyBuiltBlocksRequest } from '../../api/gen/backend/pkg/api/proto/lab_api_pb'
import { LocallyBuiltSlotBlocks, LocallyBuiltBlock } from '../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { 
  LocallyBuiltBlocksDetail, 
  LocallyBuiltBlocksVisualization,
  LocallyBuiltBlocksTable,
  ClientPresenceHeatmap,
  BlockValueDistribution,
  TransactionBubbleChart
} from '../../components/beacon/LocallyBuiltBlocks'
import { 
  ChevronLeft, 
  BarChart2, 
  List, 
  RefreshCw, 
  Clock, 
  Grid3X3, 
  PieChart, 
  ScatterChart
} from 'lucide-react'
import { TabButton } from '../../components/common/TabButton'

// Refresh interval in milliseconds
const REFRESH_INTERVAL = 5000
// Maximum number of slots to keep in memory
const MAX_SLOTS = 64

type ViewMode = 'visualization' | 'table' | 'heatmap' | 'value-distribution' | 'bubble-chart'

interface ViewOption {
  id: ViewMode
  label: string
  icon: JSX.Element
  description: string
}

export function LocallyBuiltBlocks(): JSX.Element {
  const { selectedNetwork } = useContext(NetworkContext)
  const [data, setData] = useState<LocallyBuiltSlotBlocks[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState<boolean>(false)
  const [selectedBlock, setSelectedBlock] = useState<LocallyBuiltBlock | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('visualization')
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  // Define view options
  const viewOptions: ViewOption[] = [
    {
      id: 'visualization',
      label: 'Overview',
      icon: <BarChart2 className="w-4 h-4" />,
      description: 'Visual overview of locally built blocks'
    },
    {
      id: 'heatmap',
      label: 'Client Presence',
      icon: <Grid3X3 className="w-4 h-4" />,
      description: 'Heatmap showing client presence across slots'
    },
    {
      id: 'value-distribution',
      label: 'Value Distribution',
      icon: <PieChart className="w-4 h-4" />,
      description: 'Block value distribution by client'
    },
    {
      id: 'bubble-chart',
      label: 'Transaction Analysis',
      icon: <ScatterChart className="w-4 h-4" />,
      description: 'Block size vs transaction count analysis'
    },
    {
      id: 'table',
      label: 'Data Table',
      icon: <List className="w-4 h-4" />,
      description: 'Tabular view of all blocks'
    }
  ]

  // Function to fetch and merge data
  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setIsError(false)
      
      const client = await getLabApiClient()
      const request = new GetRecentLocallyBuiltBlocksRequest({
        network: selectedNetwork
      })
      
      const response = await client.getRecentLocallyBuiltBlocks(request)
      const newSlotBlocks = response.slotBlocks

      // If it's an initial load, just set the data
      if (isInitial || data.length === 0) {
        setData(newSlotBlocks)
      } else {
        // Otherwise, merge the new data with existing data
        setData(prevData => {
          // Create a map of existing slots by slot number for quick lookup
          const existingSlotMap = new Map(
            prevData.map(slotBlock => [slotBlock.slot, slotBlock])
          )
          
          // Process each new slot block
          newSlotBlocks.forEach(newSlotBlock => {
            const existingSlot = existingSlotMap.get(newSlotBlock.slot)
            
            if (existingSlot) {
              // If the slot already exists, add any new blocks that aren't already there
              const existingBlockIds = new Set(
                existingSlot.blocks.map(block => `${block.slot}-${block.metadata?.metaClientName}`)
              )
              
              newSlotBlock.blocks.forEach(newBlock => {
                const blockId = `${newBlock.slot}-${newBlock.metadata?.metaClientName}`
                if (!existingBlockIds.has(blockId)) {
                  existingSlot.blocks.push(newBlock)
                }
              })
            } else {
              // If it's a new slot, add it to the map
              existingSlotMap.set(newSlotBlock.slot, newSlotBlock)
            }
          })
          
          // Convert the map values back to an array and sort by slot (most recent first)
          const mergedData = Array.from(existingSlotMap.values())
            .sort((a, b) => Number(b.slot) - Number(a.slot))
          
          // Limit the size to prevent memory issues
          return mergedData.slice(0, MAX_SLOTS)
        })
      }
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching locally built blocks:', error)
      setIsError(true)
    } finally {
      if (isInitial) {
        setIsLoading(false)
      }
      setIsRefreshing(false)
    }
  }, [selectedNetwork, data.length])

  // Initial data fetch when network changes
  useEffect(() => {
    fetchData(true)
  }, [selectedNetwork]) // Only depend on selectedNetwork, not fetchData to avoid infinite loops

  // Set up automatic refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!selectedBlock) { // Only refresh when not viewing a specific block
        fetchData(false)
      }
    }, REFRESH_INTERVAL)

    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [fetchData, selectedBlock])

  const handleBack = () => {
    setSelectedBlock(null)
  }

  // Format the last updated time
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString()
  }

  // Manual refresh handler
  const handleManualRefresh = () => {
    if (!isRefreshing && !selectedBlock) {
      fetchData(false)
    }
  }

  // Render active view based on viewMode
  const renderActiveView = () => {
    switch(viewMode) {
      case 'visualization':
        return (
          <LocallyBuiltBlocksVisualization
            data={data}
            isLoading={isLoading}
            isError={isError}
          />
        )
      case 'table':
        return (
          <LocallyBuiltBlocksTable
            data={data}
            isLoading={isLoading}
            isError={isError}
            onSelectBlock={setSelectedBlock}
          />
        )
      case 'heatmap':
        return (
          <ClientPresenceHeatmap
            data={data}
            isLoading={isLoading}
          />
        )
      case 'value-distribution':
        return (
          <BlockValueDistribution
            data={data}
            isLoading={isLoading}
          />
        )
      case 'bubble-chart':
        return (
          <TransactionBubbleChart
            data={data}
            isLoading={isLoading}
          />
        )
      default:
        return (
          <LocallyBuiltBlocksVisualization
            data={data}
            isLoading={isLoading}
            isError={isError}
          />
        )
    }
  }

  // Find the current view option
  const currentView = viewOptions.find(option => option.id === viewMode) || viewOptions[0]

  return (
    <div className="space-y-6">
      {/* Hero Section with Page Header */}
      <div className="relative mb-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-base">
            <h1 className="text-3xl md:text-4xl font-sans font-black text-primary animate-text-shine">
              Locally Built Blocks
            </h1>
          </div>
        </div>
      </div>

      {/* Description Card */}
      <Card isPrimary className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent backdrop-blur-[2px]" />
        <CardBody className="relative">
          <p className="text-base md:text-lg font-mono text-secondary max-w-3xl leading-relaxed">
            This page shows blocks that were locally built by our sentry nodes. They are NOT canonical blocks, or even blocks that were broadcasted to the network.
            This data is useful for understanding if all clients are able to build blocks based on the contents of the mempool.
          </p>
        </CardBody>
      </Card>

      {selectedBlock ? (
        <div className="space-y-4">
          <div>
            <button 
              onClick={handleBack} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface/40 hover:bg-surface/60 rounded-md text-tertiary hover:text-primary transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-mono">Back to overview</span>
            </button>
          </div>
          <LocallyBuiltBlocksDetail block={selectedBlock} />
        </div>
      ) : (
        <div className="backdrop-blur-sm rounded-lg bg-surface/80">
          <div className="p-4 border-b border-subtle/30">
            {/* Block Stats and Last Updated with Manual Refresh */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div className="flex items-center gap-2 text-tertiary text-sm font-mono">
                <Clock className="w-3.5 h-3.5 text-accent/70" />
                <span>Last updated: {formatLastUpdated()}</span>
                <button 
                  onClick={handleManualRefresh} 
                  className={`p-1 rounded-full hover:bg-surface/60 transition-all duration-200 ${isRefreshing ? 'animate-spin text-accent' : 'text-tertiary hover:text-primary'}`}
                  disabled={isRefreshing}
                  title="Refresh data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-tertiary text-sm font-mono px-2 py-1 bg-surface/50 rounded-md">
                {data.length > 0 
                  ? `${data.reduce((sum, slotBlocks) => sum + slotBlocks.blocks.length, 0)} blocks across ${data.length} slots` 
                  : 'No data available'}
              </div>
            </div>

            {/* View Description */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                {currentView.icon}
                <h3 className="text-md font-sans font-bold text-primary">{currentView.label}</h3>
              </div>
              <p className="text-xs font-mono text-tertiary mt-1">{currentView.description}</p>
            </div>

            {/* Tabs for View Mode */}
            <div className="flex space-x-2 overflow-x-auto -mx-2 px-2 pb-2 scrollbar-thin scrollbar-thumb-subtle scrollbar-track-transparent">
              {viewOptions.map(option => (
                <TabButton
                  key={option.id}
                  isActive={viewMode === option.id}
                  onClick={() => setViewMode(option.id)}
                  label={option.label}
                  icon={option.icon}
                />
              ))}
            </div>
          </div>

          <div className="p-4">
            {/* Active View Content */}
            <div className="transition-opacity duration-300 ease-in-out">
              {renderActiveView()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 