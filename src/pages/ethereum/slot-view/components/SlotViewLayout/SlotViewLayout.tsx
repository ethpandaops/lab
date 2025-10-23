import { type JSX, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSlotPlayerState, useSlotPlayerProgress, useSlotPlayerActions } from '@/hooks/useSlotPlayer';
import { MapChart } from '@/components/Charts/Map';
import { Sidebar } from '../Sidebar';
import { BlockDetailsCard } from '../BlockDetailsCard';
import { BottomBar } from '../BottomBar';
import { useSlotViewData } from '../../hooks';
import type { SlotViewLayoutProps, TimeFilteredData } from './SlotViewLayout.types';

export function SlotViewLayout({ mode }: SlotViewLayoutProps): JSX.Element {
  const { currentSlot, isPlaying } = useSlotPlayerState();
  const { slotProgress } = useSlotPlayerProgress();
  const actions = useSlotPlayerActions();

  // Memoize the onTimeClick handler to prevent Sidebar re-renders
  const handleTimeClick = useCallback((timeMs: number) => actions.seekToTime(timeMs), [actions]);

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

  // Pre-compute all time-filtered data once when currentTime changes
  // This prevents child components from filtering data on every render
  const timeFilteredData = useMemo<TimeFilteredData>(() => {
    // Filter map points - only show nodes that have seen the block
    const visibleMapPoints = slotData.mapPoints.filter(point => point.earliestSeenTime <= currentTime);

    // Filter attestation data for BlockDetailsCard
    const visibleAttestationData = slotData.attestationData.filter(point => point.time <= currentTime);
    const attestationCount = visibleAttestationData.reduce((sum, point) => sum + point.count, 0);
    const attestationPercentage =
      slotData.attestationTotalExpected > 0 ? (attestationCount / slotData.attestationTotalExpected) * 100 : 0;

    // Filter blob first seen data for BlobDataAvailability
    const visibleBlobFirstSeenData = slotData.blobFirstSeenData.filter(point => point.time <= currentTime);

    // Deduplicate blob data - only show the FIRST time each blob was seen
    const blobFirstSeenMap = new Map<string, { time: number; color?: string }>();
    visibleBlobFirstSeenData.forEach(point => {
      const existing = blobFirstSeenMap.get(point.blobId);
      if (!existing || point.time < existing.time) {
        blobFirstSeenMap.set(point.blobId, { time: point.time, color: point.color });
      }
    });
    const deduplicatedBlobData = Array.from(blobFirstSeenMap.entries()).map(([blobId, data]) => ({
      blobId,
      time: data.time,
      color: data.color,
    }));

    // Filter continental propagation data for BlobDataAvailability
    const visibleContinentalPropagationData = slotData.blobContinentalPropagationData.map(continent => ({
      ...continent,
      data: continent.data.filter(point => point.time <= currentTime),
    }));

    // Pre-compute attestation chart data for AttestationArrivals
    // Create a complete time range from 0-12s in 50ms chunks
    const timePoints = Array.from({ length: 241 }, (_, i) => i * 50);
    const timeToCountMap = new Map(slotData.attestationData.map(p => [p.time, p.count]));
    const attestationChartValues = timePoints.map(time => {
      if (time > currentTime) return null;
      return timeToCountMap.get(time) ?? 0;
    });

    return {
      visibleMapPoints,
      visibleAttestationData,
      attestationCount,
      attestationPercentage,
      deduplicatedBlobData,
      visibleContinentalPropagationData,
      attestationChartValues,
    };
  }, [
    slotData.mapPoints,
    slotData.attestationData,
    slotData.attestationTotalExpected,
    slotData.blobFirstSeenData,
    slotData.blobContinentalPropagationData,
    currentTime,
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Main Content Area - 67% height */}
      <div className="grid h-[67vh] grid-cols-12 gap-4 p-4">
        {/* Columns 1-9: Main Content */}
        <div className="col-span-9 flex h-full flex-col gap-4 overflow-hidden">
          {/* Block Details Card */}
          <div className="shrink-0">
            <BlockDetailsCard
              data={slotData.blockDetails}
              currentTime={currentTime}
              attestationCount={timeFilteredData.attestationCount}
              attestationPercentage={timeFilteredData.attestationPercentage}
              attestationTotalExpected={slotData.attestationTotalExpected}
            />
          </div>

          {/* Map Section - takes all remaining vertical space */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full w-full">
              <MapChart points={timeFilteredData.visibleMapPoints} height="100%" pointSize={6} />
            </div>
          </div>
        </div>

        {/* Columns 10-12: Sidebar - flex column constrained to parent height */}
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
          mode={mode}
        />
      </div>
    </div>
  );
}
