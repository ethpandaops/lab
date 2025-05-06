import { ReactNode, useContext, useEffect, useRef } from 'react';
import { Tooltip } from 'react-tooltip';
import { FaPlay, FaPause, FaEthereum } from 'react-icons/fa';
import NetworkContext from '@/contexts/NetworkContext';
import { formatEntityName } from '@/utils/format.ts';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface BlockEvent {
  type: 'block_seen';
  time: number;
  node: string;
  source: 'p2p' | 'api';
}

interface TimelineViewProps {
  slot?: number;
  isPlaying: boolean;
  currentTime: number;
  firstBlockSeen: BlockEvent | null;
  firstApiBlockSeen?: BlockEvent | null;
  firstP2pBlockSeen?: BlockEvent | null;
  attestationWindows?: Array<{
    start_ms: number;
    end_ms: number;
    validator_indices: number[];
  }>;
  attestationProgress: Array<{
    time: number;
    totalValidators: number;
  }>;
  ATTESTATION_THRESHOLD: number;
  TOTAL_VALIDATORS: number;
  loading: boolean;
  isMissing: boolean;
  onPlayPauseClick: () => void;
  proposerIndex?: number;
  entity?: string;
  executionBlockNumber?: number;
  isLive?: boolean;
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
  executionBlockNumber,
  isLive = false,
}: TimelineViewProps): JSX.Element {
  const epoch = slot ? Math.floor(slot / 32) : 0;
  const slotInEpoch = slot ? (slot % 32) + 1 : 0;
  const { selectedNetwork } = useContext(NetworkContext);
  const navigate = useNavigate();
  const timelineRef = useRef<HTMLDivElement>(null);

  const handlePreviousSlot = () => {
    if (slot) {
      navigate(`/beacon/slot/${slot - 1}?network=${selectedNetwork}`);
    }
  };

  const handleNextSlot = () => {
    if (slot && !isLive) {
      navigate(`/beacon/slot/${slot + 1}?network=${selectedNetwork}`);
    }
  };

  // Auto-scroll to keep current time position visible
  useEffect(() => {
    if (!timelineRef.current || loading || !attestationWindows || attestationWindows.length === 0)
      return;

    const container = timelineRef.current;
    const containerHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    // Calculate where we are in the timeline as a percentage
    const timelinePosition = currentTime / 12; // 12 seconds total

    // Convert that to pixels
    const targetScroll = Math.floor(scrollHeight * timelinePosition);

    // Keep the current time position in the middle of the viewport
    const scrollPosition = Math.max(0, targetScroll - containerHeight / 2);

    container.scrollTo({
      top: scrollPosition,
      behavior: isPlaying ? 'smooth' : 'auto',
    });
  }, [currentTime, loading, isPlaying]);

  // Reset scroll position when slot changes
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = 0;
    }
  }, [slot]);

  return (
    <div className="w-full md:max-w-[80%] mx-auto">
      <div
        className={clsx(
          'relative backdrop-blur-lg bg-surface/40 ring-1 ring-inset ring-white/5 rounded-lg overflow-hidden',
          loading && 'animate-pulse',
        )}
      >
        {/* Header with info */}
        <div className="flex flex-col space-y-4 p-3 sm:p-4">
          {/* Top row - Slot number and controls */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left side - Slot and entity */}
            <div className="flex flex-col space-y-2 max-w-full sm:max-w-[60%]">
              {loading ? (
                <>
                  <div className="h-10 w-32 bg-surface/50 rounded" />
                  <div className="h-6 w-48 bg-surface/50 rounded" />
                </>
              ) : (
                <>
                  <div className="text-3xl sm:text-4xl font-mono font-bold text-primary">
                    {slot}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-tertiary/50 text-base sm:text-lg">by</span>
                    {entity ? (
                      <a
                        href={`https://ethseer.io/entity/${entity}?network=${selectedNetwork}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xl sm:text-2xl font-mono font-medium text-accent flex items-baseline gap-2 hover:opacity-80 transition-opacity group truncate"
                      >
                        <span className="truncate">
                          {formatEntityName(entity).name}
                          {formatEntityName(entity).type && (
                            <span className="text-xs sm:text-sm text-tertiary/40 font-normal">
                              [{formatEntityName(entity).type}]
                            </span>
                          )}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xl sm:text-2xl font-mono font-medium text-accent">
                        Unknown
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-4">
              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousSlot}
                  className="w-12 h-12 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-surface hover:bg-hover transition-all border border-text-muted touch-manipulation"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={handleNextSlot}
                  disabled={isLive}
                  className={clsx(
                    'w-12 h-12 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all border touch-manipulation',
                    isLive
                      ? 'opacity-50 cursor-not-allowed bg-surface/50 border-text-muted/50'
                      : 'bg-surface hover:bg-hover border-text-muted',
                  )}
                >
                  <ChevronRight className="w-6 h-6 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Play/Pause button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onPlayPauseClick}
                  className="w-14 h-14 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-surface hover:bg-hover transition-all border border-text-muted touch-manipulation"
                >
                  {isPlaying ? (
                    <FaPause className="w-6 h-6 sm:w-5 sm:h-5" />
                  ) : (
                    <FaPlay className="w-6 h-6 sm:w-5 sm:h-5 ml-0.5" />
                  )}
                </button>
                <div className="text-center">
                  <span className="font-mono text-lg sm:text-xl text-primary">
                    {(currentTime / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row - Additional info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm font-mono text-tertiary">
            {loading ? (
              <div className="h-4 w-48 bg-surface/50 rounded" />
            ) : (
              <>
                <span>
                  Slot {slotInEpoch} of Epoch {epoch}
                </span>
                <span className="hidden sm:inline text-tertiary/50">·</span>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <FaEthereum className="w-3.5 h-3.5 text-accent" />
                    <span className="capitalize">{selectedNetwork}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="relative max-h-[20rem] overflow-y-auto">
          {/* Background sections */}
          <div className="absolute inset-0 flex">
            <div className="w-1/3 h-full bg-accent/5" />
            <div className="w-1/3 h-full bg-success/5" />
            <div className="w-1/3 h-full bg-yellow-400/5" />
          </div>

          {/* Section headers */}
          <div className="absolute inset-0">
            <div className="flex h-8 sm:h-7">
              <div className="w-1/3">
                <div className="text-[10px] sm:text-xs font-mono text-accent/80 font-medium p-2 sm:p-1.5 rounded-tl-lg backdrop-blur-sm">
                  Block Proposal
                </div>
              </div>
              <div className="w-1/3">
                <div className="text-[10px] sm:text-xs font-mono text-success/90 font-semibold p-2 sm:p-1.5 backdrop-blur-sm">
                  Attestation
                </div>
              </div>
              <div className="w-1/3">
                <div className="text-[10px] sm:text-xs font-mono text-yellow-400/80 font-medium p-2 sm:p-1.5 rounded-tr-lg backdrop-blur-sm">
                  Aggregation
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-active/30 to-active/10 transition-all duration-100"
              style={{ width: `${(currentTime / 12000) * 100}%` }}
            >
              <div className="absolute inset-y-0 right-0 w-1 bg-active" />
            </div>
          </div>

          {/* Event markers container */}
          <div className="absolute inset-x-0 bottom-8 sm:bottom-6 h-12 sm:h-10">
            {loading ? (
              <div className="absolute inset-0 flex justify-around items-center">
                <div className="w-2 h-2 rounded-full bg-surface/50" />
                <div className="w-2 h-2 rounded-full bg-surface/50" />
                <div className="w-2 h-2 rounded-full bg-surface/50" />
              </div>
            ) : (
              <>
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
                    <div className="w-px h-full bg-purple-500" />
                    <div className="absolute bottom-0 -mb-1.5 w-2 h-2 rounded-full bg-purple-500 ring-4 ring-purple-500/20" />
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
                    <div className="w-px h-full bg-success" />
                    <div className="absolute bottom-0 -mb-1.5 w-2 h-2 rounded-full bg-success ring-4 ring-success/20" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Time markers */}
          <div className="absolute inset-x-0 bottom-0 h-8 sm:h-6 flex">
            {Array.from({ length: 11 }).map((_, i) => {
              const time = i + 1;
              return (
                <div
                  key={time}
                  className="absolute bottom-0 flex flex-col items-center"
                  style={{ left: `${(time / 12) * 100}%` }}
                >
                  <div className="w-px h-2 sm:h-1.5 bg-primary/20" />
                  <span className="mt-1 text-[10px] font-mono text-muted">{time}s</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[10px] sm:text-xs font-mono p-3 sm:p-4">
          {loading ? (
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-surface/50 rounded" />
              <div className="h-4 w-24 bg-surface/50 rounded" />
              <div className="h-4 w-24 bg-surface/50 rounded" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent ring-4 ring-accent/20" />
                <span className="text-accent/80">Block Seen (API)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 ring-4 ring-purple-500/20" />
                <span className="text-purple-500/80">Block Seen (P2P)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success ring-4 ring-success/20" />
                <span className="text-success/80">First Attestation</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip
        id="timeline-tooltip"
        className="z-50 max-w-xs !bg-surface !text-primary !font-mono !text-xs !px-2 !py-1"
      />
    </div>
  );
}
