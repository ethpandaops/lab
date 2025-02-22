import { useEffect, useMemo, useState } from 'react'
import { useDataFetch } from '../../utils/data'
import { ErrorState } from '../common/ErrorState'
import { GlobalMap } from './GlobalMap'
import { EventTimeline } from './EventTimeline'
import { BottomPanel } from './BottomPanel'
import { DataAvailabilityPanel } from './DataAvailabilityPanel'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useModal } from '../../contexts/ModalContext'

interface SlotData {
  slot: number
  block: {
    epoch: number
    execution_payload_transactions_count?: number
    block_total_bytes?: number
    execution_payload_base_fee_per_gas?: number
    execution_payload_gas_used?: number
    execution_payload_gas_limit?: number
    execution_payload_block_number?: number
  }
  proposer: {
    proposer_validator_index: number
  }
  entity?: string
  nodes: Record<string, {
    name: string
    username: string
    geo: {
      city: string
      country: string
      continent: string
    }
  }>
  timings: {
    block_seen?: Record<string, number>
    block_first_seen_p2p?: Record<string, number>
    blob_seen?: Record<string, Record<string, number>>
    blob_first_seen_p2p?: Record<string, Record<string, number>>
  }
  attestations?: {
    windows: Array<{
      start_ms: number
      end_ms: number
      validator_indices: number[]
    }>
    maximum_votes?: number
  }
}

interface SlotViewProps {
  slot?: number
  network?: string
  isLive?: boolean
  onSlotComplete?: () => void
}

interface AttestationWindow {
  start_ms: number
  end_ms: number
  validator_indices: number[]
}

interface BlockEvent {
  type: 'block_seen'
  time: number
  node: string
  source: 'p2p' | 'api'
}

interface AttestationProgress {
  time: number
  validatorCount: number
  totalValidators: number
}

interface TimingData {
  [node: string]: number
}

interface BlobTimingData {
  [node: string]: {
    [index: string]: number
  }
}

interface SlotTimings {
  block_seen?: TimingData
  block_first_seen_p2p?: TimingData
  blob_seen?: BlobTimingData
  blob_first_seen_p2p?: BlobTimingData
}

interface AttestationPoint {
  time: number;
  totalValidators: number;
}

interface Event {
  id: string
  timestamp: number
  type: string
  node: string
  location: string
  data: any
}

export function SlotView({ slot, network = 'mainnet', isLive = false, onSlotComplete }: SlotViewProps): JSX.Element {
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(isLive)
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false)
  const navigate = useNavigate()
  const { showModal } = useModal()

  // Skip data fetching if no slot is provided
  const slotPath = slot ? `beacon/slots/${network}/${slot}.json` : null
  const nextSlotPath = slot ? `beacon/slots/${network}/${slot + 1}.json` : null

  const { data: slotData, loading: isLoading, error } = useDataFetch<SlotData>(slotPath)
  // Optimistically fetch next slot data when we're close to the end
  const { data: nextSlotData } = useDataFetch<SlotData>(
    currentTime >= 11000 ? nextSlotPath : null, 
    { silentFail: true } as any // TODO: Update useDataFetch to accept options
  )

  // Timer effect for playback
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        // Round to nearest 100ms for smoother updates
        const next = Math.floor((prev + 100) / 100) * 100
        if (next >= 12000) { // 12 seconds
          clearInterval(interval)
          onSlotComplete?.()
          return 12000
        }
        return next
      })
    }, 100) // Update every 100ms instead of every frame

    return () => clearInterval(interval)
  }, [isPlaying, onSlotComplete])

  // Reset timer when slot changes
  useEffect(() => {
    setCurrentTime(0)
    setIsPlaying(isLive)
  }, [slot, isLive])

  const totalValidators = slotData?.attestations?.windows?.reduce((sum, window) => 
    sum + window.validator_indices.length, 0) || 0
  const maxPossibleValidators = slotData?.attestations?.maximum_votes || 0
  const attestationThreshold = Math.ceil(maxPossibleValidators * 0.66)

  const { firstBlockSeen, firstApiBlockSeen, firstP2pBlockSeen, attestationProgress } = useMemo(() => {
    if (!slotData) return { firstBlockSeen: null, firstApiBlockSeen: null, firstP2pBlockSeen: null, attestationProgress: [] }

    // Find first block seen event
    let firstBlock: BlockEvent | null = null
    let firstApiBlock: BlockEvent | null = null
    let firstP2pBlock: BlockEvent | null = null
    
    // Check P2P events
    const p2pEvents = slotData.timings.block_first_seen_p2p || {}
    const p2pTimes = Object.values(p2pEvents)
    const firstP2pTime = p2pTimes.length > 0 ? Math.min(...p2pTimes) : Infinity
    const firstP2pNode = Object.entries(p2pEvents).find(([_, time]) => time === firstP2pTime)?.[0]

    // Check API events
    const apiEvents = slotData.timings.block_seen || {}
    const apiTimes = Object.values(apiEvents)
    const firstApiTime = apiTimes.length > 0 ? Math.min(...apiTimes) : Infinity
    const firstApiNode = Object.entries(apiEvents).find(([_, time]) => time === firstApiTime)?.[0]

    // Set first API block if exists
    if (firstApiNode) {
      firstApiBlock = {
        type: 'block_seen',
        time: firstApiTime,
        node: firstApiNode,
        source: 'api'
      }
    }

    // Set first P2P block if exists
    if (firstP2pNode) {
      firstP2pBlock = {
        type: 'block_seen',
        time: firstP2pTime,
        node: firstP2pNode,
        source: 'p2p'
      }
    }

    // Use API event if it's first, otherwise use P2P event for the combined firstBlockSeen
    if (firstApiNode && (!firstP2pNode || firstApiTime < firstP2pTime)) {
      firstBlock = firstApiBlock
    } else if (firstP2pNode) {
      firstBlock = firstP2pBlock
    }

    // Process attestations into cumulative progress
    const attestations: AttestationPoint[] = []
    let runningTotal = 0

    if (slotData.attestations?.windows) {
      // Sort windows by start time
      const sortedWindows = [...slotData.attestations.windows].sort((a, b) => a.start_ms - b.start_ms)
      
      // Add initial point at 0ms
      attestations.push({
        time: 0,
        totalValidators: 0
      })

      // Process each window
      sortedWindows.forEach(window => {
        const validatorCount = window.validator_indices.length

        // Add point at window start with current total
        attestations.push({
          time: window.start_ms,
          totalValidators: runningTotal
        })

        // Update running total and add point at window end
        runningTotal += validatorCount
        attestations.push({
          time: window.end_ms,
          totalValidators: runningTotal
        })
      })

      // Add final point at 12s
      attestations.push({
        time: 12000,
        totalValidators: runningTotal
      })
    }

    return {
      firstBlockSeen: firstBlock,
      firstApiBlockSeen: firstApiBlock,
      firstP2pBlockSeen: firstP2pBlock,
      attestationProgress: attestations
    }
  }, [slotData])

  const blockEvents = useMemo(() => {
    if (!slotData) return []

    return [
      // Block seen events
      ...Object.entries(slotData.timings.block_seen || {}).map(([node, time]) => ({
        type: 'block_seen' as const,
        node,
        time,
        source: 'api' as const
      })),
      // Block P2P events
      ...Object.entries(slotData.timings.block_first_seen_p2p || {}).map(([node, time]) => ({
        type: 'block_seen' as const,
        node,
        time,
        source: 'p2p' as const
      }))
    ].sort((a, b) => a.time - b.time)
  }, [slotData])

  // Convert block events to timeline events
  const timelineEvents = useMemo(() => {
    if (!slotData) return []

    const events: Event[] = []

    // Helper to get location string
    const getLocationString = (node: string) => {
      const nodeData = slotData.nodes[node]
      if (!nodeData?.geo) return 'Unknown Location'
      return nodeData.geo.country || nodeData.geo.continent || 'Unknown Location'
    }

    // Add block seen events
    Object.entries(slotData.timings.block_seen || {}).forEach(([node, time]) => {
      events.push({
        id: `block-seen-api-${node}-${time}`,
        timestamp: time,
        type: 'Block Seen (API)',
        node,
        location: getLocationString(node),
        data: { time }
      })
    })

    // Add P2P block events
    Object.entries(slotData.timings.block_first_seen_p2p || {}).forEach(([node, time]) => {
      events.push({
        id: `block-seen-p2p-${node}-${time}`,
        timestamp: time,
        type: 'Block Seen (P2P)',
        node,
        location: getLocationString(node),
        data: { time }
      })
    })

    // Add blob seen events
    Object.entries(slotData.timings.blob_seen || {}).forEach(([node, blobData]) => {
      Object.entries(blobData).forEach(([index, time]) => {
        events.push({
          id: `blob-seen-api-${node}-${index}-${time}`,
          timestamp: time,
          type: 'Blob Seen (API)',
          node,
          location: getLocationString(node),
          data: { time, index: parseInt(index) }
        })
      })
    })

    // Add P2P blob events
    Object.entries(slotData.timings.blob_first_seen_p2p || {}).forEach(([node, blobData]) => {
      Object.entries(blobData).forEach(([index, time]) => {
        events.push({
          id: `blob-seen-p2p-${node}-${index}-${time}`,
          timestamp: time,
          type: 'Blob Seen (P2P)',
          node,
          location: getLocationString(node),
          data: { time, index: parseInt(index) }
        })
      })
    })

    // Add attestation events
    slotData.attestations?.windows?.forEach((window, i) => {
      events.push({
        id: `attestation-${i}-${window.start_ms}`,
        timestamp: window.start_ms,
        type: 'Attestation',
        node: `${window.validator_indices.length} validators`,
        location: '',
        data: { time: window.start_ms }
      })
    })

    return events.sort((a, b) => a.timestamp - b.timestamp)
  }, [slotData])

  // Calculate what to show based on data availability
  const showData = slotData || (isLive && slot)
  const isMissingData = !slotData && isLive && slot !== undefined

  // Only show error if not live view
  if (error && !isLive) {
    return <ErrorState message="Failed to load slot data" error={error} />
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-full">
          {/* Map Section - 25vh */}
          <div className="h-[25vh] border-b border-subtle">
            <GlobalMap
              nodes={slotData?.nodes || {}}
              currentTime={currentTime}
              blockEvents={blockEvents}
              loading={isLoading}
              slot={slotData?.slot}
              proposer={slotData?.entity || 'Unknown'}
              proposerIndex={slotData?.proposer?.proposer_validator_index}
              txCount={slotData?.block?.execution_payload_transactions_count || 0}
              blockSize={slotData?.block?.block_total_bytes}
              baseFee={slotData?.block?.execution_payload_base_fee_per_gas}
              gasUsed={slotData?.block?.execution_payload_gas_used}
              gasLimit={slotData?.block?.execution_payload_gas_limit}
              executionBlockNumber={slotData?.block?.execution_payload_block_number}
              hideDetails={true}
            />
          </div>

          {/* Compact Slot Details */}
          <div className="border-b border-subtle">
            <div className="p-4">
              {/* Slot Header - Compact */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-2xl font-sans font-black text-primary">
                    <a href={`https://beaconcha.in/slot/${slot}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                      Slot {slot}
                    </a>
                  </div>
                  <div className="text-xs font-mono text-tertiary">
                    by {slotData?.entity && ['mainnet', 'holesky', 'sepolia'].includes(network) ? (
                      <a href={`https://ethseer.io/entity/${slotData.entity}?network=${network}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 transition-colors">
                        {slotData.entity}
                      </a>
                    ) : (
                      <span className="text-accent">{slotData?.entity || 'Unknown'}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    showModal(
                      <div className="w-full max-w-lg h-[80vh] overflow-y-auto p-4">
                        <div className="flex flex-col gap-8">
                          <DataAvailabilityPanel
                            blobTimings={{
                              blob_seen: slotData?.timings?.blob_seen,
                              blob_first_seen_p2p: slotData?.timings?.blob_first_seen_p2p,
                              block_seen: slotData?.timings?.block_seen,
                              block_first_seen_p2p: slotData?.timings?.block_first_seen_p2p
                            }}
                            currentTime={currentTime}
                            loading={isLoading}
                            isMissing={isMissingData}
                            nodes={slotData?.nodes}
                          />
                          <BottomPanel
                            attestationProgress={attestationProgress}
                            totalValidators={totalValidators}
                            attestationThreshold={attestationThreshold}
                            currentTime={currentTime}
                            loading={isLoading}
                            isMissing={isMissingData}
                            attestationWindows={slotData?.attestations?.windows}
                            maxPossibleValidators={maxPossibleValidators}
                          />
                        </div>
                      </div>
                    )
                  }}
                  className="bg-accent text-black font-medium px-3 py-1.5 text-sm rounded-full shadow-lg hover:bg-accent/90 transition-colors"
                >
                  View Stats
                </button>
              </div>

              {/* Analysis Section - Always visible on mobile */}
              {slotData && (
                <div className="bg-surface/30 rounded text-xs font-mono space-y-1">
                  {(() => {
                    // Get first block seen time
                    const blockSeenTimes = [
                      ...Object.values(slotData.timings.block_seen || {}),
                      ...Object.values(slotData.timings.block_first_seen_p2p || {})
                    ]
                    const firstBlockTime = blockSeenTimes.length > 0 ? Math.min(...blockSeenTimes) : null
                    
                    // Get first blob seen time
                    const blobSeenTimes = [
                      ...Object.values(slotData.timings.blob_seen || {}).flatMap(obj => Object.values(obj)),
                      ...Object.values(slotData.timings.blob_first_seen_p2p || {}).flatMap(obj => Object.values(obj))
                    ]
                    const firstBlobTime = blobSeenTimes.length > 0 ? Math.min(...blobSeenTimes) : null

                    // Calculate blob count
                    const blobIndices = new Set([
                      ...Object.values(slotData.timings.blob_seen || {}).flatMap(obj => Object.keys(obj)),
                      ...Object.values(slotData.timings.blob_first_seen_p2p || {}).flatMap(obj => Object.keys(obj))
                    ])

                    // Calculate gas metrics
                    const gasUsage = slotData.block.execution_payload_gas_used
                    const gasLimit = slotData.block.execution_payload_gas_limit
                    const gasUsagePercent = gasUsage && gasLimit ? Math.min((gasUsage / gasLimit) * 100, 100) : null

                    // Get total validators and attestations
                    const totalAttestations = slotData.attestations?.windows?.reduce((sum, window) => 
                      sum + window.validator_indices.length, 0) || 0
                    
                    // Calculate participation based on actual attestations
                    const maxPossibleValidators = slotData.attestations?.maximum_votes || 0
                    const participation = maxPossibleValidators > 0 ? (totalAttestations / maxPossibleValidators) * 100 : null

                    return (
                      <>
                        {/* Block Timing */}
                        <div className={clsx(
                          "grid grid-cols-[20px_1fr] items-start gap-1",
                          firstBlockTime === null && "text-tertiary",
                          firstBlockTime !== null && firstBlockTime <= 2000 && "text-success",
                          firstBlockTime !== null && firstBlockTime > 2000 && firstBlockTime <= 3000 && "text-warning",
                          firstBlockTime !== null && firstBlockTime > 3000 && "text-error"
                        )}>
                          <div className="flex justify-center">{firstBlockTime === null ? "○" : firstBlockTime > 3000 ? "⚠️" : firstBlockTime > 2000 ? "⚡" : "✓"}</div>
                          <div>
                            {firstBlockTime === null ? (
                              "Block timing unknown"
                            ) : firstBlockTime > 3000 ? (
                              `Block proposed late (${(firstBlockTime/1000).toFixed(2)}s)`
                            ) : firstBlockTime > 2000 ? (
                              `Block slightly delayed (${(firstBlockTime/1000).toFixed(2)}s)`
                            ) : (
                              `Block on time (${(firstBlockTime/1000).toFixed(2)}s)`
                            )}
                          </div>
                        </div>

                        {/* Blob Timing */}
                        <div className={clsx(
                          "grid grid-cols-[20px_1fr] items-start gap-1",
                          (!firstBlobTime || !firstBlockTime || blobIndices.size === 0) && "text-tertiary",
                          blobIndices.size > 0 && firstBlobTime && firstBlockTime && (firstBlobTime - firstBlockTime) <= 500 && "text-success",
                          blobIndices.size > 0 && firstBlobTime && firstBlockTime && (firstBlobTime - firstBlockTime) > 500 && (firstBlobTime - firstBlockTime) <= 1000 && "text-warning",
                          blobIndices.size > 0 && firstBlobTime && firstBlockTime && (firstBlobTime - firstBlockTime) > 1000 && "text-error"
                        )}>
                          <div className="flex justify-center">{blobIndices.size === 0 ? "○" : !firstBlobTime || !firstBlockTime ? "○" : (firstBlobTime - firstBlockTime) > 1000 ? "⚠️" : (firstBlobTime - firstBlockTime) > 500 ? "⚡" : "✓"}</div>
                          <div>
                            {blobIndices.size === 0 ? (
                              "No blobs in block"
                            ) : !firstBlobTime || !firstBlockTime ? (
                              "Blobs: ${blobIndices.size}"
                            ) : (firstBlobTime - firstBlockTime) > 1000 ? (
                              `Slow blob delivery (+${((firstBlobTime - firstBlockTime)/1000).toFixed(2)}s)`
                            ) : (firstBlobTime - firstBlockTime) > 500 ? (
                              `Moderate blob delay (+${((firstBlobTime - firstBlockTime)/1000).toFixed(2)}s)`
                            ) : (
                              `Fast blob delivery (+${((firstBlobTime - firstBlockTime)/1000).toFixed(2)}s)`
                            )}
                          </div>
                        </div>

                        {/* Gas Usage */}
                        <div className={clsx(
                          "grid grid-cols-[20px_1fr] items-start gap-1",
                          !gasUsagePercent && "text-tertiary",
                          gasUsagePercent && gasUsagePercent <= 80 && "text-success",
                          gasUsagePercent && gasUsagePercent > 80 && "text-warning"
                        )}>
                          <div className="flex justify-center">{!gasUsagePercent ? "○" : gasUsagePercent > 95 ? "⚡" : gasUsagePercent > 80 ? "⚡" : "✓"}</div>
                          <div>
                            {!gasUsagePercent ? (
                              "Gas usage unknown"
                            ) : gasUsagePercent > 95 ? (
                              `High gas usage (${gasUsagePercent.toFixed(1)}%)`
                            ) : gasUsagePercent > 80 ? (
                              `Elevated gas usage (${gasUsagePercent.toFixed(1)}%)`
                            ) : (
                              `Normal gas usage (${gasUsagePercent.toFixed(1)}%)`
                            )}
                          </div>
                        </div>

                        {/* Participation */}
                        <div className={clsx(
                          "grid grid-cols-[20px_1fr] items-start gap-1",
                          !participation && "text-tertiary",
                          participation && participation >= 80 && "text-success",
                          participation && participation >= 66 && participation < 80 && "text-warning",
                          participation && participation < 66 && "text-error"
                        )}>
                          <div className="flex justify-center">{!participation ? "○" : participation < 66 ? "⚠️" : participation < 80 ? "⚡" : "✓"}</div>
                          <div>
                            {!participation ? (
                              "Participation unknown"
                            ) : participation < 66 ? (
                              `Low participation (${participation.toFixed(1)}%)`
                            ) : participation < 80 ? (
                              `Moderate participation (${participation.toFixed(1)}%)`
                            ) : (
                              `Good participation (${participation.toFixed(1)}%)`
                            )}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Timeline and Events - Fill remaining space */}
          <div className="flex-1 min-h-0 flex flex-col">
            <EventTimeline
              events={timelineEvents}
              loading={isLoading}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              currentTime={currentTime / 1000}
              isPlaying={isPlaying}
              onPlayPauseClick={() => setIsPlaying(!isPlaying)}
              slot={slot}
              onPreviousSlot={() => {
                if (slot) {
                  navigate(`/beacon/slot/${slot - 1}?network=${network}`)
                }
              }}
              onNextSlot={() => {
                if (slot && !isLive) {
                  navigate(`/beacon/slot/${slot + 1}?network=${network}`)
                }
              }}
              isLive={isLive}
              className="max-h-[30vh] overflow-y-auto"
            />
          </div>
        </div>

        {/* Desktop Layout - Unchanged */}
        <div className="hidden md:flex flex-1 min-h-0 flex-row">
          {/* Left Sidebar - Details */}
          <div className="w-[20%] border-r border-subtle md:h-[calc(80vh-theme(spacing.32))]">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Slot Header */}
                <div className="mb-3 p-2">
                  <div className="text-4xl font-sans font-black text-primary animate-text-shine mb-1">
                    <a
                      href={`https://beaconcha.in/slot/${slot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent transition-colors"
                    >
                      Slot {slot}
                    </a>
                  </div>
                  <div className="text-sm font-mono">
                    <span className="text-tertiary">by {slotData?.entity && ['mainnet', 'holesky', 'sepolia'].includes(network) ? (
                      <a
                        href={`https://ethseer.io/entity/${slotData.entity}?network=${network}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/80 transition-colors"
                      >
                        {slotData.entity}
                      </a>
                    ) : (
                      <span className="text-accent">{slotData?.entity || 'Unknown'}</span>
                    )}</span>
                  </div>
                </div>

                {/* Analysis Section */}
                {slotData && (
                  <div className="mb-3 p-2 bg-surface/30 rounded text-xs font-mono space-y-1">
                    {(() => {
                      // Get first block seen time
                      const blockSeenTimes = [
                        ...Object.values(slotData.timings.block_seen || {}),
                        ...Object.values(slotData.timings.block_first_seen_p2p || {})
                      ]
                      const firstBlockTime = blockSeenTimes.length > 0 ? Math.min(...blockSeenTimes) : null
                      
                      // Get first blob seen time
                      const blobSeenTimes = [
                        ...Object.values(slotData.timings.blob_seen || {}).flatMap(obj => Object.values(obj)),
                        ...Object.values(slotData.timings.blob_first_seen_p2p || {}).flatMap(obj => Object.values(obj))
                      ]
                      const firstBlobTime = blobSeenTimes.length > 0 ? Math.min(...blobSeenTimes) : null

                      // Calculate blob count
                      const blobIndices = new Set([
                        ...Object.values(slotData.timings.blob_seen || {}).flatMap(obj => Object.keys(obj)),
                        ...Object.values(slotData.timings.blob_first_seen_p2p || {}).flatMap(obj => Object.keys(obj))
                      ])

                      // Calculate gas metrics
                      const gasUsage = slotData.block.execution_payload_gas_used
                      const gasLimit = slotData.block.execution_payload_gas_limit
                      const gasUsagePercent = gasUsage && gasLimit ? Math.min((gasUsage / gasLimit) * 100, 100) : null

                      // Get total validators and attestations
                      const totalValidators = slotData.attestations?.windows?.reduce((sum, window) => 
                        sum + window.validator_indices.length, 0) || 0
                      
                      // Calculate participation based on actual attestations
                      const totalAttestations = slotData.attestations?.windows?.reduce((sum, window) => 
                        sum + window.validator_indices.length, 0) || 0
                      const maxPossibleValidators = slotData.attestations?.maximum_votes || 0
                      const participation = maxPossibleValidators > 0 ? (totalAttestations / maxPossibleValidators) * 100 : null

                      return (
                        <>
                          {/* Block Timing */}
                          <div className={clsx(
                            "grid grid-cols-[20px_1fr] items-start gap-1",
                            firstBlockTime === null && "text-tertiary",
                            firstBlockTime !== null && firstBlockTime <= 2000 && "text-success",
                            firstBlockTime !== null && firstBlockTime > 2000 && firstBlockTime <= 3000 && "text-warning",
                            firstBlockTime !== null && firstBlockTime > 3000 && "text-error"
                          )}>
                            <div className="flex justify-center">{firstBlockTime === null ? "○" : firstBlockTime > 3000 ? "⚠️" : firstBlockTime > 2000 ? "⚡" : "✓"}</div>
                            <div>
                              {firstBlockTime === null ? (
                                "Block timing unknown"
                              ) : firstBlockTime > 3000 ? (
                                `Block proposed late (${(firstBlockTime/1000).toFixed(2)}s)`
                              ) : firstBlockTime > 2000 ? (
                                `Block slightly delayed (${(firstBlockTime/1000).toFixed(2)}s)`
                              ) : (
                                `Block on time (${(firstBlockTime/1000).toFixed(2)}s)`
                              )}
                            </div>
                          </div>

                          {/* Blob Timing */}
                          <div className={clsx(
                            "grid grid-cols-[20px_1fr] items-start gap-1",
                            (!firstBlobTime || !firstBlockTime || blobIndices.size === 0) && "text-tertiary",
                            blobIndices.size > 0 && firstBlobTime && firstBlockTime && (firstBlobTime - firstBlockTime) <= 500 && "text-success",
                            blobIndices.size > 0 && firstBlobTime && firstBlockTime && (firstBlobTime - firstBlockTime) > 500 && (firstBlobTime - firstBlockTime) <= 1000 && "text-warning",
                            blobIndices.size > 0 && firstBlobTime && firstBlockTime && (firstBlobTime - firstBlockTime) > 1000 && "text-error"
                          )}>
                            <div className="flex justify-center">{blobIndices.size === 0 ? "○" : !firstBlobTime || !firstBlockTime ? "○" : (firstBlobTime - firstBlockTime) > 1000 ? "⚠️" : (firstBlobTime - firstBlockTime) > 500 ? "⚡" : "✓"}</div>
                            <div>
                              {blobIndices.size === 0 ? (
                                "No blobs in block"
                              ) : !firstBlobTime || !firstBlockTime ? (
                                "Blobs: ${blobIndices.size}"
                              ) : (firstBlobTime - firstBlockTime) > 1000 ? (
                                `Slow blob delivery (+${((firstBlobTime - firstBlockTime)/1000).toFixed(2)}s)`
                              ) : (firstBlobTime - firstBlockTime) > 500 ? (
                                `Moderate blob delay (+${((firstBlobTime - firstBlockTime)/1000).toFixed(2)}s)`
                              ) : (
                                `Fast blob delivery (+${((firstBlobTime - firstBlockTime)/1000).toFixed(2)}s)`
                              )}
                            </div>
                          </div>

                          {/* Gas Usage */}
                          <div className={clsx(
                            "grid grid-cols-[20px_1fr] items-start gap-1",
                            !gasUsagePercent && "text-tertiary",
                            gasUsagePercent && gasUsagePercent <= 80 && "text-success",
                            gasUsagePercent && gasUsagePercent > 80 && "text-warning"
                          )}>
                            <div className="flex justify-center">{!gasUsagePercent ? "○" : gasUsagePercent > 95 ? "⚡" : gasUsagePercent > 80 ? "⚡" : "✓"}</div>
                            <div>
                              {!gasUsagePercent ? (
                                "Gas usage unknown"
                              ) : gasUsagePercent > 95 ? (
                                `High gas usage (${gasUsagePercent.toFixed(1)}%)`
                              ) : gasUsagePercent > 80 ? (
                                `Elevated gas usage (${gasUsagePercent.toFixed(1)}%)`
                              ) : (
                                `Normal gas usage (${gasUsagePercent.toFixed(1)}%)`
                              )}
                            </div>
                          </div>

                          {/* Participation */}
                          <div className={clsx(
                            "grid grid-cols-[20px_1fr] items-start gap-1",
                            !participation && "text-tertiary",
                            participation && participation >= 80 && "text-success",
                            participation && participation >= 66 && participation < 80 && "text-warning",
                            participation && participation < 66 && "text-error"
                          )}>
                            <div className="flex justify-center">{!participation ? "○" : participation < 66 ? "⚠️" : participation < 80 ? "⚡" : "✓"}</div>
                            <div>
                              {!participation ? (
                                "Participation unknown"
                              ) : participation < 66 ? (
                                `Low participation (${participation.toFixed(1)}%)`
                              ) : participation < 80 ? (
                                `Moderate participation (${participation.toFixed(1)}%)`
                              ) : (
                                `Good participation (${participation.toFixed(1)}%)`
                              )}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
                
                {/* Block Info */}
                <div className="space-y-2 text-xs font-mono">
                  {/* Epoch & Proposer Info */}
                  <div className="p-2 bg-surface/50 rounded">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <div className="text-tertiary">Epoch</div>
                        <div className="text-primary">
                          <a
                            href={`https://beaconcha.in/epoch/${Math.floor(slot! / 32)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent transition-colors"
                          >
                            {Math.floor(slot! / 32)}
                          </a>
                        </div>
                      </div>
                      <div>
                        <div className="text-tertiary">Slot in Epoch</div>
                        <div className="text-primary">
                          <a
                            href={`https://beaconcha.in/slot/${slot}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent transition-colors"
                          >
                            {(slot! % 32) + 1}/32
                          </a>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-tertiary">Validator</div>
                        <div className="text-primary">
                          <a
                            href={`https://beaconcha.in/validator/${slotData?.proposer?.proposer_validator_index}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent transition-colors"
                          >
                            {slotData?.proposer?.proposer_validator_index || 'Unknown'}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Block Stats */}
                  <div className="p-2 bg-surface/50 rounded">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <div className="text-tertiary">Txns</div>
                        <div className="text-primary">{slotData?.block?.execution_payload_transactions_count?.toLocaleString() || '0'}</div>
                      </div>

                      {slotData?.block?.block_total_bytes && (
                        <div>
                          <div className="text-tertiary">Size</div>
                          <div className="text-primary">{(slotData.block.block_total_bytes / 1024).toFixed(1)}KB</div>
                        </div>
                      )}

                      {slotData?.block?.execution_payload_gas_used && (
                        <div className="col-span-2">
                          <div className="text-tertiary">Gas</div>
                          <div className="text-primary">
                            {(slotData.block.execution_payload_gas_used / 1e6).toFixed(1)}M / {(slotData.block.execution_payload_gas_limit! / 1e6).toFixed(1)}M
                          </div>
                        </div>
                      )}

                      {slotData?.block?.execution_payload_base_fee_per_gas && (
                        <div className="col-span-2">
                          <div className="text-tertiary">Base Fee</div>
                          <div className="text-primary">{(slotData.block.execution_payload_base_fee_per_gas / 1e9).toFixed(2)} Gwei</div>
                        </div>
                      )}

                      {slotData?.block?.execution_payload_block_number && (
                        <div className="col-span-2">
                          <div className="text-tertiary">Block Number</div>
                          <div className="text-primary">
                            <a
                              href={`https://etherscan.io/block/${slotData.block.execution_payload_block_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-accent transition-colors"
                            >
                              {slotData.block.execution_payload_block_number}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Network Stats */}
                  <div className="p-2 bg-surface/50 rounded">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="col-span-2">
                        <div className="text-tertiary">Block First Seen</div>
                        <div className="text-primary">
                          {(() => {
                            const times = [
                              ...Object.values(slotData?.timings?.block_seen || {}),
                              ...Object.values(slotData?.timings?.block_first_seen_p2p || {})
                            ]
                            const firstTime = times.length > 0 ? Math.min(...times) : null
                            const firstNode = Object.entries(slotData?.timings?.block_seen || {})
                              .concat(Object.entries(slotData?.timings?.block_first_seen_p2p || {}))
                              .find(([_, time]) => time === firstTime)?.[0]
                            const nodeData = firstNode ? slotData?.nodes[firstNode] : null
                            const country = nodeData?.geo?.country || nodeData?.geo?.continent || 'Unknown'
                            
                            return firstTime ? `${(firstTime/1000).toFixed(2)}s (${country})` : '-'
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-tertiary">Blobs</div>
                        <div className="text-primary">
                          {(() => {
                            if (!slotData?.timings?.blob_seen && !slotData?.timings?.blob_first_seen_p2p) return '0'
                            const blobIndices = new Set([
                              ...Object.values(slotData?.timings?.blob_seen || {}).flatMap(obj => Object.keys(obj)),
                              ...Object.values(slotData?.timings?.blob_first_seen_p2p || {}).flatMap(obj => Object.keys(obj))
                            ])
                            return blobIndices.size
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-tertiary">Nodes Seen</div>
                        <div className="text-primary">
                          {(() => {
                            const nodes = new Set([
                              ...Object.keys(slotData?.timings?.block_seen || {}),
                              ...Object.keys(slotData?.timings?.block_first_seen_p2p || {})
                            ])
                            return nodes.size || '0'
                          })()}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-tertiary">Attestations</div>
                        <div className="text-primary">
                          {(() => {
                            const totalAttestations = slotData?.attestations?.windows?.reduce((sum, window) => 
                              sum + window.validator_indices.length, 0) || 0
                            const maxAttestations = slotData?.attestations?.maximum_votes || 0
                            return `${totalAttestations.toLocaleString()} / ${maxAttestations.toLocaleString()}`
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Map */}
          <div className="w-[60%] h-[calc(80vh-theme(spacing.32))] border-r border-subtle">
            <GlobalMap
              nodes={slotData?.nodes || {}}
              currentTime={currentTime}
              blockEvents={blockEvents}
              loading={isLoading}
              slot={slotData?.slot}
              proposer={slotData?.entity || 'Unknown'}
              proposerIndex={slotData?.proposer?.proposer_validator_index}
              txCount={slotData?.block?.execution_payload_transactions_count || 0}
              blockSize={slotData?.block?.block_total_bytes}
              baseFee={slotData?.block?.execution_payload_base_fee_per_gas}
              gasUsed={slotData?.block?.execution_payload_gas_used}
              gasLimit={slotData?.block?.execution_payload_gas_limit}
              executionBlockNumber={slotData?.block?.execution_payload_block_number}
              hideDetails={true}
            />
          </div>

          {/* Right Sidebar - Timeline */}
          <div className="w-[20%] h-[calc(80vh-theme(spacing.32))] overflow-hidden">
            <EventTimeline
              events={timelineEvents}
              loading={isLoading}
              isCollapsed={isTimelineCollapsed}
              onToggleCollapse={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
              currentTime={currentTime / 1000}
              isPlaying={isPlaying}
              onPlayPauseClick={() => setIsPlaying(!isPlaying)}
              slot={slot}
              onPreviousSlot={() => {
                if (slot) {
                  navigate(`/beacon/slot/${slot - 1}?network=${network}`)
                }
              }}
              onNextSlot={() => {
                if (slot && !isLive) {
                  navigate(`/beacon/slot/${slot + 1}?network=${network}`)
                }
              }}
              isLive={isLive}
              className="max-h-[30vh]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Desktop Only */}
      <div className="hidden md:flex flex-col">
        <div className="h-[20vh] bg-surface/90 backdrop-blur-md border-t border-subtle">
          <div className="h-full w-full grid grid-cols-3">
            {/* Data Availability Section */}
            <div className="col-span-2 p-4 border-r border-subtle">
              <DataAvailabilityPanel
                blobTimings={{
                  blob_seen: slotData?.timings?.blob_seen,
                  blob_first_seen_p2p: slotData?.timings?.blob_first_seen_p2p,
                  block_seen: slotData?.timings?.block_seen,
                  block_first_seen_p2p: slotData?.timings?.block_first_seen_p2p
                }}
                currentTime={currentTime}
                loading={isLoading}
                isMissing={isMissingData}
                nodes={slotData?.nodes}
              />
            </div>

            {/* Attestation Section */}
            <div className="p-4">
              <BottomPanel
                attestationProgress={attestationProgress}
                totalValidators={totalValidators}
                attestationThreshold={attestationThreshold}
                currentTime={currentTime}
                loading={isLoading}
                isMissing={isMissingData}
                attestationWindows={slotData?.attestations?.windows}
                maxPossibleValidators={maxPossibleValidators}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 