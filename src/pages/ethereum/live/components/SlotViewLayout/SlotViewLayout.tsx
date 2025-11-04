import { type JSX, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSlotPlayerState, useSlotPlayerProgress, useSlotPlayerActions } from '@/hooks/useSlotPlayer';
import { Map2DChart } from '@/components/Charts/Map2D';
import { Sidebar } from '../Sidebar';
import { MobileSlotHeader } from '../MobileSlotHeader';
import { BlockDetailsCard } from '../BlockDetailsCard';
import { BottomBar } from '../BottomBar';
import { ScrollingTimeline } from '@/components/Lists/ScrollingTimeline';
import { SlotTimeline } from '@/components/Ethereum/SlotTimeline';
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

  // Stable reference for the returned data object - only mutate properties
  const timeFilteredDataRef = useRef<TimeFilteredData>({
    visibleMapPoints: [],
    attestationCount: 0,
    attestationPercentage: 0,
    deduplicatedBlobData: [],
    visibleContinentalPropagationData: [],
    attestationChartValues: [],
  });

  // Reset refs when slot changes
  // IMPORTANT: Create NEW array instances so components see them as changed
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

    // Create NEW arrays for the stable reference object
    // This ensures components receive different array references and can detect the reset
    const emptyMapPoints: typeof sortedMapPoints = [];
    const emptyBlobData: typeof deduplicatedBlobTimeline = [];
    const emptyContinentalData: typeof sortedContinentalSeries = [];
    const emptyAttestationValues: (number | null)[] = [];

    timeFilteredDataRef.current.visibleMapPoints = emptyMapPoints;
    timeFilteredDataRef.current.attestationCount = 0;
    timeFilteredDataRef.current.attestationPercentage = 0;
    timeFilteredDataRef.current.deduplicatedBlobData = emptyBlobData;
    timeFilteredDataRef.current.visibleContinentalPropagationData = emptyContinentalData;
    timeFilteredDataRef.current.attestationChartValues = emptyAttestationValues;

    // Store these empty arrays in refs so useEffect can detect they need updating
    visibleMapPointsRef.current = emptyMapPoints;
    deduplicatedBlobDataRef.current = emptyBlobData;
    visibleContinentalPropagationDataRef.current = emptyContinentalData;
    attestationChartValuesRef.current = emptyAttestationValues;
  }

  // Update timeFilteredDataRef in place - no new objects, no re-renders
  useEffect(() => {
    const mapIndex = upperBound(sortedMapPoints, point => point.earliestSeenTime, currentTime);

    // Only update map points if index changed
    if (mapIndex !== mapIndexRef.current) {
      visibleMapPointsRef.current =
        mapIndex === sortedMapPoints.length ? sortedMapPoints : sortedMapPoints.slice(0, mapIndex);
      mapIndexRef.current = mapIndex;
      timeFilteredDataRef.current.visibleMapPoints = visibleMapPointsRef.current;
    }

    const attestationCount = slotData.attestationActualCount;
    const attestationPercentage =
      slotData.attestationTotalExpected > 0 ? (attestationCount / slotData.attestationTotalExpected) * 100 : 0;

    // Only update if changed
    if (timeFilteredDataRef.current.attestationCount !== attestationCount) {
      timeFilteredDataRef.current.attestationCount = attestationCount;
    }
    if (timeFilteredDataRef.current.attestationPercentage !== attestationPercentage) {
      timeFilteredDataRef.current.attestationPercentage = attestationPercentage;
    }

    const blobIndex = upperBound(deduplicatedBlobTimeline, blob => blob.time, currentTime);

    // Only update blob data if index changed
    if (blobIndex !== blobIndexRef.current) {
      deduplicatedBlobDataRef.current =
        blobIndex === deduplicatedBlobTimeline.length
          ? deduplicatedBlobTimeline
          : deduplicatedBlobTimeline.slice(0, blobIndex);
      blobIndexRef.current = blobIndex;
      timeFilteredDataRef.current.deduplicatedBlobData = deduplicatedBlobDataRef.current;
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
      timeFilteredDataRef.current.visibleContinentalPropagationData = visibleContinentalPropagationDataRef.current;
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
      timeFilteredDataRef.current.attestationChartValues = attestationChartValuesRef.current;
    }
  }, [
    sortedMapPoints,
    deduplicatedBlobTimeline,
    sortedContinentalSeries,
    attestationTimeToCount,
    slotData.attestationActualCount,
    slotData.attestationTotalExpected,
    currentTime,
  ]);

  // Return stable reference - never changes
  const timeFilteredData = timeFilteredDataRef.current;

  return (
    <>
      {/* Desktop Layout - Clean, no-gap design */}
      <div className="hidden h-screen flex-col overflow-hidden bg-background lg:flex">
        {/* Top Section - Slot Progress */}
        <div className="shrink-0 border-b border-border bg-surface px-6 py-4">
          <BlockDetailsCard
            data={slotData.blockDetails}
            currentTime={currentTime}
            slotProgressPhases={slotProgressPhases}
          />
        </div>

        {/* Main Content Area */}
        <div className="grid min-h-0 flex-1 grid-cols-12">
          {/* Left: Map (9 columns) */}
          <div className="col-span-9 overflow-hidden border-r border-border bg-background">
            <Map2DChart
              points={timeFilteredData.visibleMapPoints}
              height="100%"
              pointSizeMultiplier={1.2}
              resetKey={currentSlot}
            />
          </div>

          {/* Right: Sidebar (3 columns) */}
          <div className="col-span-3 overflow-hidden bg-surface">
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

        {/* Bottom Section - Charts */}
        <div className="h-[22vh] shrink-0 border-t border-border bg-surface">
          <BottomBar
            blockVersion={slotData.blockDetails?.blockVersion}
            blobCount={slotData.blobCount}
            dataColumnBlobCount={slotData.dataColumnBlobCount}
            dataColumnFirstSeenData={slotData.dataColumnFirstSeenData}
            currentSlot={currentSlot}
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
      <div className="flex h-[calc(100vh-65px)] flex-col overflow-hidden lg:hidden">
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

        {/* Slot Time Progress - 56px */}
        <div className="h-[56px] shrink-0 overflow-hidden border-b border-border bg-surface px-3 py-2">
          <SlotTimeline
            phases={slotData.sidebarPhases}
            currentTime={currentTime}
            slotDuration={12000}
            showInlineLabels={true}
            showTimeCutovers={false}
            height={48}
            onTimeClick={handleTimeClick}
          />
        </div>

        {/* Slim Timeline - Takes remaining space after other fixed elements */}
        <div className="min-h-0 flex-1 overflow-hidden border-b border-border bg-surface">
          <ScrollingTimeline items={slotData.sidebarItems} currentTime={currentTime} autoScroll={true} height="100%" />
        </div>

        {/* Map - 264px (reclaimed space from tick labels) */}
        <div className="h-[264px] shrink-0 overflow-hidden bg-background">
          <Map2DChart
            points={timeFilteredData.visibleMapPoints}
            height="100%"
            pointSizeMultiplier={1.5}
            resetKey={currentSlot}
          />
        </div>

        {/* Bottom Bar - 25vh */}
        <div className="h-[25vh] shrink-0">
          <BottomBar
            blockVersion={slotData.blockDetails?.blockVersion}
            blobCount={slotData.blobCount}
            dataColumnBlobCount={slotData.dataColumnBlobCount}
            dataColumnFirstSeenData={slotData.dataColumnFirstSeenData}
            currentSlot={currentSlot}
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
