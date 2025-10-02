import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useModal } from '@/contexts/ModalContext.tsx';
import { useSlotData } from '@/hooks/useSlotData';
import { useSlotProgress, useSlotState, useSlotActions, useSlotConfig } from '@/hooks/useSlot';
import { SlotViewMobileDetails } from './SlotView/SlotViewMobileDetails';
import { SlotViewDesktopDetails } from './SlotView/SlotViewDesktopDetails';
import { SlotViewMap } from './SlotView/SlotViewMap';
import { SlotViewTimeline } from './SlotView/SlotViewTimeline';
import { SlotViewBottomPanels } from './SlotView/SlotViewBottomPanels';
import type { WinningBid } from './SlotView/types';

interface SlotViewProps {
  slot?: number;
  network?: string;
  onSlotComplete?: () => void;
  slotProgress?: number;
  showMap?: boolean;
  showTimeline?: boolean;
  showBottomPanel?: boolean;
  showDetails?: boolean;
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
  onSlotComplete,
  slotProgress,
  showMap = true,
  showTimeline = true,
  showBottomPanel = true,
  showDetails = true,
}: SlotViewProps) {
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const navigate = useNavigate();
  const { showModal } = useModal();

  // Always use context now - no standalone mode
  const slotState = useSlotState();
  const slotProgressContext = useSlotProgress();
  const slotActions = useSlotActions();
  const slotConfig = useSlotConfig();

  // Get isLive and isPlaying from context
  const { isLive, isPlaying, currentSlot } = slotState;
  const { minSlot, maxSlot } = slotConfig;
  const effectiveIsPlaying = isPlaying;
  const contextSlotProgress = slotProgressContext.slotProgress;
  const effectiveTime = slotProgress !== undefined ? slotProgress : contextSlotProgress;

  const handlePlayPauseClick = useCallback(() => {
    slotActions.toggle();
  }, [slotActions]);

  const handlePreviousSlot = useCallback(() => {
    slotActions.previousSlot();
  }, [slotActions]);

  const handleNextSlot = useCallback(() => {
    slotActions.nextSlot();
  }, [slotActions]);

  const handleToggleCollapse = useCallback(() => {
    setIsTimelineCollapsed(!isTimelineCollapsed);
  }, [isTimelineCollapsed]);

  const handleTimeSeek = useCallback(
    (timeInSeconds: number) => {
      slotActions.pause();
      slotActions.seekToTime(timeInSeconds * 1000);
    },
    [slotActions],
  );

  const {
    data: slotData,
    isLoading,
    error,
  } = useSlotData({
    network,
    slot,
    enabled: true,
    prefetchNext: isLive, // Enable prefetch for live mode
    prefetchAt: 8000, // Trigger prefetch at 8000ms into the slot
  });

  // Remove local timer effects since we always use context now

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
        attestationProgress: [],
      };

    const attestations: AttestationPoint[] = [];
    let runningTotal = 0;

    if (slotData.attestations?.windows) {
      const sortedWindows = [...slotData.attestations.windows].sort(
        (a, b) => Number(a.startMs) - Number(b.startMs),
      );

      attestations.push({
        time: 0,
        totalValidators: 0,
      });

      sortedWindows.forEach(window => {
        const validatorCount = window.validatorIndices.length;

        attestations.push({
          time: Number(window.startMs),
          totalValidators: runningTotal,
        });

        runningTotal += validatorCount;
        attestations.push({
          time: Number(window.endMs),
          totalValidators: runningTotal,
        });
      });

      attestations.push({
        time: 12000,
        totalValidators: runningTotal,
      });
    }

    return {
      attestationProgress: attestations,
    };
  }, [slotData]);

  const blockEvents = useMemo(() => {
    if (!slotData) return [];

    return [
      ...Object.entries(slotData.timings?.blockSeen || {}).map(([node, time]) => ({
        type: 'block_seen' as const,
        node,
        time: Number(time),
        source: 'api' as const,
      })),
      ...Object.entries(slotData.timings?.blockFirstSeenP2p || {}).map(([node, time]) => ({
        type: 'block_seen' as const,
        node,
        time: Number(time),
        source: 'p2p' as const,
      })),
    ].sort((a, b) => a.time - b.time);
  }, [slotData]);

  const timelineEvents = useMemo(() => {
    if (!slotData) return [];

    const events: Event[] = [];

    const getLocationString = (node: string) => {
      const nodeData = slotData.nodes[node];
      if (!nodeData?.geo) return 'Unknown Location';
      return nodeData.geo.country || nodeData.geo.continent || 'Unknown Location';
    };

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

    Object.entries(slotData.timings?.blobSeen || {}).forEach(([node, blobData]) => {
      if (blobData) {
        if ('timings' in blobData) {
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

    Object.entries(slotData.timings?.blobFirstSeenP2p || {}).forEach(([node, blobData]) => {
      if (blobData) {
        if ('timings' in blobData) {
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

  const isMissingData = !slotData && isLive && slot !== undefined;

  const winningBid = useMemo((): WinningBid | null => {
    if (!slotData?.relayBids || !slotData?.block?.executionPayloadBlockHash) return null;

    for (const [relayName, relayData] of Object.entries(slotData.relayBids)) {
      const matchingBid = relayData.bids.find(
        (bid: any) => bid.blockHash === slotData.block?.executionPayloadBlockHash,
      );

      if (matchingBid) {
        try {
          const valueInEth = Number(BigInt(matchingBid.value)) / 1e18;

          const timeMs = matchingBid.slotTime;
          const formattedTime =
            timeMs >= 0 ? `+${(timeMs / 1000).toFixed(2)}s` : `${(timeMs / 1000).toFixed(2)}s`;

          let formattedEth: string;
          if (valueInEth >= 100) {
            formattedEth = valueInEth.toFixed(2);
          } else if (valueInEth >= 10) {
            formattedEth = valueInEth.toFixed(3);
          } else {
            formattedEth = valueInEth.toFixed(4);
          }

          return {
            ...matchingBid,
            relay: relayName,
            valueInEth,
            formattedEth,
            formattedTime,
          };
        } catch (error) {
          console.error('Error converting bid value:', error);
          return null;
        }
      }
    }

    return null;
  }, [slotData?.relayBids, slotData?.block?.executionPayloadBlockHash]);

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

  const blobTimings = useMemo(() => {
    return {
      blobSeen: slotData?.timings?.blobSeen
        ? Object.fromEntries(
            Object.entries(slotData.timings.blobSeen).map(([node, blobs]) => [
              node,
              'timings' in blobs
                ? Object.fromEntries(
                    Object.entries(blobs.timings).map(([idx, time]) => [idx, Number(time)]),
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
                    Object.entries(blobs.timings).map(([idx, time]) => [idx, Number(time)]),
                  )
                : Object.fromEntries(
                    Object.entries(blobs).map(([idx, time]) => [idx, Number(time)]),
                  ),
            ]),
          )
        : undefined,
      blockSeen: slotData?.timings?.blockSeen
        ? Object.fromEntries(
            Object.entries(slotData.timings.blockSeen).map(([node, time]) => [node, Number(time)]),
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
    };
  }, [slotData?.timings]);

  const attestationWindows = useMemo(() => {
    return slotData?.attestations?.windows?.map(window => ({
      start_ms: Number(window.startMs),
      end_ms: Number(window.endMs),
      validator_indices: window.validatorIndices.map(Number),
    }));
  }, [slotData?.attestations?.windows]);

  const handleViewStats = useCallback(() => {
    showModal(
      <div className="h-[80vh] w-full max-w-lg overflow-y-auto p-4">
        <div className="flex flex-col gap-8">
          <SlotViewBottomPanels
            blobTimings={blobTimings}
            currentTime={effectiveTime}
            dataAvailabilityNodes={dataAvailabilityNodes}
            attestationProgress={attestationProgress}
            totalValidators={totalValidators}
            attestationThreshold={attestationThreshold}
            loading={isLoading}
            isMissing={isMissingData}
            attestationWindows={attestationWindows}
            maxPossibleValidators={maxPossibleValidators}
            isInModal={true}
          />
        </div>
      </div>,
    );
  }, [
    showModal,
    blobTimings,
    effectiveTime,
    dataAvailabilityNodes,
    attestationProgress,
    totalValidators,
    attestationThreshold,
    isLoading,
    isMissingData,
    attestationWindows,
    maxPossibleValidators,
  ]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col md:h-[calc(75vh-86px)] md:flex-row">
        {/* Mobile Layout */}
        <div className="flex h-full flex-col md:hidden">
          <div className="h-[30vh] border-b border-subtle">
            {showMap && (
              <SlotViewMap
                nodes={getFormattedNodes}
                currentTime={effectiveTime}
                blockEvents={blockEvents}
                loading={isLoading || !!error}
                isMissing={isMissingData || !!error}
                slotData={slotData}
              />
            )}
          </div>

          <SlotViewMobileDetails
            slot={slot}
            network={network}
            slotData={slotData}
            winningBid={winningBid}
            onViewStats={handleViewStats}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {showTimeline && (
              <SlotViewTimeline
                events={timelineEvents}
                loading={isLoading}
                isCollapsed={false}
                onToggleCollapse={handleToggleCollapse}
                currentTime={effectiveTime / 1000}
                isPlaying={effectiveIsPlaying}
                onPlayPauseClick={handlePlayPauseClick}
                slot={slot}
                onPreviousSlot={handlePreviousSlot}
                onNextSlot={handleNextSlot}
                isLive={isLive} // Shows live status (within 10 slots of head)
                isPrevDisabled={currentSlot <= minSlot}
                isNextDisabled={currentSlot >= maxSlot}
                onJumpToLive={slotActions.jumpToLive}
                className="h-full pb-4"
                onTimeSeek={handleTimeSeek}
              />
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden flex-1 flex-row md:flex">
          {showDetails && (
            <SlotViewDesktopDetails
              slot={slot}
              network={network}
              slotData={slotData}
              winningBid={winningBid}
            />
          )}

          {showMap && (
            <div
              className={`h-full ${showDetails ? 'w-[60%]' : showTimeline ? 'w-[80%]' : 'w-full'} ${showTimeline ? 'border-r border-subtle' : ''}`}
            >
              <SlotViewMap
                nodes={getFormattedNodes}
                currentTime={effectiveTime}
                blockEvents={blockEvents}
                loading={isLoading || !!error}
                isMissing={isMissingData || !!error}
                slotData={slotData}
              />
            </div>
          )}

          {showTimeline && (
            <div className="flex h-full w-[20%] flex-col">
              <SlotViewTimeline
                events={timelineEvents}
                loading={isLoading}
                isCollapsed={isTimelineCollapsed}
                onToggleCollapse={handleToggleCollapse}
                currentTime={effectiveTime / 1000}
                isPlaying={effectiveIsPlaying}
                onPlayPauseClick={handlePlayPauseClick}
                slot={slot}
                onPreviousSlot={handlePreviousSlot}
                onNextSlot={handleNextSlot}
                isLive={isLive} // Shows live status (within 10 slots of head)
                isPrevDisabled={currentSlot <= minSlot}
                isNextDisabled={currentSlot >= maxSlot}
                onJumpToLive={slotActions.jumpToLive}
                className="flex-1 overflow-y-auto"
                onTimeSeek={handleTimeSeek}
              />
            </div>
          )}
        </div>
      </div>

      {showBottomPanel && (
        <SlotViewBottomPanels
          blobTimings={blobTimings}
          currentTime={effectiveTime}
          dataAvailabilityNodes={dataAvailabilityNodes}
          attestationProgress={attestationProgress}
          totalValidators={totalValidators}
          attestationThreshold={attestationThreshold}
          loading={isLoading}
          isMissing={isMissingData}
          attestationWindows={attestationWindows}
          maxPossibleValidators={maxPossibleValidators}
        />
      )}
    </div>
  );
}
