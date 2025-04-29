import { useState, useEffect, useCallback } from 'react'
import { NetworkContext } from '@/App'
import { useContext } from 'react'
import { getLabApiClient } from '@/api'
import { GetRecentLocallyBuiltBlocksRequest } from '@/api/gen/backend/pkg/api/proto/lab_api_pb'
import { LocallyBuiltSlotBlocks, LocallyBuiltBlock } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import {
  LocallyBuiltBlocksDetail,
  LocallyBuiltBlocksVisualization,
  LocallyBuiltBlocksTable,
  ClientPresenceHeatmap,
  UnifiedBlocksTimeline
} from '@/components/beacon/LocallyBuiltBlocks'
import {
  ChevronLeft,
  BarChart2,
  List,
  RefreshCw,
  Clock,
  ScatterChart
} from 'lucide-react'
import { TabButton } from '@/components/common/TabButton' // Assuming TabButton exists and accepts these props
import { BeaconClockManager } from '@/utils/beacon.ts'

// Refresh interval in milliseconds
const REFRESH_INTERVAL = 5000
// Maximum number of slots to keep in memory
const MAX_SLOTS = 64

type ViewMode = 'visualization' | 'table' | 'heatmap' | 'value-distribution' | 'bubble-chart'

interface ViewOption {
  id: ViewMode
  label: string
  icon: JSX.Element
  description: string // Kept for potential future use, though not displayed in header now
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
  const [currentSlot, setCurrentSlot] = useState<number | null>(null)

  // Define view options
  const viewOptions: ViewOption[] = [
    {
      id: 'visualization',
      label: 'Overview',
      icon: <BarChart2 className="w-4 h-4" />,
      description: 'Visual overview of locally built blocks'
    },
    {
      id: 'bubble-chart',
      label: 'Tx Analysis', // Shortened label for tabs
      icon: <ScatterChart className="w-4 h-4" />,
      description: 'Block size vs transaction count analysis'
    },
    {
      id: 'table',
      label: 'Data Table',
      icon: <List className="w-4 h-4" />,
      description: 'Tabular view of all blocks'
    }
    // Add other view options like heatmap, value-distribution if needed
  ]

  // Update current slot from wallclock
  useEffect(() => {
    const clock = BeaconClockManager.getInstance().getBeaconClock(selectedNetwork)
    if (!clock) return

    const updateSlot = () => {
      const slot = clock.getCurrentSlot()
      setCurrentSlot(slot)
    }

    updateSlot()
    const interval = setInterval(updateSlot, 1000)
    return () => clearInterval(interval)
  }, [selectedNetwork])

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
  }, [selectedNetwork, data.length]) // Added data.length dependency

  // Initial data fetch when network changes
  useEffect(() => {
    fetchData(true)
  }, [selectedNetwork]) // Only depend on selectedNetwork

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

  return (
    <div className="space-y-6">
      {selectedBlock ? (
        // Detail View
        <div className="space-y-4">
          {/* Back Button */}
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
        // Overview View
        <>
          {/* Integrated Contextual Header */}
          <div className="mb-6 p-4 bg-surface/50 rounded-lg border border-subtle">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Left: Title & Description */}
              <div>
                <h2 className="text-xl font-sans font-bold text-primary mb-1">Locally Built Blocks</h2>
                <p className="text-sm font-mono text-secondary max-w-3xl">
                  Blocks locally built by sentry nodes (not necessarily canonical/broadcasted). Useful for analyzing client block building capabilities based on mempool contents.
                </p>
              </div>
              {/* Right: Controls/Actions */}
              <div className="flex items-center gap-2">
              </div>
            </div>
            {/* Optional: Stats/Info Row */}
            <div className="mt-4 pt-3 border-t border-subtle/50 flex flex-wrap gap-x-4 gap-y-2 text-xs font-mono text-tertiary">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-accent/70" />
                <span>Last updated: {formatLastUpdated()}</span>
              </div>
            </div>
          </div>

          {/* Unified Blocks Timeline */}
          <UnifiedBlocksTimeline
            data={data}
            isLoading={isLoading}
            onSelectBlock={setSelectedBlock}
            currentSlot={currentSlot}
          />

        </>
      )}
    </div>
  )
}