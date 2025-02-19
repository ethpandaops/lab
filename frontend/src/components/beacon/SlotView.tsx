import { useEffect, useMemo, useState } from 'react'
import { useDataFetch } from '../../utils/data'
import { LoadingState } from '../common/LoadingState'
import { ErrorState } from '../common/ErrorState'
import { AttestationView } from './AttestationView'
import { AnalysisView } from './AnalysisView'
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

  const { firstBlockSeen, attestationProgress } = useMemo(() => {
    if (!slotData) return { firstBlockSeen: null, attestationProgress: [] }

    // Find first block seen event
    let firstBlock: BlockEvent | null = null
    
    // Check P2P events
    const p2pEvents = slotData.timings.block_first_seen_p2p || {}
    Object.entries(p2pEvents).forEach(([node, time]) => {
      if (!firstBlock || time < firstBlock.time) {
        firstBlock = {
          type: 'block_seen',
          time,
          node,
          source: 'p2p'
        }
      }
    })

    // Check API events
    const apiEvents = slotData.timings.block_seen || {}
    Object.entries(apiEvents).forEach(([node, time]) => {
      if (!firstBlock || time < firstBlock.time) {
        firstBlock = {
          type: 'block_seen',
          time,
          node,
          source: 'api'
        }
      }
    })

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
      attestationProgress: attestations
    }
  }, [slotData])

  const events = useMemo(() => {
    if (!slotData) return []

    return [
      // Block seen events
      ...Object.entries(slotData.timings.block_seen || {}).map(([node, time]) => ({
        type: 'block_seen',
        node,
        time,
      })),
      // Block P2P events
      ...Object.entries(slotData.timings.block_first_seen_p2p || {}).map(([node, time]) => ({
        type: 'block_p2p',
        node,
        time,
      })),
      // Attestation events
      ...(slotData.attestations?.windows || []).flatMap((window: AttestationWindow) => ({
        type: 'attestation',
        start: window.start_ms,
        end: window.end_ms,
        validators: window.validator_indices,
      })),
    ].sort((a, b) => {
      const timeA = 'time' in a ? a.time : a.start
      const timeB = 'time' in b ? b.time : b.start
      return timeA - timeB
    })
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
        <AnalysisView loading={isLoading} isMissing={isMissingData} />
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