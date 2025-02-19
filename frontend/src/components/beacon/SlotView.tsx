import { useEffect, useMemo, useState } from 'react'
import { useDataFetch } from '../../utils/data'
import { LoadingState } from '../common/LoadingState'
import { ErrorState } from '../common/ErrorState'
import { AttestationView } from './AttestationView'
import { GlobalMap } from './GlobalMap'
import { DetailsView } from './DetailsView'
import { TimelineView } from './TimelineView'

interface SlotData {
  slot: number
  block: {
    epoch: number
    execution_payload_transactions_count?: number
    block_total_bytes?: number
    execution_payload_base_fee_per_gas?: number
    execution_payload_gas_used?: number
    execution_payload_gas_limit?: number
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

export function SlotView({ slot, network = 'mainnet', isLive = false, onSlotComplete }: SlotViewProps): JSX.Element {
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(isLive)

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

  const totalValidators = slotData?.attestations?.maximum_votes || 0
  const attestationThreshold = Math.ceil(totalValidators * 0.66)

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

  // Calculate what to show based on data availability
  const showData = slotData || (isLive && slot)
  const isMissingData = !slotData && isLive && slot !== undefined

  // Only show error if not live view
  if (error && !isLive) {
    return <ErrorState message="Failed to load slot data" error={error} />
  }

  return (
    <div className="space-y-6">
      {/* Slot Timeline + Controls */}
      <TimelineView
        slot={slot}
        isPlaying={isPlaying}
        currentTime={currentTime}
        firstBlockSeen={firstBlockSeen}
        firstApiBlockSeen={firstApiBlockSeen}
        firstP2pBlockSeen={firstP2pBlockSeen}
        attestationWindows={slotData?.attestations?.windows}
        attestationProgress={attestationProgress}
        ATTESTATION_THRESHOLD={attestationThreshold}
        TOTAL_VALIDATORS={totalValidators}
        loading={isLoading}
        isMissing={isMissingData}
        onPlayPauseClick={() => setIsPlaying(!isPlaying)}
        proposerIndex={slotData?.proposer.proposer_validator_index}
        entity={slotData?.entity}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlobalMap
          nodes={slotData?.nodes || {}}
          currentTime={currentTime}
          blockEvents={blockEvents}
          loading={isLoading}
          isMissing={isMissingData}
        />
        <DetailsView loading={isLoading} isMissing={isMissingData} slotData={slotData} />
        <AttestationView
          loading={isLoading}
          isMissing={isMissingData}
          attestationWindows={slotData?.attestations?.windows}
          attestationProgress={attestationProgress}
          TOTAL_VALIDATORS={totalValidators}
          ATTESTATION_THRESHOLD={attestationThreshold}
          currentTime={currentTime}
        />
      </div>
    </div>
  )
} 