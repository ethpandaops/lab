import { type JSX, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSlotPlayerState, useSlotPlayerProgress, useSlotPlayerActions } from '@/hooks/useSlotPlayer';
import { MapChart } from '@/components/Charts/Map';
import { Sidebar } from '../Sidebar';
import { BlockDetailsCard } from '../BlockDetailsCard';
import { BottomBar } from '../BottomBar';
import { DebugPanel } from '../DebugPanel';
import { useSlotViewData, useSlotProgressData, useDebug } from '../../hooks';
import type { SlotViewLayoutProps, TimeFilteredData } from './SlotViewLayout.types';

export function SlotViewLayout({ mode }: SlotViewLayoutProps): JSX.Element {
  const { currentSlot, isPlaying } = useSlotPlayerState();
  const { slotProgress } = useSlotPlayerProgress();
  const actions = useSlotPlayerActions();
  const { enabledSections } = useDebug();

  // Memoize the onTimeClick handler to prevent Sidebar re-renders
  const handleTimeClick = useCallback((timeMs: number) => actions.seekToTime(timeMs), [actions]);

  // FPS tracking for debug panel
  const [currentFps, setCurrentFps] = useState<number>(60);
  const fpsFrameTimesRef = useRef<number[]>([]);
  const fpsLastUpdateRef = useRef(0);

  // Throttle currentTime updates to 10fps (100ms) for better performance
  // This reduces React re-renders significantly while still looking smooth
  const [currentTime, setCurrentTime] = useState(slotProgress);
  const rafRef = useRef<number | null>(null);
  const slotProgressRef = useRef(slotProgress);
  const lastUpdateTimeRef = useRef(0);

  // Keep ref up to date
  slotProgressRef.current = slotProgress;

  useEffect(() => {
    const updateCurrentTime = (timestamp: number): void => {
      // FPS calculation: track frame times over the last second
      fpsFrameTimesRef.current.push(timestamp);
      // Keep only frames from the last second
      const oneSecondAgo = timestamp - 1000;
      fpsFrameTimesRef.current = fpsFrameTimesRef.current.filter(time => time > oneSecondAgo);

      // Update FPS display every 500ms
      if (timestamp - fpsLastUpdateRef.current >= 500) {
        const fps = fpsFrameTimesRef.current.length;
        setCurrentFps(fps);
        fpsLastUpdateRef.current = timestamp;
      }

      // Only update state every 100ms (10fps) to reduce React re-renders
      if (timestamp - lastUpdateTimeRef.current >= 100) {
        setCurrentTime(slotProgressRef.current);
        lastUpdateTimeRef.current = timestamp;
      }
      rafRef.current = requestAnimationFrame(updateCurrentTime);
    };

    rafRef.current = requestAnimationFrame(updateCurrentTime);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Fetch all slot data
  const slotData = useSlotViewData(currentSlot);

  // Compute slot progress phases for timeline
  const { phases: slotProgressPhases } = useSlotProgressData(slotData.rawApiData, currentTime);

  // Pre-compute static time points array (0-12s in 50ms chunks) outside of memo
  // This prevents creating a new 241-element array every 100ms
  const TIME_POINTS = useMemo(() => Array.from({ length: 241 }, (_, i) => i * 50), []);

  // Pre-compute all time-filtered data once when currentTime changes
  // This prevents child components from filtering data on every render
  const timeFilteredData = useMemo<TimeFilteredData>(() => {
    // Filter map points - only show nodes that have seen the block
    const visibleMapPoints = slotData.mapPoints.filter(point => point.earliestSeenTime <= currentTime);

    // Use actual attestation count (number of validators who attested) from API
    const attestationCount = slotData.attestationActualCount;
    const attestationPercentage =
      slotData.attestationTotalExpected > 0 ? (attestationCount / slotData.attestationTotalExpected) * 100 : 0;

    // Filter blob first seen data for BlobDataAvailability
    const visibleBlobFirstSeenData = slotData.blobFirstSeenData.filter(point => point.time <= currentTime);

    // Deduplicate blob data - optimized single-pass algorithm
    const blobFirstSeenObj: Record<string, { time: number; color?: string }> = {};
    for (let i = 0; i < visibleBlobFirstSeenData.length; i++) {
      const point = visibleBlobFirstSeenData[i];
      const existing = blobFirstSeenObj[point.blobId];
      if (!existing || point.time < existing.time) {
        blobFirstSeenObj[point.blobId] = { time: point.time, color: point.color };
      }
    }
    const deduplicatedBlobData = Object.keys(blobFirstSeenObj).map(blobId => ({
      blobId,
      time: blobFirstSeenObj[blobId].time,
      color: blobFirstSeenObj[blobId].color,
    }));

    // Filter continental propagation data for BlobDataAvailability
    const visibleContinentalPropagationData = slotData.blobContinentalPropagationData.map(continent => ({
      ...continent,
      data: continent.data.filter(point => point.time <= currentTime),
    }));

    // Pre-compute attestation chart data for AttestationArrivals
    // Use pre-computed static TIME_POINTS array
    const timeToCountMap = new Map(slotData.attestationData.map(p => [p.time, p.count]));
    const attestationChartValues = TIME_POINTS.map(time => {
      if (time > currentTime) return null;
      return timeToCountMap.get(time) ?? 0;
    });

    return {
      visibleMapPoints,
      attestationCount,
      attestationPercentage,
      deduplicatedBlobData,
      visibleContinentalPropagationData,
      attestationChartValues,
    };
  }, [
    TIME_POINTS,
    slotData.mapPoints,
    slotData.attestationData,
    slotData.attestationTotalExpected,
    slotData.attestationActualCount,
    slotData.blobFirstSeenData,
    slotData.blobContinentalPropagationData,
    currentTime,
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Debug Panel */}
      <DebugPanel currentFps={currentFps} />

      {/* Main Content Area - 67% height */}
      <div className="grid h-[67vh] grid-cols-12 gap-4 p-4">
        {/* Columns 1-9: Main Content */}
        <div className="col-span-9 flex h-full flex-col gap-4 overflow-hidden">
          {/* Block Details Card */}
          {enabledSections.blockDetails && (
            <div className="shrink-0">
              <BlockDetailsCard
                data={slotData.blockDetails}
                currentTime={currentTime}
                slotProgressPhases={slotProgressPhases}
              />
            </div>
          )}

          {/* Map Section - takes all remaining vertical space */}
          {enabledSections.map && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="h-full w-full">
                <MapChart points={timeFilteredData.visibleMapPoints} height="100%" pointSize={6} />
              </div>
            </div>
          )}
        </div>

        {/* Columns 10-12: Sidebar - flex column constrained to parent height */}
        {enabledSections.sidebar && (
          <div className="col-span-3 flex h-full flex-col overflow-hidden">
            <Sidebar
              currentSlot={currentSlot}
              phases={slotData.sidebarPhases}
              currentTime={currentTime}
              slotDuration={12000}
              items={slotData.sidebarItems}
              isPlaying={isPlaying}
              onPlayPause={actions.toggle}
              onBackward={actions.previousSlot}
              onForward={actions.nextSlot}
              onTimeClick={handleTimeClick}
              isLive={mode === 'live'}
            />
          </div>
        )}
      </div>

      {/* Bottom Bar - 29% height */}
      <div className="h-[29vh] min-h-0">
        <BottomBar
          blockVersion={slotData.blockDetails?.blockVersion}
          blobCount={slotData.blobCount}
          dataColumnBlobCount={slotData.dataColumnBlobCount}
          currentTime={currentTime}
          deduplicatedBlobData={timeFilteredData.deduplicatedBlobData}
          visibleContinentalPropagationData={timeFilteredData.visibleContinentalPropagationData}
          attestationChartValues={timeFilteredData.attestationChartValues}
          attestationTotalExpected={slotData.attestationTotalExpected}
          attestationMaxCount={slotData.attestationMaxCount}
          mode={mode}
          enableBlobAvailability={enabledSections.blobAvailability}
          enableAttestationArrivals={enabledSections.attestationArrivals}
        />
      </div>
    </div>
  );
}
