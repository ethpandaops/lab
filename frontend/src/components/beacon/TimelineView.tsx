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
    <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
      <div className="flex flex-col space-y-6">
        {/* Header with controls and info */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onPlayPauseClick}
              className="px-4 py-2 rounded-lg border border-cyber-neon/20 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 transition-all"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <div className="flex items-center gap-4 text-sm font-mono">
              <div>
                <span className="text-cyber-neon/70">Slot </span>
                <span className="text-cyber-neon">{slot}</span>
                <span className="text-cyber-neon/70 mx-2">·</span>
                <span className="text-cyber-neon/70">Epoch </span>
                <span className="text-cyber-neon">{Math.floor(slot! / 32)}</span>
                {isMissing && (
                  <span className="ml-2 text-cyber-pink/70">(Data Missing)</span>
                )}
              </div>
              <div>
                <span className="text-cyber-neon/70">by </span>
                {loading ? (
                  <span className="inline-block w-32 h-4 bg-cyber-neon/10 rounded animate-pulse" />
                ) : isMissing ? (
                  <span className="text-cyber-neon/50">Unknown</span>
                ) : (
                  <span className="text-cyber-neon">
                    {proposerIndex}
                    <span className="text-cyber-neon/70 ml-1">({entity || 'Unknown'})</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="font-mono text-cyber-neon">
            {(currentTime / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Timeline */}
        <div className="relative h-16 bg-cyber-darker rounded-lg">
          {/* Phase sections with improved headers */}
          <div className="absolute inset-0 flex">
            <div className="w-1/3 h-full bg-cyber-blue/5 flex flex-col">
              <div className="text-xs font-mono text-cyber-blue/80 font-medium p-1.5 bg-cyber-darker/50 rounded-tl-lg backdrop-blur-sm">
                Block Proposal
              </div>
            </div>
            <div className="w-1/3 h-full bg-cyber-pink/5 flex flex-col">
              <div className="text-xs font-mono text-cyber-pink/80 font-medium p-1.5 bg-cyber-darker/50 backdrop-blur-sm">
                Attestation
              </div>
            </div>
            <div className="w-1/3 h-full bg-cyber-neon/5 flex flex-col">
              <div className="text-xs font-mono text-cyber-neon/80 font-medium p-1.5 bg-cyber-darker/50 rounded-tr-lg backdrop-blur-sm">
                Aggregation
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div 
            className="absolute top-0 left-0 h-full bg-cyber-neon/10 transition-all duration-100"
            style={{ width: `${(currentTime / 12000) * 100}%` }}
          />

          {/* Event markers container */}
          <div className="absolute inset-x-0 bottom-6 h-10">
            {/* Block seen marker - now with tooltip */}
            {!loading && !isMissing && firstBlockSeen && (
              <div
                className="absolute bottom-0 flex flex-col items-center group"
                style={{ left: `${(firstBlockSeen.time / 12000) * 100}%` }}
                data-tooltip-id="timeline-tooltip"
                data-tooltip-content={`Block Seen at ${(firstBlockSeen.time / 1000).toFixed(2)}s`}
              >
                <div className="w-px h-full bg-cyber-blue" />
                <div className="absolute bottom-0 -mb-1.5 w-2 h-2 rounded-full bg-cyber-blue ring-4 ring-cyber-blue/20" />
              </div>
            )}

            {/* First attestation marker - now with tooltip */}
            {!loading && !isMissing && attestationWindows && attestationWindows.length > 0 && (
              <div
                className="absolute bottom-0 flex flex-col items-center group"
                style={{ left: `${(attestationWindows[0].start_ms / 12000) * 100}%` }}
                data-tooltip-id="timeline-tooltip"
                data-tooltip-content={`First Attestation at ${(attestationWindows[0].start_ms / 1000).toFixed(2)}s by validator ${attestationWindows[0].validator_indices[0]}`}
              >
                <div className="w-px h-full bg-cyber-pink" />
                <div className="absolute bottom-0 -mb-1.5 w-2 h-2 rounded-full bg-cyber-pink ring-4 ring-cyber-pink/20" />
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
                <div className="w-px h-1.5 bg-cyber-neon/20" />
                <span className="mt-1 text-[10px] font-mono text-cyber-neon/50">
                  {i}s
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-blue ring-4 ring-cyber-blue/20" />
            <span className="text-cyber-blue/80">Block Seen</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-pink ring-4 ring-cyber-pink/20" />
            <span className="text-cyber-pink/80">First Attestation</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip
        id="timeline-tooltip"
        className="z-50 max-w-xs !bg-cyber-darker !border !border-cyber-neon/20 !text-cyber-neon !font-mono !text-xs !px-2 !py-1"
      />
    </div>
  )
} 