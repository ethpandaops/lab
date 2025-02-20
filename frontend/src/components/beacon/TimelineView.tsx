import { ReactNode } from 'react'
import { Tooltip } from 'react-tooltip'
import { useMemo } from 'react'

interface BlockEvent {
  type: 'block_seen'
  time: number
  node: string
  source: 'p2p' | 'api'
}

interface AttestationWindow {
  start_ms: number
  end_ms: number
  validator_indices: number[]
}

interface TimelineViewProps {
  slot?: number
  isPlaying: boolean
  currentTime: number
  firstBlockSeen: BlockEvent | null
  firstApiBlockSeen?: BlockEvent | null
  firstP2pBlockSeen?: BlockEvent | null
  attestationWindows?: Array<{
    start_ms: number
    end_ms: number
    validator_indices: number[]
  }>
  attestationProgress: Array<{
    time: number
    totalValidators: number
  }>
  ATTESTATION_THRESHOLD: number
  TOTAL_VALIDATORS: number
  loading: boolean
  isMissing: boolean
  onPlayPauseClick: () => void
  proposerIndex?: number
  entity?: string
}

export function TimelineView({
  slot,
  isPlaying,
  currentTime,
  firstBlockSeen,
  firstApiBlockSeen,
  firstP2pBlockSeen,
  attestationWindows,
  attestationProgress,
  ATTESTATION_THRESHOLD,
  TOTAL_VALIDATORS,
  loading,
  isMissing,
  onPlayPauseClick,
  proposerIndex,
  entity,
}: TimelineViewProps): JSX.Element {
  return (
    <div className="backdrop-blur-md   p-6 bg-surface/80">
      <div className="flex flex-col space-y-6">
        {/* Header with controls and info */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onPlayPauseClick}
              className="px-4 py-2  hover:-prominent hover:bg-hover transition-all border border-text-muted"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <div className="flex items-center gap-4 text-sm font-mono">
              <div>
                <span className="text-tertiary">Slot </span>
                <span className="text-primary">{slot}</span>
                <span className="text-tertiary mx-2">·</span>
                <span className="text-tertiary">Epoch </span>
                <span className="text-primary">{Math.floor(slot! / 32)}</span>
                {isMissing && (
                  <span className="ml-2 text-error/70">(Data Missing)</span>
                )}
              </div>
              <div>
                <span className="text-tertiary">by </span>
                {loading ? (
                  <span className="inline-block w-32 h-4 bg-active rounded animate-pulse" />
                ) : isMissing ? (
                  <span className="text-muted">Unknown</span>
                ) : (
                  <span className="text-primary">
                    {proposerIndex}
                    <span className="text-tertiary ml-1">({entity || 'Unknown'})</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="font-mono text-primary">
            {(currentTime / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Timeline */}
        <div className="relative h-16">
          {/* Phase sections with improved headers */}
          <div className="absolute inset-0 flex">
            <div className="w-1/3 h-full bg-accent/5 flex flex-col">
              <div className="text-xs font-mono text-accent/80 font-medium p-1.5 /50 rounded-tl-lg backdrop-blur-sm">
                Block Proposal
              </div>
            </div>
            <div className="w-1/3 h-full bg-error/5 flex flex-col">
              <div className="text-xs font-mono text-error/80 font-medium p-1.5 /50 backdrop-blur-sm">
                Attestation
              </div>
            </div>
            <div className="w-1/3 h-full bg-hover flex flex-col">
              <div className="text-xs font-mono text-primary/80 font-medium p-1.5 /50 rounded-tr-lg backdrop-blur-sm">
                Aggregation
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div 
            className="absolute top-0 left-0 h-full bg-active transition-all duration-100"
            style={{ width: `${(currentTime / 12000) * 100}%` }}
          />

          {/* Event markers container */}
          <div className="absolute inset-x-0 bottom-6 h-10">
            {/* Block seen marker (API) */}
            {!loading && !isMissing && firstApiBlockSeen && (
              <div
                className="absolute bottom-0 flex flex-col items-center group"
                style={{ left: `${(firstApiBlockSeen.time / 12000) * 100}%` }}
                data-tooltip-id="timeline-tooltip"
                data-tooltip-content={`Block Seen (API) at ${(firstApiBlockSeen.time / 1000).toFixed(2)}s`}
              >
                <div className="w-px h-full bg-accent" />
                <div className="absolute bottom-0 -mb-1.5 w-2 h-2 rounded-full bg-accent ring-4 ring-accent/20" />
              </div>
            )}

            {/* Block seen marker (P2P) */}
            {!loading && !isMissing && firstP2pBlockSeen && (
              <div
                className="absolute bottom-0 flex flex-col items-center group"
                style={{ left: `${(firstP2pBlockSeen.time / 12000) * 100}%` }}
                data-tooltip-id="timeline-tooltip"
                data-tooltip-content={`Block Seen (P2P) at ${(firstP2pBlockSeen.time / 1000).toFixed(2)}s`}
              >
                <div className="w-px h-full bg-yellow-400" />
                <div className="absolute bottom-0 -mb-1.5 w-2 h-2 rounded-full bg-yellow-400 ring-4 ring-yellow-400/20" />
              </div>
            )}

            {/* First attestation marker */}
            {!loading && !isMissing && attestationWindows && attestationWindows.length > 0 && (
              <div
                className="absolute bottom-0 flex flex-col items-center group"
                style={{ left: `${(attestationWindows[0].start_ms / 12000) * 100}%` }}
                data-tooltip-id="timeline-tooltip"
                data-tooltip-content={`First Attestation at ${(attestationWindows[0].start_ms / 1000).toFixed(2)}s by validator ${attestationWindows[0].validator_indices[0]}`}
              >
                <div className="w-px h-full bg-error" />
                <div className="absolute bottom-0 -mb-1.5 w-2 h-2 rounded-full bg-error ring-4 ring-error/20" />
              </div>
            )}
          </div>

          {/* Time markers */}
          <div className="absolute inset-x-0 bottom-0 h-6 flex">
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={i}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${(i / 12) * 100}%` }}
              >
                <div className="w-px h-1.5 bg-primary/20" />
                <span className="mt-1 text-[10px] font-mono text-muted">
                  {i}s
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent ring-4 ring-accent/20" />
            <span className="text-accent/80">Block Seen (API)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400 ring-4 ring-yellow-400/20" />
            <span className="text-yellow-400/80">Block Seen (P2P)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error ring-4 ring-error/20" />
            <span className="text-error/80">First Attestation</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip
        id="timeline-tooltip"
        className="z-50 max-w-xs ! ! !-default !text-primary !font-mono !text-xs !px-2 !py-1"
      />
    </div>
  )
} 