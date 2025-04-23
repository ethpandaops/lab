import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody } from '../../components/common/Card'
import { NetworkContext } from '../../App'
import { useContext } from 'react'
import { getLabApiClient } from '../../api'
import { GetRecentLocallyBuiltBlocksRequest } from '../../api/gen/backend/pkg/api/proto/lab_api_pb'
import { LocallyBuiltSlotBlocks, LocallyBuiltBlock } from '../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { LocallyBuiltBlocksDetail, LocallyBuiltBlocksVisualization } from '../../components/beacon/LocallyBuiltBlocks'
import { ChevronLeft, BarChart2, List } from 'lucide-react' // Added icons
import { TabButton } from '../../components/common/TabButton' // Import TabButton
import { LocallyBuiltBlocksTable } from '../../components/beacon/LocallyBuiltBlocks/LocallyBuiltBlocksTable' // Import Table

// Refresh interval in milliseconds
const REFRESH_INTERVAL = 5000
// Maximum number of slots to keep in memory
const MAX_SLOTS = 64

type ViewMode = 'visualization' | 'table'

export function LocallyBuiltBlocks(): JSX.Element {
  const { selectedNetwork } = useContext(NetworkContext)
  const [data, setData] = useState<LocallyBuiltSlotBlocks[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState<boolean>(false)
  const [selectedBlock, setSelectedBlock] = useState<LocallyBuiltBlock | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('visualization') // Add state for view mode

  // Function to fetch and merge data
  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true)
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

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card isPrimary className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
        <CardBody className="relative">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-primary">
              Locally Built Blocks
            </h1>
          </div>
          <p className="text-base md:text-lg font-mono text-secondary max-w-3xl">
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
              className="flex items-center gap-1 px-3 py-1.5 bg-surface/30 rounded-md text-tertiary hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-mono">Back to list</span>
            </button>
          </div>
          <LocallyBuiltBlocksDetail block={selectedBlock} />
        </div>
      ) : (
        <Card>
          <CardBody>
            {/* Block Stats and Last Updated */}
            <div className="flex justify-between items-center mb-4"> {/* Added mb-4 */}
              <div className="text-tertiary text-sm font-mono">
                Last updated: {formatLastUpdated()}
              </div>
              <div className="text-tertiary text-sm font-mono">
                {data.length > 0 ? `${data.reduce((sum, slotBlocks) => sum + slotBlocks.blocks.length, 0)} blocks across ${data.length} slots` : 'No data'}
              </div>
            </div>

            {/* Tabs for View Mode */}
            <div className="flex space-x-2 border-b border-subtle mb-6"> {/* Increased mb-6 */}
              <TabButton
                isActive={viewMode === 'visualization'}
                onClick={() => setViewMode('visualization')}
                label="Visualization"
                icon={<BarChart2 className="w-4 h-4" />}
              />
              <TabButton
                isActive={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                label="Table"
                icon={<List className="w-4 h-4" />}
              />
            </div>

            {/* Conditional Rendering based on View Mode */}
            {viewMode === 'visualization' && (
              <LocallyBuiltBlocksVisualization
                data={data}
                isLoading={isLoading}
                isError={isError}
              />
            )}
            {viewMode === 'table' && (
              <LocallyBuiltBlocksTable
                data={data}
                isLoading={isLoading}
                isError={isError}
                onSelectBlock={setSelectedBlock} // Pass handler to select block
              />
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
} 