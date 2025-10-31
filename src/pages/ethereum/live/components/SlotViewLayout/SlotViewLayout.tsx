import { type JSX, useMemo, useRef, useCallback } from 'react';
import { useSlotPlayerState, useSlotPlayerProgress, useSlotPlayerActions } from '@/hooks/useSlotPlayer';
import { Map2DChart } from '@/components/Charts/Map2D';
import { Sidebar } from '../Sidebar';
import { MobileSlotHeader } from '../MobileSlotHeader';
import { BlockDetailsCard } from '../BlockDetailsCard';
import { BottomBar } from '../BottomBar';
import { ScrollingTimeline } from '@/components/Lists/ScrollingTimeline';
import { SlotProgressTimeline } from '@/components/Ethereum/SlotProgressTimeline';
import { useSlotViewData, useSlotProgressData } from '../../hooks';
import type { SlotViewLayoutProps, TimeFilteredData } from './SlotViewLayout.types';

const TIME_POINTS = Array.from({ length: 241 }, (_, i) => i * 50);
function upperBound<T>(array: T[], accessor: (item: T) => number, target: number): number {
  let low = 0;
  let high = array.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (accessor(array[mid]) <= target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export function SlotViewLayout({ mode }: SlotViewLayoutProps): JSX.Element {
  const { currentSlot, isPlaying } = useSlotPlayerState();
  const { slotProgress } = useSlotPlayerProgress();
  const actions = useSlotPlayerActions();

  // Memoize the onTimeClick handler to prevent Sidebar re-renders
  const handleTimeClick = useCallback((timeMs: number) => actions.seekToTime(timeMs), [actions]);

  // Use slotProgress directly without throttling
  const currentTime = slotProgress;

  // Fetch all slot data
  const slotData = useSlotViewData(currentSlot);

  // Compute slot progress phases for timeline
  const { phases: slotProgressPhases } = useSlotProgressData(slotData.rawApiData, currentTime);

  const sortedMapPoints = useMemo(() => {
    return [...slotData.mapPoints].sort((a, b) => a.earliestSeenTime - b.earliestSeenTime);
  }, [slotData.mapPoints]);

  const deduplicatedBlobTimeline = useMemo(() => {
    const earliestByBlob = new Map<string, { time: number; color?: string }>();

    for (const point of slotData.blobFirstSeenData) {
      const existing = earliestByBlob.get(point.blobId);
      if (!existing || point.time < existing.time) {
        earliestByBlob.set(point.blobId, { time: point.time, color: point.color });
      }
    }

    return Array.from(earliestByBlob.entries())
      .map(([blobId, value]) => ({ blobId, time: value.time, color: value.color }))
      .sort((a, b) => a.time - b.time);
  }, [slotData.blobFirstSeenData]);

  const sortedContinentalSeries = useMemo(() => {
    return slotData.blobContinentalPropagationData.map(continent => ({
      ...continent,
      data: [...continent.data].sort((a, b) => a.time - b.time),
    }));
  }, [slotData.blobContinentalPropagationData]);

  const attestationTimeToCount = useMemo(() => {
    const map = new Map<number, number>();
    for (const point of slotData.attestationData) {
      map.set(point.time, point.count);
    }
    return map;
  }, [slotData.attestationData]);

  // Refs to maintain stable references - only update when indices change
  const mapIndexRef = useRef(-1);
  const visibleMapPointsRef = useRef<typeof sortedMapPoints>([]);
  const blobIndexRef = useRef(-1);
  const deduplicatedBlobDataRef = useRef<typeof deduplicatedBlobTimeline>([]);
  const continentalIndicesRef = useRef<number[]>([]);
  const visibleContinentalPropagationDataRef = useRef<typeof sortedContinentalSeries>([]);
  const attestationChartValuesRef = useRef<(number | null)[]>([]);
  const lastChartTimeRef = useRef(-1);
  const lastSlotRef = useRef(currentSlot);

  // Reset refs when slot changes
  if (currentSlot !== lastSlotRef.current) {
    mapIndexRef.current = -1;
    visibleMapPointsRef.current = [];
    blobIndexRef.current = -1;
    deduplicatedBlobDataRef.current = [];
    continentalIndicesRef.current = [];
    visibleContinentalPropagationDataRef.current = [];
    attestationChartValuesRef.current = [];
    lastChartTimeRef.current = -1;
    lastSlotRef.current = currentSlot;
  }

  const timeFilteredData = useMemo<TimeFilteredData>(() => {
    const mapIndex = upperBound(sortedMapPoints, point => point.earliestSeenTime, currentTime);

    // Only update map points if index changed
    if (mapIndex !== mapIndexRef.current) {
      visibleMapPointsRef.current =
        mapIndex === sortedMapPoints.length ? sortedMapPoints : sortedMapPoints.slice(0, mapIndex);
      mapIndexRef.current = mapIndex;
    }

    const attestationCount = slotData.attestationActualCount;
    const attestationPercentage =
      slotData.attestationTotalExpected > 0 ? (attestationCount / slotData.attestationTotalExpected) * 100 : 0;

    const blobIndex = upperBound(deduplicatedBlobTimeline, blob => blob.time, currentTime);

    // Only update blob data if index changed
    if (blobIndex !== blobIndexRef.current) {
      deduplicatedBlobDataRef.current =
        blobIndex === deduplicatedBlobTimeline.length
          ? deduplicatedBlobTimeline
          : deduplicatedBlobTimeline.slice(0, blobIndex);
      blobIndexRef.current = blobIndex;
    }

    // Only update continental data if any index changed
    let continentalChanged = false;
    const newContinentalIndices = sortedContinentalSeries.map((continent, idx) => {
      const dataIndex = upperBound(continent.data, point => point.time, currentTime);
      if (continentalIndicesRef.current[idx] !== dataIndex) {
        continentalChanged = true;
      }
      return dataIndex;
    });

    if (continentalChanged || continentalIndicesRef.current.length !== newContinentalIndices.length) {
      visibleContinentalPropagationDataRef.current = sortedContinentalSeries.map((continent, idx) => {
        const dataIndex = newContinentalIndices[idx];
        return dataIndex === continent.data.length
          ? continent
          : {
              ...continent,
              data: continent.data.slice(0, dataIndex),
            };
      });
      continentalIndicesRef.current = newContinentalIndices;
    }

    // Only rebuild attestation chart values when needed
    // Round currentTime to nearest 50ms to avoid rebuilding on every frame
    const roundedTime = Math.floor(currentTime / 50) * 50;
    if (roundedTime !== lastChartTimeRef.current) {
      attestationChartValuesRef.current = TIME_POINTS.map(time => {
        if (time > currentTime) return null;
        return attestationTimeToCount.get(time) ?? 0;
      });
      lastChartTimeRef.current = roundedTime;
    }

    return {
      visibleMapPoints: visibleMapPointsRef.current,
      attestationCount,
      attestationPercentage,
      deduplicatedBlobData: deduplicatedBlobDataRef.current,
      visibleContinentalPropagationData: visibleContinentalPropagationDataRef.current,
      attestationChartValues: attestationChartValuesRef.current,
    };
  }, [
    sortedMapPoints,
    deduplicatedBlobTimeline,
    sortedContinentalSeries,
    attestationTimeToCount,
    slotData.attestationActualCount,
    slotData.attestationTotalExpected,
    currentTime,
  ]);

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden h-screen flex-col overflow-hidden md:flex">
        {/* Main Content Area - 67% height */}
        <div className="grid h-[67vh] grid-cols-12 gap-4 p-4">
          {/* Columns 1-9: Main Content */}
          <div className="col-span-9 flex h-full flex-col gap-4 overflow-hidden">
            {/* Block Details Card */}
            <div className="shrink-0">
              <BlockDetailsCard
                data={slotData.blockDetails}
                currentTime={currentTime}
                slotProgressPhases={slotProgressPhases}
              />
            </div>

            {/* Map Section - takes all remaining vertical space */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="h-full w-full">
                <Map2DChart
                  points={timeFilteredData.visibleMapPoints}
                  height="100%"
                  pointSizeMultiplier={1.2}
                  resetKey={currentSlot}
                />
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
            attestationMaxCount={slotData.attestationMaxCount}
            mode={mode}
          />
        </div>
      </div>

      {/* Mobile Layout - Vertical Stack */}
      <div className="flex h-[calc(100vh-65px)] flex-col overflow-hidden md:hidden">
        {/* Mobile Slot Header - 60px */}
        <div className="h-[60px] shrink-0">
          <MobileSlotHeader
            currentSlot={currentSlot}
            isPlaying={isPlaying}
            onPlayPause={actions.toggle}
            onBackward={actions.previousSlot}
            onForward={actions.nextSlot}
            isLive={mode === 'live'}
          />
        </div>

        {/* Slim Slot Progress - 50px */}
        <div className="h-[50px] shrink-0 border-b border-border bg-surface px-3 py-2">
          <SlotProgressTimeline phases={slotProgressPhases} mode="live" currentTime={currentTime} showStats={false} />
        </div>

        {/* Slim Timeline - 100px */}
        <div className="h-[100px] shrink-0 border-b border-border">
          <ScrollingTimeline items={slotData.sidebarItems} currentTime={currentTime} autoScroll={true} />
        </div>

        {/* Map - 280px (reduced to fit progress bar) */}
        <div className="h-[280px] shrink-0 overflow-hidden bg-background">
          <Map2DChart
            points={timeFilteredData.visibleMapPoints}
            height="100%"
            pointSizeMultiplier={1.5}
            resetKey={currentSlot}
          />
        </div>

        {/* Bottom Bar - Remaining space (approx 349px) */}
        <div className="min-h-0 flex-1">
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
          />
        </div>
      </div>
    </>
  );
}
