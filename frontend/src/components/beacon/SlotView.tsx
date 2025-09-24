import { useEffect, useMemo, useState } from 'react';
import { GlobalMap } from '@/components/beacon/GlobalMap';
import { EventTimeline } from '@/components/beacon/EventTimeline';
import { BottomPanel } from '@/components/beacon/BottomPanel/index';
import { DataAvailabilityPanel } from '@/components/beacon/DataAvailabilityPanel';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useModal } from '@/contexts/ModalContext.tsx';
import { useSlotData } from '@/hooks/useSlotData';

interface SlotViewProps {
  slot?: number;
  network?: string;
  isLive?: boolean;
  onSlotComplete?: () => void;
}

interface BlockEvent {
  type: 'block_seen';
  time: number;
  node: string;
  source: 'p2p' | 'api';
}

interface AttestationPoint {
  time: number;
  totalValidators: number;
}

interface EventData {
  time: number;
  index?: number;
}

interface Event {
  id: string;
  timestamp: number;
  type: string;
  node: string;
  location: string;
  data: EventData;
}

export function SlotView({
  slot,
  network = 'mainnet',
  isLive = false,
  onSlotComplete,
}: SlotViewProps) {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(isLive);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const navigate = useNavigate();
  const { showModal } = useModal();

  // Use the unified hook - it handles REST/gRPC switching internally
  const {
    data: slotData,
    isLoading,
    error,
  } = useSlotData({
    network,
    slot,
    isLive,
    enabled: true,
  });

  // Debug: Log the full payload
  useEffect(() => {
    if (slotData) {
      console.log(`=== Slot Data Payload ===`);
      console.log(`Slot: ${slot}`);
      console.log(`Network: ${network}`);
      console.log('Full payload:', JSON.stringify(slotData.toJson(), null, 2));
      console.log(`=== End Slot Data Payload ===`);
    }
  }, [slotData, slot, network]);

  // Optimistically fetch next slot data when we're close to the end
  // The unified hook will handle the prefetch internally based on API mode
  useSlotData({
    network,
    slot: slot ? slot + 1 : undefined,
    isLive: false,
    enabled: !!slot && currentTime >= 11000,
  });

  // Timer effect for playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        // Round to nearest 100ms for smoother updates
        const next = Math.floor((prev + 100) / 100) * 100;
        if (next >= 12000) {
          // 12 seconds
          clearInterval(interval);
          onSlotComplete?.();
          return 12000;
        }
        return next;
      });
    }, 100); // Update every 100ms instead of every frame

    return () => clearInterval(interval);
  }, [isPlaying, onSlotComplete]);

  // Reset timer when slot changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(isLive);
  }, [slot, isLive]);

  const totalValidators =
    slotData?.attestations?.windows?.reduce(
      (sum, window) => sum + (window.validatorIndices?.length || 0),
      0,
    ) || 0;
  const maxPossibleValidators = slotData?.attestations?.maximumVotes
    ? Number(slotData.attestations.maximumVotes)
    : 0;
  const attestationThreshold = Math.ceil(maxPossibleValidators * 0.66);

  const { attestationProgress } = useMemo(() => {
    if (!slotData)
      return {
        firstBlockSeen: null,
        firstApiBlockSeen: null,
        firstP2pBlockSeen: null,
        attestationProgress: [],
      };

    // Find first block seen event
    let firstBlock: BlockEvent | null = null;
    let firstApiBlock: BlockEvent | null = null;
    let firstP2pBlock: BlockEvent | null = null;

    // Check P2P events
    const p2pEvents = slotData.timings?.blockFirstSeenP2p || {};
    const p2pTimes = Object.values(p2pEvents);
    const firstP2pTime = p2pTimes.length > 0 ? Math.min(...p2pTimes.map(t => Number(t))) : Infinity;
    const firstP2pNode = Object.entries(p2pEvents).find(
      ([_, time]) => Number(time) === firstP2pTime,
    )?.[0];

    // Check API events
    const apiEvents = slotData.timings?.blockSeen || {};
    const apiTimes = Object.values(apiEvents);
    const firstApiTime = apiTimes.length > 0 ? Math.min(...apiTimes.map(t => Number(t))) : Infinity;
    const firstApiNode = Object.entries(apiEvents).find(
      ([_, time]) => Number(time) === firstApiTime,
    )?.[0];

    // Set first API block if exists
    if (firstApiNode) {
      firstApiBlock = {
        type: 'block_seen',
        time: firstApiTime,
        node: firstApiNode,
        source: 'api',
      };
    }

    // Set first P2P block if exists
    if (firstP2pNode) {
      firstP2pBlock = {
        type: 'block_seen',
        time: firstP2pTime,
        node: firstP2pNode,
        source: 'p2p',
      };
    }

    // Use API event if it's first, otherwise use P2P event for the combined firstBlockSeen
    if (firstApiNode && (!firstP2pNode || firstApiTime < firstP2pTime)) {
      firstBlock = firstApiBlock;
    } else if (firstP2pNode) {
      firstBlock = firstP2pBlock;
    }

    // Process attestations into cumulative progress
    const attestations: AttestationPoint[] = [];
    let runningTotal = 0;

    if (slotData.attestations?.windows) {
      // Sort windows by start time
      const sortedWindows = [...slotData.attestations.windows].sort(
        (a, b) => Number(a.startMs) - Number(b.startMs),
      );

      // Add initial point at 0ms
      attestations.push({
        time: 0,
        totalValidators: 0,
      });

      // Process each window
      sortedWindows.forEach(window => {
        const validatorCount = window.validatorIndices.length;

        // Add point at window start with current total
        attestations.push({
          time: Number(window.startMs),
          totalValidators: runningTotal,
        });

        // Update running total and add point at window end
        runningTotal += validatorCount;
        attestations.push({
          time: Number(window.endMs),
          totalValidators: runningTotal,
        });
      });

      // Add final point at 12s
      attestations.push({
        time: 12000,
        totalValidators: runningTotal,
      });
    }

    return {
      firstBlockSeen: firstBlock,
      firstApiBlockSeen: firstApiBlock,
      firstP2pBlockSeen: firstP2pBlock,
      attestationProgress: attestations,
    };
  }, [slotData]);

  const blockEvents = useMemo(() => {
    if (!slotData) return [];

    return [
      // Block seen events
      ...Object.entries(slotData.timings?.blockSeen || {}).map(([node, time]) => ({
        type: 'block_seen' as const,
        node,
        time: Number(time),
        source: 'api' as const,
      })),
      // Block P2P events
      ...Object.entries(slotData.timings?.blockFirstSeenP2p || {}).map(([node, time]) => ({
        type: 'block_seen' as const,
        node,
        time: Number(time),
        source: 'p2p' as const,
      })),
    ].sort((a, b) => a.time - b.time);
  }, [slotData]);

  // Convert block events to timeline events
  const timelineEvents = useMemo(() => {
    if (!slotData) return [];

    const events: Event[] = [];

    // Helper to get location string
    const getLocationString = (node: string) => {
      const nodeData = slotData.nodes[node];
      if (!nodeData?.geo) return 'Unknown Location';
      return nodeData.geo.country || nodeData.geo.continent || 'Unknown Location';
    };

    // Add block seen events
    Object.entries(slotData.timings?.blockSeen || {}).forEach(([node, time]) => {
      events.push({
        id: `block-seen-api-${node}-${time}`,
        timestamp: Number(time),
        type: 'Block Seen (API)',
        node,
        location: getLocationString(node),
        data: { time: Number(time) },
      });
    });

    // Add P2P block events
    Object.entries(slotData.timings?.blockFirstSeenP2p || {}).forEach(([node, time]) => {
      events.push({
        id: `block-seen-p2p-${node}-${time}`,
        timestamp: Number(time),
        type: 'Block Seen (P2P)',
        node,
        location: getLocationString(node),
        data: { time: Number(time) },
      });
    });

    // Add blob seen events
    Object.entries(slotData.timings?.blobSeen || {}).forEach(([node, blobData]) => {
      if (blobData) {
        if ('timings' in blobData) {
          // New structure with nested timings
          Object.entries(blobData.timings).forEach(([index, time]) => {
            events.push({
              id: `blob-seen-api-${node}-${index}-${time}`,
              timestamp: Number(time),
              type: 'Blob Seen (API)',
              node,
              location: getLocationString(node),
              data: { time: Number(time), index: parseInt(index) },
            });
          });
        } else {
          // Old structure without nested timings
          Object.entries(blobData).forEach(([index, time]) => {
            events.push({
              id: `blob-seen-api-${node}-${index}-${time}`,
              timestamp: Number(time),
              type: 'Blob Seen (API)',
              node,
              location: getLocationString(node),
              data: { time: Number(time), index: parseInt(index) },
            });
          });
        }
      }
    });

    // Add P2P blob events
    Object.entries(slotData.timings?.blobFirstSeenP2p || {}).forEach(([node, blobData]) => {
      if (blobData) {
        if ('timings' in blobData) {
          // New structure with nested timings
          Object.entries(blobData.timings).forEach(([index, time]) => {
            events.push({
              id: `blob-seen-p2p-${node}-${index}-${time}`,
              timestamp: Number(time),
              type: 'Blob Seen (P2P)',
              node,
              location: getLocationString(node),
              data: { time: Number(time), index: parseInt(index) },
            });
          });
        } else {
          // Old structure without nested timings
          Object.entries(blobData).forEach(([index, time]) => {
            events.push({
              id: `blob-seen-p2p-${node}-${index}-${time}`,
              timestamp: Number(time),
              type: 'Blob Seen (P2P)',
              node,
              location: getLocationString(node),
              data: { time: Number(time), index: parseInt(index) },
            });
          });
        }
      }
    });

    // Add attestation events
    slotData.attestations?.windows?.forEach((window, i) => {
      events.push({
        id: `attestation-${i}-${window.startMs}`,
        timestamp: Number(window.startMs),
        type: 'Attestation',
        node: `${window.validatorIndices.length} validators`,
        location: '',
        data: { time: Number(window.startMs) },
      });
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }, [slotData]);

  // Calculate what to show based on data availability
  const isMissingData = !slotData && isLive && slot !== undefined;

  // Find the winning bid based on matching block hash
  const winningBid = useMemo(() => {
    if (!slotData?.relayBids || !slotData?.block?.executionPayloadBlockHash) return null;

    // Check all relays for bids
    for (const [relayName, relayData] of Object.entries(slotData.relayBids)) {
      // Find a bid that matches the block hash
      const matchingBid = relayData.bids.find(
        bid => bid.blockHash === slotData.block?.executionPayloadBlockHash,
      );

      if (matchingBid) {
        // Convert wei value to ETH
        const valueInWei = BigInt(matchingBid.value);
        const valueInEth = Number(valueInWei) / 1e18;

        // Format ETH value with appropriate decimals based on size
        let formattedEth: string;
        if (valueInEth >= 100) {
          formattedEth = valueInEth.toFixed(2);
        } else if (valueInEth >= 10) {
          formattedEth = valueInEth.toFixed(3);
        } else {
          formattedEth = valueInEth.toFixed(4);
        }

        // Format time relative to slot start
        const timeMs = matchingBid.slotTime;
        const formattedTime =
          timeMs >= 0 ? `+${(timeMs / 1000).toFixed(2)}s` : `${(timeMs / 1000).toFixed(2)}s`;

        return {
          ...matchingBid,
          relay: relayName,
          valueInEth,
          formattedEth,
          formattedTime,
        };
      }
    }

    return null;
  }, [slotData?.relayBids, slotData?.block?.executionPayloadBlockHash]);

  // Helper function to convert nodes to correct type for components
  const getFormattedNodes = useMemo(() => {
    if (!slotData?.nodes) return {};

    return Object.fromEntries(
      Object.entries(slotData.nodes).map(([key, node]) => [
        key,
        {
          name: node.name,
          username: node.username,
          geo: {
            city: node.geo?.city || '',
            country: node.geo?.country || '',
            continent: node.geo?.continent || '',
            latitude: node.geo?.latitude,
            longitude: node.geo?.longitude,
          },
        },
      ]),
    );
  }, [slotData?.nodes]);

  // DataAvailabilityPanel nodes format
  const dataAvailabilityNodes = useMemo(() => {
    if (!slotData?.nodes) return undefined;

    return Object.fromEntries(
      Object.entries(slotData.nodes).map(([key, node]) => [
        key,
        {
          geo: {
            continent: node.geo?.continent,
          },
        },
      ]),
    );
  }, [slotData?.nodes]);

  return (
    <div className="w-full flex flex-col">
      {/* Main Content */}
      <div className="h-[calc(100vh-theme(spacing.16))] md:h-[calc(75vh-86px)] flex flex-col md:flex-row">
        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-full">
          {/* Map Section - Reduced height on mobile */}
          <div className="h-[30vh] border-b border-subtle"></div>

          {/* Compact Slot Details - More compact on mobile */}
          <div className="border-b border-subtle">
            <div className="p-1.5">
              {/* Slot Header - Compact */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-xl font-sans font-black text-primary">
                    <a
                      href={`https://beaconcha.in/slot/${slot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Slot {slot}
                    </a>
                  </div>
                  <div className="text-[10px] font-mono text-tertiary">
                    by{' '}
                    {slotData?.entity && ['mainnet', 'hoodi', 'sepolia'].includes(network) ? (
                      <a
                        href={`https://ethseer.io/entity/${slotData.entity}?network=${network}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/80"
                      >
                        {slotData.entity}
                      </a>
                    ) : (
                      <span className="text-accent">{slotData?.entity || 'Unknown'}</span>
                    )}
                  </div>
                  {/* Version and MEV Tags - Mobile */}
                  <div className="flex gap-1 mt-1">
                    {slotData?.block?.blockVersion && (
                      <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyber-dark border border-cyber-neon text-cyber-neon">
                        {slotData.block.blockVersion.toUpperCase()}
                      </div>
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
                              blobSeen: slotData?.timings?.blobSeen
                                ? Object.fromEntries(
                                    Object.entries(slotData.timings.blobSeen).map(
                                      ([node, blobs]) => [
                                        node,
                                        'timings' in blobs
                                          ? Object.fromEntries(
                                              Object.entries(blobs.timings).map(([idx, time]) => [
                                                idx,
                                                Number(time),
                                              ]),
                                            )
                                          : Object.fromEntries(
                                              Object.entries(blobs).map(([idx, time]) => [
                                                idx,
                                                Number(time),
                                              ]),
                                            ),
                                      ],
                                    ),
                                  )
                                : undefined,
                              blobFirstSeenP2p: slotData?.timings?.blobFirstSeenP2p
                                ? Object.fromEntries(
                                    Object.entries(slotData.timings.blobFirstSeenP2p).map(
                                      ([node, blobs]) => [
                                        node,
                                        'timings' in blobs
                                          ? Object.fromEntries(
                                              Object.entries(blobs.timings).map(([idx, time]) => [
                                                idx,
                                                Number(time),
                                              ]),
                                            )
                                          : Object.fromEntries(
                                              Object.entries(blobs).map(([idx, time]) => [
                                                idx,
                                                Number(time),
                                              ]),
                                            ),
                                      ],
                                    ),
                                  )
                                : undefined,
                              blockSeen: slotData?.timings?.blockSeen
                                ? Object.fromEntries(
                                    Object.entries(slotData.timings.blockSeen).map(
                                      ([node, time]) => [node, Number(time)],
                                    ),
                                  )
                                : undefined,
                              blockFirstSeenP2p: slotData?.timings?.blockFirstSeenP2p
                                ? Object.fromEntries(
                                    Object.entries(slotData.timings.blockFirstSeenP2p).map(
                                      ([node, time]) => [node, Number(time)],
                                    ),
                                  )
                                : undefined,
                            }}
                            currentTime={currentTime}
                            nodes={dataAvailabilityNodes}
                          />
                          <BottomPanel
                            attestationProgress={attestationProgress}
                            totalValidators={totalValidators}
                            attestationThreshold={attestationThreshold}
                            currentTime={currentTime}
                            loading={isLoading}
                            isMissing={isMissingData}
                            attestationWindows={slotData?.attestations?.windows?.map(window => ({
                              start_ms: Number(window.startMs),
                              end_ms: Number(window.endMs),
                              validator_indices: window.validatorIndices.map(Number),
                            }))}
                            maxPossibleValidators={maxPossibleValidators}
                          />
                        </div>
                      </div>,
                    );
                  }}
                  className="bg-accent text-black font-medium px-2 py-1 text-xs rounded-full shadow-lg hover:bg-accent/90 transition-colors"
                >
                  View Stats
                </button>
              </div>

              {/* Analysis Section - Always visible on mobile */}
              {slotData && (
                <div className="bg-surface/30 rounded text-xs font-mono space-y-0.5">
                  {(() => {
                    // Get first block seen time
                    const blockSeenTimes = [
                      ...Object.values(slotData.timings?.blockSeen || {}).map(time => Number(time)),
                      ...Object.values(slotData.timings?.blockFirstSeenP2p || {}).map(time =>
                        Number(time),
                      ),
                    ];
                    const firstBlockTime =
                      blockSeenTimes.length > 0 ? Math.min(...blockSeenTimes) : null;

                    // Get first blob seen time
                    const blobSeenTimes: number[] = [];
                    // Process blob_seen with nested structure
                    if (slotData.timings?.blobSeen) {
                      Object.values(slotData.timings.blobSeen).forEach(nodeData => {
                        if ('timings' in nodeData) {
                          // New structure with nested timings
                          Object.values(nodeData.timings).forEach(time =>
                            blobSeenTimes.push(Number(time)),
                          );
                        } else {
                          // Old structure without nested timings
                          Object.values(nodeData).forEach(time => blobSeenTimes.push(Number(time)));
                        }
                      });
                    }

                    // Process blob_first_seen_p2p with nested structure
                    if (slotData.timings?.blobFirstSeenP2p) {
                      Object.values(slotData.timings.blobFirstSeenP2p).forEach(nodeData => {
                        if ('timings' in nodeData) {
                          // New structure with nested timings
                          Object.values(nodeData.timings).forEach(time =>
                            blobSeenTimes.push(Number(time)),
                          );
                        } else {
                          // Old structure without nested timings
                          Object.values(nodeData).forEach(time => blobSeenTimes.push(Number(time)));
                        }
                      });
                    }

                    const firstBlobTime =
                      blobSeenTimes.length > 0 ? Math.min(...blobSeenTimes) : null;

                    // Calculate blob count
                    const blobIndices = new Set();

                    // Handle blob_seen with nested timings structure
                    if (slotData?.timings?.blobSeen) {
                      Object.values(slotData.timings.blobSeen).forEach(nodeData => {
                        if ('timings' in nodeData) {
                          // New structure with nested timings
                          Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
                        } else {
                          // Old structure without nested timings
                          Object.keys(nodeData).forEach(index => blobIndices.add(index));
                        }
                      });
                    }

                    // Handle blob_first_seen_p2p
                    if (slotData?.timings?.blobFirstSeenP2p) {
                      Object.values(slotData.timings.blobFirstSeenP2p).forEach(nodeData => {
                        if ('timings' in nodeData) {
                          // New structure with nested timings
                          Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
                        } else {
                          // Old structure without nested timings
                          Object.keys(nodeData).forEach(index => blobIndices.add(index));
                        }
                      });
                    }

                    // Calculate gas metrics
                    const gasUsage = slotData.block?.executionPayloadGasUsed;
                    const gasLimit = slotData.block?.executionPayloadGasLimit;
                    const gasUsagePercent =
                      gasUsage && gasLimit
                        ? Math.min((Number(gasUsage) / Number(gasLimit)) * 100, 100)
                        : null;

                    // Get total validators and attestations
                    const totalAttestations =
                      slotData.attestations?.windows?.reduce(
                        (sum, window) => sum + window.validatorIndices.length,
                        0,
                      ) || 0;

                    // Use pre-calculated participation from transformer
                    const participation = (slotData as any).participationRate || null;

                    const hasMevRelay =
                      slotData?.deliveredPayloads &&
                      Object.keys(slotData.deliveredPayloads).length > 0;

                    return (
                      <>
                        {/* Block Timing */}
                        <div
                          className={clsx(
                            'grid grid-cols-[16px_1fr] items-start gap-1',
                            firstBlockTime === null && 'text-tertiary',
                            firstBlockTime !== null && firstBlockTime <= 2000 && 'text-success',
                            firstBlockTime !== null &&
                              firstBlockTime > 2000 &&
                              firstBlockTime <= 3000 &&
                              'text-warning',
                            firstBlockTime !== null && firstBlockTime > 3000 && 'text-error',
                          )}
                        >
                          <div className="flex justify-center">
                            {firstBlockTime === null
                              ? '○'
                              : firstBlockTime > 3000
                                ? '⚠️'
                                : firstBlockTime > 2000
                                  ? '⚡'
                                  : '✓'}
                          </div>
                          <div className="text-[10px]">
                            {firstBlockTime === null
                              ? 'Block timing unknown'
                              : firstBlockTime > 3000
                                ? `Block proposed late (${(firstBlockTime / 1000).toFixed(2)}s)`
                                : firstBlockTime > 2000
                                  ? `Block slightly delayed (${(firstBlockTime / 1000).toFixed(2)}s)`
                                  : `Block on time (${(firstBlockTime / 1000).toFixed(2)}s)`}
                          </div>
                        </div>

                        {/* Blob Timing */}
                        <div
                          className={clsx(
                            'grid grid-cols-[16px_1fr] items-start gap-1',
                            (!firstBlobTime || !firstBlockTime || blobIndices.size === 0) &&
                              'text-tertiary',
                            blobIndices.size > 0 &&
                              firstBlobTime &&
                              firstBlockTime &&
                              firstBlobTime - firstBlockTime <= 500 &&
                              'text-success',
                            blobIndices.size > 0 &&
                              firstBlobTime &&
                              firstBlockTime &&
                              firstBlobTime - firstBlockTime > 500 &&
                              firstBlobTime - firstBlockTime <= 1000 &&
                              'text-warning',
                            blobIndices.size > 0 &&
                              firstBlobTime &&
                              firstBlockTime &&
                              firstBlobTime - firstBlockTime > 1000 &&
                              'text-error',
                          )}
                        >
                          <div className="flex justify-center">
                            {blobIndices.size === 0
                              ? '○'
                              : !firstBlobTime || !firstBlockTime
                                ? '○'
                                : firstBlobTime - firstBlockTime > 1000
                                  ? '⚠️'
                                  : firstBlobTime - firstBlockTime > 500
                                    ? '⚡'
                                    : '✓'}
                          </div>
                          <div className="text-[10px]">
                            {blobIndices.size === 0
                              ? 'No blobs in block'
                              : !firstBlobTime || !firstBlockTime
                                ? `Blobs: ${Number(blobIndices.size)}`
                                : firstBlobTime - firstBlockTime > 1000
                                  ? `Slow blob delivery (+${((firstBlobTime - firstBlockTime) / 1000).toFixed(2)}s)`
                                  : firstBlobTime - firstBlockTime > 500
                                    ? `Moderate blob delay (+${((firstBlobTime - firstBlockTime) / 1000).toFixed(2)}s)`
                                    : `Fast blob delivery (+${((firstBlobTime - firstBlockTime) / 1000).toFixed(2)}s)`}
                          </div>
                        </div>

                        {/* Gas Usage */}
                        <div
                          className={clsx(
                            'grid grid-cols-[16px_1fr] items-start gap-1',
                            !gasUsagePercent && 'text-tertiary',
                            gasUsagePercent && gasUsagePercent <= 80 && 'text-success',
                            gasUsagePercent && gasUsagePercent > 80 && 'text-warning',
                          )}
                        >
                          <div className="flex justify-center">
                            {!gasUsagePercent
                              ? '○'
                              : gasUsagePercent > 95
                                ? '⚡'
                                : gasUsagePercent > 80
                                  ? '⚡'
                                  : '✓'}
                          </div>
                          <div className="text-[10px]">
                            {!gasUsagePercent
                              ? 'Gas usage unknown'
                              : gasUsagePercent > 95
                                ? `High gas usage (${gasUsagePercent.toFixed(1)}%)`
                                : gasUsagePercent > 80
                                  ? `Elevated gas usage (${gasUsagePercent.toFixed(1)}%)`
                                  : `Normal gas usage (${gasUsagePercent.toFixed(1)}%)`}
                          </div>
                        </div>

                        {/* Participation */}
                        <div
                          className={clsx(
                            'grid grid-cols-[16px_1fr] items-start gap-1',
                            !participation && 'text-tertiary',
                            participation && participation >= 80 && 'text-success',
                            participation &&
                              participation >= 66 &&
                              participation < 80 &&
                              'text-warning',
                            participation && participation < 66 && 'text-error',
                          )}
                        >
                          <div className="flex justify-center">
                            {!participation
                              ? '○'
                              : participation < 66
                                ? '⚠️'
                                : participation < 80
                                  ? '⚡'
                                  : '✓'}
                          </div>
                          <div className="text-[10px]">
                            {!participation
                              ? 'Participation unknown'
                              : participation < 66
                                ? `Low participation (${participation.toFixed(1)}%)`
                                : participation < 80
                                  ? `Moderate participation (${participation.toFixed(1)}%)`
                                  : `Good participation (${participation.toFixed(1)}%)`}
                          </div>
                        </div>

                        {/* MEV Relay */}
                        {hasMevRelay ? (
                          <div className="grid grid-cols-[16px_1fr] items-start gap-1 text-amber-400">
                            <div className="flex justify-center">⚡</div>
                            <div className="text-[10px]">
                              Delivered via {Object.keys(slotData.deliveredPayloads).length} MEV{' '}
                              {Object.keys(slotData.deliveredPayloads).length === 1
                                ? 'Relay'
                                : 'Relays'}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-[16px_1fr] items-start gap-1 text-success">
                            <div className="flex justify-center">✓</div>
                            <div className="text-[10px]">Block built locally</div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* MEV Information (Mobile) */}
              <div className="mt-1.5 bg-surface/30 rounded p-1.5">
                <div className="text-[10px] font-medium mb-1 text-primary">MEV Data</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono text-primary">
                  <div>
                    <div className="text-tertiary">Bid Value</div>
                    {winningBid ? (
                      <div className="text-amber-400 font-medium">
                        {winningBid.formattedEth} ETH
                      </div>
                    ) : (
                      <div className="text-tertiary">0.0000 ETH</div>
                    )}
                  </div>
                  <div>
                    <div className="text-tertiary">Bid Time</div>
                    {winningBid ? (
                      <div>{winningBid.formattedTime}</div>
                    ) : (
                      <div className="text-tertiary">--</div>
                    )}
                  </div>
                  <div>
                    <div className="text-tertiary">Relay</div>
                    {winningBid ? (
                      <div>{winningBid.relay}</div>
                    ) : (
                      <div className="text-tertiary">--</div>
                    )}
                  </div>
                  <div>
                    <div className="text-tertiary">Builder</div>
                    {winningBid ? (
                      <div className="truncate" title={winningBid.builderPubkey}>
                        {winningBid.builderPubkey.substring(0, 6)}...
                      </div>
                    ) : (
                      <div className="text-tertiary">--</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline and Events - Fill remaining space */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
                  navigate(`/beacon/slot/${slot - 1}?network=${network}`);
                }
              }}
              onNextSlot={() => {
                if (slot && !isLive) {
                  navigate(`/beacon/slot/${slot + 1}?network=${network}`);
                }
              }}
              isLive={isLive}
              className="h-full pb-4"
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-1 flex-row">
          {/* Left Sidebar - Details */}
          <div className="w-[20%] border-r border-subtle h-full">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Slot Header */}
                <div className="mb-3 p-2">
                  <div className="text-4xl font-sans font-black text-primary mb-1">
                    <a
                      href={`https://beaconcha.in/slot/${slot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent"
                    >
                      {slot}
                    </a>
                  </div>
                  <div className="text-sm font-mono">
                    <span className="text-tertiary">
                      by{' '}
                      {slotData?.entity && ['mainnet', 'hoodi', 'sepolia'].includes(network) ? (
                        <a
                          href={`https://ethseer.io/entity/${slotData.entity}?network=${network}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent/80"
                        >
                          {slotData.entity}
                        </a>
                      ) : (
                        <span className="text-accent">{slotData?.entity || 'Unknown'}</span>
                      )}
                    </span>
                  </div>
                  {slotData?.block?.blockVersion && (
                    <div className="mt-2 flex gap-1">
                      <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyber-dark border border-cyber-neon text-cyber-neon">
                        {slotData.block.blockVersion.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis Section */}
                {slotData && (
                  <div className="mb-3 p-2 bg-surface/30 rounded text-xs font-mono space-y-0.5">
                    {(() => {
                      // Get first block seen time
                      const blockSeenTimes = [
                        ...Object.values(slotData.timings?.blockSeen || {}).map(time =>
                          Number(time),
                        ),
                        ...Object.values(slotData.timings?.blockFirstSeenP2p || {}).map(time =>
                          Number(time),
                        ),
                      ];
                      const firstBlockTime =
                        blockSeenTimes.length > 0 ? Math.min(...blockSeenTimes) : null;

                      // Get first blob seen time
                      const blobSeenTimes: number[] = [];
                      // Process blob_seen with nested structure
                      if (slotData.timings?.blobSeen) {
                        Object.values(slotData.timings.blobSeen).forEach(nodeData => {
                          if ('timings' in nodeData) {
                            // New structure with nested timings
                            Object.values(nodeData.timings).forEach(time =>
                              blobSeenTimes.push(Number(time)),
                            );
                          } else {
                            // Old structure without nested timings
                            Object.values(nodeData).forEach(time =>
                              blobSeenTimes.push(Number(time)),
                            );
                          }
                        });
                      }

                      // Process blob_first_seen_p2p with nested structure
                      if (slotData.timings?.blobFirstSeenP2p) {
                        Object.values(slotData.timings.blobFirstSeenP2p).forEach(nodeData => {
                          if ('timings' in nodeData) {
                            // New structure with nested timings
                            Object.values(nodeData.timings).forEach(time =>
                              blobSeenTimes.push(Number(time)),
                            );
                          } else {
                            // Old structure without nested timings
                            Object.values(nodeData).forEach(time =>
                              blobSeenTimes.push(Number(time)),
                            );
                          }
                        });
                      }

                      const firstBlobTime =
                        blobSeenTimes.length > 0 ? Math.min(...blobSeenTimes) : null;

                      // Calculate blob count
                      const blobIndices = new Set();

                      // Handle blob_seen with nested timings structure
                      if (slotData?.timings?.blobSeen) {
                        Object.values(slotData.timings.blobSeen).forEach(nodeData => {
                          if ('timings' in nodeData) {
                            // New structure with nested timings
                            Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
                          } else {
                            // Old structure without nested timings
                            Object.keys(nodeData).forEach(index => blobIndices.add(index));
                          }
                        });
                      }

                      // Handle blob_first_seen_p2p
                      if (slotData?.timings?.blobFirstSeenP2p) {
                        Object.values(slotData.timings.blobFirstSeenP2p).forEach(nodeData => {
                          if ('timings' in nodeData) {
                            // New structure with nested timings
                            Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
                          } else {
                            // Old structure without nested timings
                            Object.keys(nodeData).forEach(index => blobIndices.add(index));
                          }
                        });
                      }

                      // Calculate gas metrics
                      const gasUsage = slotData.block?.executionPayloadGasUsed;
                      const gasLimit = slotData.block?.executionPayloadGasLimit;
                      const gasUsagePercent =
                        gasUsage && gasLimit
                          ? Math.min((Number(gasUsage) / Number(gasLimit)) * 100, 100)
                          : null;

                      // Get total validators and attestations
                      const totalAttestations =
                        slotData.attestations?.windows?.reduce(
                          (sum, window) => sum + window.validatorIndices.length,
                          0,
                        ) || 0;

                      // Calculate participation based on actual attestations
                      const maxPossibleValidators = slotData.attestations?.maximumVotes
                        ? Number(slotData.attestations.maximumVotes)
                        : 0;
                      const participation =
                        maxPossibleValidators > 0
                          ? (totalAttestations / maxPossibleValidators) * 100
                          : null;

                      const hasMevRelay =
                        slotData?.deliveredPayloads &&
                        Object.keys(slotData.deliveredPayloads).length > 0;

                      return (
                        <>
                          {/* Block Timing */}
                          <div
                            className={clsx(
                              'grid grid-cols-[16px_1fr] items-start gap-1',
                              firstBlockTime === null && 'text-tertiary',
                              firstBlockTime !== null && firstBlockTime <= 2000 && 'text-success',
                              firstBlockTime !== null &&
                                firstBlockTime > 2000 &&
                                firstBlockTime <= 3000 &&
                                'text-warning',
                              firstBlockTime !== null && firstBlockTime > 3000 && 'text-error',
                            )}
                          >
                            <div className="flex justify-center">
                              {firstBlockTime === null
                                ? '○'
                                : firstBlockTime > 3000
                                  ? '⚠️'
                                  : firstBlockTime > 2000
                                    ? '⚡'
                                    : '✓'}
                            </div>
                            <div className="text-[10px]">
                              {firstBlockTime === null
                                ? 'Block timing unknown'
                                : firstBlockTime > 3000
                                  ? `Block proposed late (${(firstBlockTime / 1000).toFixed(2)}s)`
                                  : firstBlockTime > 2000
                                    ? `Block slightly delayed (${(firstBlockTime / 1000).toFixed(2)}s)`
                                    : `Block on time (${(firstBlockTime / 1000).toFixed(2)}s)`}
                            </div>
                          </div>

                          {/* Blob Timing */}
                          <div
                            className={clsx(
                              'grid grid-cols-[16px_1fr] items-start gap-1',
                              (!firstBlobTime || !firstBlockTime || blobIndices.size === 0) &&
                                'text-tertiary',
                              blobIndices.size > 0 &&
                                firstBlobTime &&
                                firstBlockTime &&
                                firstBlobTime - firstBlockTime <= 500 &&
                                'text-success',
                              blobIndices.size > 0 &&
                                firstBlobTime &&
                                firstBlockTime &&
                                firstBlobTime - firstBlockTime > 500 &&
                                firstBlobTime - firstBlockTime <= 1000 &&
                                'text-warning',
                              blobIndices.size > 0 &&
                                firstBlobTime &&
                                firstBlockTime &&
                                firstBlobTime - firstBlockTime > 1000 &&
                                'text-error',
                            )}
                          >
                            <div className="flex justify-center">
                              {blobIndices.size === 0
                                ? '○'
                                : !firstBlobTime || !firstBlockTime
                                  ? '○'
                                  : firstBlobTime - firstBlockTime > 1000
                                    ? '⚠️'
                                    : firstBlobTime - firstBlockTime > 500
                                      ? '⚡'
                                      : '✓'}
                            </div>
                            <div className="text-[10px]">
                              {blobIndices.size === 0
                                ? 'No blobs in block'
                                : !firstBlobTime || !firstBlockTime
                                  ? `Blobs: ${Number(blobIndices.size)}`
                                  : firstBlobTime - firstBlockTime > 1000
                                    ? `Slow blob delivery (+${((firstBlobTime - firstBlockTime) / 1000).toFixed(2)}s)`
                                    : firstBlobTime - firstBlockTime > 500
                                      ? `Moderate blob delay (+${((firstBlobTime - firstBlockTime) / 1000).toFixed(2)}s)`
                                      : `Fast blob delivery (+${((firstBlobTime - firstBlockTime) / 1000).toFixed(2)}s)`}
                            </div>
                          </div>

                          {/* Gas Usage */}
                          <div
                            className={clsx(
                              'grid grid-cols-[16px_1fr] items-start gap-1',
                              !gasUsagePercent && 'text-tertiary',
                              gasUsagePercent && gasUsagePercent <= 80 && 'text-success',
                              gasUsagePercent && gasUsagePercent > 80 && 'text-warning',
                            )}
                          >
                            <div className="flex justify-center">
                              {!gasUsagePercent
                                ? '○'
                                : gasUsagePercent > 95
                                  ? '⚡'
                                  : gasUsagePercent > 80
                                    ? '⚡'
                                    : '✓'}
                            </div>
                            <div className="text-[10px]">
                              {!gasUsagePercent
                                ? 'Gas usage unknown'
                                : gasUsagePercent > 95
                                  ? `High gas usage (${gasUsagePercent.toFixed(1)}%)`
                                  : gasUsagePercent > 80
                                    ? `Elevated gas usage (${gasUsagePercent.toFixed(1)}%)`
                                    : `Normal gas usage (${gasUsagePercent.toFixed(1)}%)`}
                            </div>
                          </div>

                          {/* Participation */}
                          <div
                            className={clsx(
                              'grid grid-cols-[16px_1fr] items-start gap-1',
                              !participation && 'text-tertiary',
                              participation && participation >= 80 && 'text-success',
                              participation &&
                                participation >= 66 &&
                                participation < 80 &&
                                'text-warning',
                              participation && participation < 66 && 'text-error',
                            )}
                          >
                            <div className="flex justify-center">
                              {!participation
                                ? '○'
                                : participation < 66
                                  ? '⚠️'
                                  : participation < 80
                                    ? '⚡'
                                    : '✓'}
                            </div>
                            <div className="text-[10px]">
                              {!participation
                                ? 'Participation unknown'
                                : participation < 66
                                  ? `Low participation (${participation.toFixed(1)}%)`
                                  : participation < 80
                                    ? `Moderate participation (${participation.toFixed(1)}%)`
                                    : `Good participation (${participation.toFixed(1)}%)`}
                            </div>
                          </div>

                          {/* MEV Relay */}
                          {hasMevRelay ? (
                            <div className="grid grid-cols-[16px_1fr] items-start gap-1 text-amber-400">
                              <div className="flex justify-center">⚡</div>
                              <div className="text-[10px]">
                                Delivered via {Object.keys(slotData.deliveredPayloads).length} MEV{' '}
                                {Object.keys(slotData.deliveredPayloads).length === 1
                                  ? 'Relay'
                                  : 'Relays'}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-[16px_1fr] items-start gap-1 text-success">
                              <div className="flex justify-center">✓</div>
                              <div className="text-[10px]">Block built locally</div>
                            </div>
                          )}
                        </>
                      );
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
                      <div className="col-span-2 grid grid-cols-2 gap-x-4">
                        <div>
                          <div className="text-tertiary">Validator</div>
                          <div className="text-primary">
                            <a
                              href={`https://beaconcha.in/validator/${String(slotData?.proposer?.proposerValidatorIndex)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-accent transition-colors"
                            >
                              {String(slotData?.proposer?.proposerValidatorIndex) || 'Unknown'}
                            </a>
                          </div>
                        </div>
                        {slotData?.block?.executionPayloadBlockNumber ? (
                          <div>
                            <div className="text-tertiary">Block</div>
                            <div className="text-primary">
                              <a
                                href={`https://etherscan.io/block/${String(slotData.block.executionPayloadBlockNumber)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-accent transition-colors"
                              >
                                {String(slotData.block.executionPayloadBlockNumber)}
                              </a>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Block Stats */}
                  <div className="p-2 bg-surface/50 rounded">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <div className="text-tertiary">Txns</div>
                        <div className="text-primary">
                          {slotData?.block?.executionPayloadTransactionsCount?.toLocaleString() ||
                            '0'}
                        </div>
                      </div>

                      {slotData?.block?.blockTotalBytes ? (
                        <div>
                          <div className="text-tertiary">Size</div>
                          <div className="text-primary">
                            {(Number(slotData.block.blockTotalBytes) / 1024).toFixed(1)}KB
                          </div>
                        </div>
                      ) : null}

                      {slotData?.block?.executionPayloadGasUsed ? (
                        <div className="col-span-2 grid grid-cols-2 gap-x-4">
                          <div>
                            <div className="text-tertiary">Gas</div>
                            <div className="text-primary">
                              {(Number(slotData.block.executionPayloadGasUsed) / 1e6).toFixed(1)}M /{' '}
                              {(Number(slotData.block.executionPayloadGasLimit!) / 1e6).toFixed(1)}M
                            </div>
                          </div>
                          {slotData?.block?.executionPayloadBaseFeePerGas ? (
                            <div>
                              <div className="text-tertiary">Base Fee</div>
                              <div className="text-primary">
                                {(
                                  Number(slotData.block.executionPayloadBaseFeePerGas) / 1e9
                                ).toFixed(2)}{' '}
                                Gwei
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
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
                              ...Object.values(slotData?.timings?.blockSeen || {}).map(time =>
                                Number(time),
                              ),
                              ...Object.values(slotData?.timings?.blockFirstSeenP2p || {}).map(
                                time => Number(time),
                              ),
                            ];
                            const firstTime = times.length > 0 ? Math.min(...times) : null;
                            const firstNode = Object.entries(slotData?.timings?.blockSeen || {})
                              .concat(Object.entries(slotData?.timings?.blockFirstSeenP2p || {}))
                              .find(([_, time]) => Number(time) === firstTime)?.[0];
                            const nodeData = firstNode ? slotData?.nodes[firstNode] : null;
                            const country =
                              nodeData?.geo?.country || nodeData?.geo?.continent || 'Unknown';

                            return firstTime
                              ? `${(firstTime / 1000).toFixed(2)}s (${country})`
                              : '-';
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-tertiary">Blobs</div>
                        <div className="text-primary">
                          {(() => {
                            if (
                              !slotData?.timings?.blobSeen &&
                              !slotData?.timings?.blobFirstSeenP2p
                            )
                              return '0';
                            const blobIndices = new Set();

                            // Handle blob_seen with nested timings structure
                            if (slotData?.timings?.blobSeen) {
                              Object.values(slotData.timings.blobSeen).forEach(nodeData => {
                                if ('timings' in nodeData) {
                                  // New structure with nested timings
                                  Object.keys(nodeData.timings).forEach(index =>
                                    blobIndices.add(index),
                                  );
                                } else {
                                  // Old structure without nested timings
                                  Object.keys(nodeData).forEach(index => blobIndices.add(index));
                                }
                              });
                            }

                            // Handle blob_first_seen_p2p
                            if (slotData?.timings?.blobFirstSeenP2p) {
                              Object.values(slotData.timings.blobFirstSeenP2p).forEach(nodeData => {
                                if ('timings' in nodeData) {
                                  // New structure with nested timings
                                  Object.keys(nodeData.timings).forEach(index =>
                                    blobIndices.add(index),
                                  );
                                } else {
                                  // Old structure without nested timings
                                  Object.keys(nodeData).forEach(index => blobIndices.add(index));
                                }
                              });
                            }

                            return Number(blobIndices.size);
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-tertiary">Nodes Seen</div>
                        <div className="text-primary">
                          {(() => {
                            const nodes = new Set([
                              ...Object.keys(slotData?.timings?.blockSeen || {}),
                              ...Object.keys(slotData?.timings?.blockFirstSeenP2p || {}),
                            ]);
                            return nodes.size || '0';
                          })()}
                        </div>
                      </div>
                      {/* MEV Relay Information */}
                      <div className="col-span-2">
                        <div className="text-tertiary">Attestations</div>
                        <div className="text-primary">
                          {(() => {
                            const totalAttestations =
                              slotData?.attestations?.windows?.reduce(
                                (sum, window) => sum + window.validatorIndices.length,
                                0,
                              ) || 0;
                            const maxAttestations = slotData?.attestations?.maximumVotes || 0;
                            return `${totalAttestations.toLocaleString()} / ${maxAttestations.toLocaleString()}`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MEV Information Section */}
                  <div className="p-2 bg-surface/50 rounded mt-2">
                    <div className="text-sm font-medium mb-1.5 text-primary">MEV Data</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                      <div>
                        <div className="text-tertiary">Bid Value</div>
                        {winningBid ? (
                          <div className="text-primary text-amber-400 font-medium">
                            {winningBid.formattedEth} ETH
                          </div>
                        ) : (
                          <div className="text-tertiary">0.0000 ETH</div>
                        )}
                      </div>
                      <div>
                        <div className="text-tertiary">Bid Time</div>
                        {winningBid ? (
                          <div className="text-primary">{winningBid.formattedTime}</div>
                        ) : (
                          <div className="text-tertiary">--</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Map */}
          <div className="w-[60%] h-full border-r border-subtle">
            <GlobalMap
              nodes={getFormattedNodes}
              currentTime={currentTime}
              blockEvents={blockEvents}
              loading={isLoading || !!error}
              isMissing={isMissingData || !!error}
              slot={slotData?.slot ? Number(slotData.slot) : undefined}
              proposer={slotData?.entity || 'Unknown'}
              proposerIndex={
                slotData?.proposer?.proposerValidatorIndex
                  ? Number(slotData.proposer.proposerValidatorIndex)
                  : undefined
              }
              txCount={
                slotData?.block?.executionPayloadTransactionsCount
                  ? Number(slotData.block.executionPayloadTransactionsCount)
                  : 0
              }
              blockSize={
                slotData?.block?.blockTotalBytes
                  ? Number(slotData.block.blockTotalBytes)
                  : undefined
              }
              baseFee={
                slotData?.block?.executionPayloadBaseFeePerGas
                  ? Number(slotData.block.executionPayloadBaseFeePerGas)
                  : undefined
              }
              gasUsed={
                slotData?.block?.executionPayloadGasUsed
                  ? Number(slotData.block.executionPayloadGasUsed)
                  : undefined
              }
              gasLimit={
                slotData?.block?.executionPayloadGasLimit
                  ? Number(slotData.block.executionPayloadGasLimit)
                  : undefined
              }
              executionBlockNumber={
                slotData?.block?.executionPayloadBlockNumber
                  ? Number(slotData.block.executionPayloadBlockNumber)
                  : undefined
              }
              hideDetails={true}
            />
          </div>

          {/* Right Sidebar - Timeline */}
          <div className="w-[20%] h-full flex flex-col">
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
                  navigate(`/beacon/slot/${slot - 1}?network=${network}`);
                }
              }}
              onNextSlot={() => {
                if (slot && !isLive) {
                  navigate(`/beacon/slot/${slot + 1}?network=${network}`);
                }
              }}
              isLive={isLive}
              className="flex-1 overflow-y-auto"
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Desktop Only */}
      <div className="hidden md:flex flex-col h-[calc(25vh)]">
        <div className="h-full bg-surface/90 backdrop-blur-md border-t border-subtle">
          <div className="h-full w-full grid grid-cols-3">
            {/* Data Availability Section */}
            <div className="col-span-2 p-4 border-r border-subtle">
              <DataAvailabilityPanel
                blobTimings={{
                  blobSeen: slotData?.timings?.blobSeen
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blobSeen).map(([node, blobs]) => [
                          node,
                          'timings' in blobs
                            ? Object.fromEntries(
                                Object.entries(blobs.timings).map(([idx, time]) => [
                                  idx,
                                  Number(time),
                                ]),
                              )
                            : Object.fromEntries(
                                Object.entries(blobs).map(([idx, time]) => [idx, Number(time)]),
                              ),
                        ]),
                      )
                    : undefined,
                  blobFirstSeenP2p: slotData?.timings?.blobFirstSeenP2p
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blobFirstSeenP2p).map(([node, blobs]) => [
                          node,
                          'timings' in blobs
                            ? Object.fromEntries(
                                Object.entries(blobs.timings).map(([idx, time]) => [
                                  idx,
                                  Number(time),
                                ]),
                              )
                            : Object.fromEntries(
                                Object.entries(blobs).map(([idx, time]) => [idx, Number(time)]),
                              ),
                        ]),
                      )
                    : undefined,
                  blockSeen: slotData?.timings?.blockSeen
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blockSeen).map(([node, time]) => [
                          node,
                          Number(time),
                        ]),
                      )
                    : undefined,
                  blockFirstSeenP2p: slotData?.timings?.blockFirstSeenP2p
                    ? Object.fromEntries(
                        Object.entries(slotData.timings.blockFirstSeenP2p).map(([node, time]) => [
                          node,
                          Number(time),
                        ]),
                      )
                    : undefined,
                }}
                currentTime={currentTime}
                nodes={dataAvailabilityNodes}
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
                attestationWindows={slotData?.attestations?.windows?.map(window => ({
                  start_ms: Number(window.startMs),
                  end_ms: Number(window.endMs),
                  validator_indices: window.validatorIndices.map(Number),
                }))}
                maxPossibleValidators={maxPossibleValidators}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
