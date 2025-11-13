import {
  type JSX,
  type ReactNode,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useContext,
  useState,
  memo,
  createContext,
} from 'react';
import { useSlotPlayerState, useSlotPlayerActions, useSlotPlayerProgress } from '@/hooks/useSlotPlayer';
import { useForks } from '@/hooks/useForks';
import { Map2DChart } from '@/components/Charts/Map2D';
import { Sidebar } from '../Sidebar';
import type { SidebarProps } from '../Sidebar/Sidebar.types';
import { MobileSlotHeader } from '../MobileSlotHeader';
import { BlockDetailsCard } from '../BlockDetailsCard';
import type { BlockDetailsCardProps } from '../BlockDetailsCard';
import { BottomBar } from '../BottomBar';
import type { BottomBarProps } from '../BottomBar';
import { ScrollingTimeline } from '@/components/Lists/ScrollingTimeline';
import { SlotTimeline } from '@/components/Ethereum/SlotTimeline';
import { useSlotViewData, useSlotProgressData } from '../../hooks';
import type { SlotViewLayoutProps, TimeFilteredData } from './SlotViewLayout.types';
import type { MapPointWithTiming } from '../../hooks/useMapData/useMapData';
import type { ContinentalPropagationSeries } from '../BlobDataAvailability/BlobDataAvailability.types';
import type { DataColumnFirstSeenPoint } from '../DataColumnDataAvailability/DataColumnDataAvailability.types';

const SLOT_DURATION_MS = 12000;
const PROGRESS_BUCKET_MS = 50;
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

interface SlotLiveDataContextValue {
  timeFilteredData: TimeFilteredData;
}

const SlotLiveDataContext = createContext<SlotLiveDataContextValue | null>(null);

function useSlotLiveData(): SlotLiveDataContextValue {
  const context = useContext(SlotLiveDataContext);
  if (!context) {
    throw new Error('useSlotLiveData must be used within SlotLiveDataProvider');
  }
  return context;
}

interface SlotLiveDataProviderProps {
  currentSlot: number;
  sortedMapPoints: MapPointWithTiming[];
  deduplicatedBlobTimeline: Array<{ blobId: string; time: number; color?: string }>;
  sortedContinentalSeries: ContinentalPropagationSeries[];
  attestationTimeToCount: Map<number, number>;
  attestationActualCount: number;
  attestationTotalExpected: number;
  dataColumnFirstSeenData: DataColumnFirstSeenPoint[];
  children: ReactNode;
}

function SlotLiveDataProvider({
  currentSlot,
  sortedMapPoints,
  deduplicatedBlobTimeline,
  sortedContinentalSeries,
  attestationTimeToCount,
  attestationActualCount,
  attestationTotalExpected,
  dataColumnFirstSeenData,
  children,
}: SlotLiveDataProviderProps): JSX.Element {
  const { slotProgress } = useSlotPlayerProgress();
  const quantizedTime = Math.min(SLOT_DURATION_MS, Math.floor(slotProgress / PROGRESS_BUCKET_MS) * PROGRESS_BUCKET_MS);
  const [dataVersion, setDataVersion] = useState(0);

  const mapIndexRef = useRef(-1);
  const visibleMapPointsRef = useRef<typeof sortedMapPoints>([]);
  const blobIndexRef = useRef(-1);
  const deduplicatedBlobDataRef = useRef<typeof deduplicatedBlobTimeline>([]);
  const continentalIndicesRef = useRef<number[]>([]);
  const visibleContinentalPropagationDataRef = useRef<typeof sortedContinentalSeries>([]);
  const attestationChartValuesRef = useRef<(number | null)[]>([]);
  const lastChartTimeRef = useRef(-1);
  const visibleDataColumnsRef = useRef<DataColumnFirstSeenPoint[]>([]);
  const visibleDataColumnIdsRef = useRef<Set<number>>(new Set());

  const timeFilteredDataRef = useRef<TimeFilteredData>({
    visibleMapPoints: [],
    attestationCount: 0,
    attestationPercentage: 0,
    deduplicatedBlobData: [],
    visibleContinentalPropagationData: [],
    attestationChartValues: [],
    dataColumnFirstSeenData: [],
  });

  useEffect(() => {
    mapIndexRef.current = -1;
    blobIndexRef.current = -1;
    continentalIndicesRef.current = [];
    lastChartTimeRef.current = -1;
    visibleMapPointsRef.current = [];
    deduplicatedBlobDataRef.current = [];
    visibleContinentalPropagationDataRef.current = [];
    attestationChartValuesRef.current = [];
    visibleDataColumnsRef.current = [];
    visibleDataColumnIdsRef.current = new Set();
    timeFilteredDataRef.current = {
      visibleMapPoints: [],
      attestationCount: 0,
      attestationPercentage: 0,
      deduplicatedBlobData: [],
      visibleContinentalPropagationData: [],
      attestationChartValues: [],
      dataColumnFirstSeenData: [],
    };
    setDataVersion(prev => prev + 1);
  }, [
    currentSlot,
    sortedMapPoints,
    deduplicatedBlobTimeline,
    sortedContinentalSeries,
    attestationTimeToCount,
    dataColumnFirstSeenData,
  ]);

  useEffect(() => {
    let mutated = false;

    const mapIndex = upperBound(sortedMapPoints, point => point.earliestSeenTime, quantizedTime);
    if (mapIndex !== mapIndexRef.current) {
      visibleMapPointsRef.current =
        mapIndex === sortedMapPoints.length ? sortedMapPoints : sortedMapPoints.slice(0, mapIndex);
      mapIndexRef.current = mapIndex;
      timeFilteredDataRef.current.visibleMapPoints = visibleMapPointsRef.current;
      mutated = true;
    }

    const attestationCount = attestationActualCount;
    const attestationPercentage =
      attestationTotalExpected > 0 ? (attestationCount / attestationTotalExpected) * 100 : 0;

    if (timeFilteredDataRef.current.attestationCount !== attestationCount) {
      timeFilteredDataRef.current.attestationCount = attestationCount;
      mutated = true;
    }
    if (timeFilteredDataRef.current.attestationPercentage !== attestationPercentage) {
      timeFilteredDataRef.current.attestationPercentage = attestationPercentage;
      mutated = true;
    }

    const blobIndex = upperBound(deduplicatedBlobTimeline, blob => blob.time, quantizedTime);
    if (blobIndex !== blobIndexRef.current) {
      deduplicatedBlobDataRef.current =
        blobIndex === deduplicatedBlobTimeline.length
          ? deduplicatedBlobTimeline
          : deduplicatedBlobTimeline.slice(0, blobIndex);
      blobIndexRef.current = blobIndex;
      timeFilteredDataRef.current.deduplicatedBlobData = deduplicatedBlobDataRef.current;
      mutated = true;
    }

    let continentalChanged = false;
    const newContinentalIndices = sortedContinentalSeries.map((continent, idx) => {
      const dataIndex = upperBound(continent.data, point => point.time, quantizedTime);
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
      mutated = true;
    }

    const roundedTime = Math.floor(quantizedTime / PROGRESS_BUCKET_MS) * PROGRESS_BUCKET_MS;
    if (roundedTime !== lastChartTimeRef.current) {
      attestationChartValuesRef.current = TIME_POINTS.map(time => {
        if (time > quantizedTime) return null;
        return attestationTimeToCount.get(time) ?? 0;
      });
      lastChartTimeRef.current = roundedTime;
      timeFilteredDataRef.current.attestationChartValues = attestationChartValuesRef.current;
      mutated = true;
    }

    const newlyVisibleColumns: DataColumnFirstSeenPoint[] = [];
    for (const point of dataColumnFirstSeenData) {
      if (point.time <= quantizedTime && !visibleDataColumnIdsRef.current.has(point.columnId)) {
        visibleDataColumnIdsRef.current.add(point.columnId);
        newlyVisibleColumns.push(point);
      }
    }

    if (newlyVisibleColumns.length > 0) {
      visibleDataColumnsRef.current = [...visibleDataColumnsRef.current, ...newlyVisibleColumns].sort(
        (a, b) => a.columnId - b.columnId
      );
      timeFilteredDataRef.current.dataColumnFirstSeenData = visibleDataColumnsRef.current;
      mutated = true;
    }

    if (mutated) {
      setDataVersion(prev => prev + 1);
    }
  }, [
    quantizedTime,
    sortedMapPoints,
    deduplicatedBlobTimeline,
    sortedContinentalSeries,
    attestationTimeToCount,
    attestationActualCount,
    attestationTotalExpected,
    dataColumnFirstSeenData,
  ]);

  const value = useMemo<SlotLiveDataContextValue>(() => {
    // Reference dataVersion so the dependency is honored
    void dataVersion;
    return { timeFilteredData: timeFilteredDataRef.current };
  }, [dataVersion]);

  return <SlotLiveDataContext.Provider value={value}>{children}</SlotLiveDataContext.Provider>;
}

interface BlockDetailsSectionProps {
  data: BlockDetailsCardProps['data'];
  slotProgressPhases: BlockDetailsCardProps['slotProgressPhases'];
}

const LiveBlockDetailsCard = memo(function LiveBlockDetailsCard({
  data,
  slotProgressPhases,
}: BlockDetailsSectionProps) {
  const { slotProgress } = useSlotPlayerProgress();
  return <BlockDetailsCard data={data} currentTime={slotProgress} slotProgressPhases={slotProgressPhases} />;
});

type SidebarStaticProps = Omit<SidebarProps, 'currentTime' | 'slotDuration'> & { slotDuration?: number };

const LiveSidebar = memo(function LiveSidebar({ slotDuration = SLOT_DURATION_MS, ...props }: SidebarStaticProps) {
  const { slotProgress } = useSlotPlayerProgress();
  return <Sidebar {...props} currentTime={slotProgress} slotDuration={slotDuration} />;
});

interface LiveSlotTimelineProps {
  phases: SidebarProps['phases'];
  onTimeClick: (timeMs: number) => void;
  showInlineLabels?: boolean;
  showTimeCutovers?: boolean;
  height?: number;
}

const LiveSlotTimeline = memo(function LiveSlotTimeline({
  phases,
  onTimeClick,
  showInlineLabels,
  showTimeCutovers,
  height,
}: LiveSlotTimelineProps) {
  const { slotProgress } = useSlotPlayerProgress();
  return (
    <SlotTimeline
      phases={phases}
      currentTime={slotProgress}
      slotDuration={SLOT_DURATION_MS}
      showInlineLabels={showInlineLabels}
      showTimeCutovers={showTimeCutovers}
      height={height}
      onTimeClick={onTimeClick}
    />
  );
});

interface LiveScrollingTimelineProps {
  items: SidebarProps['items'];
  autoScroll?: boolean;
  height?: string;
}

const LiveScrollingTimeline = memo(function LiveScrollingTimeline({
  items,
  autoScroll,
  height,
}: LiveScrollingTimelineProps) {
  const { slotProgress } = useSlotPlayerProgress();
  return <ScrollingTimeline items={items} currentTime={slotProgress} autoScroll={autoScroll} height={height} />;
});

interface LiveMapChartProps {
  currentSlot: number;
  pointSizeMultiplier: number;
  height?: number | string;
}

const LiveMapChart = memo(function LiveMapChart({
  currentSlot,
  pointSizeMultiplier,
  height = '100%',
}: LiveMapChartProps) {
  const { timeFilteredData } = useSlotLiveData();
  return (
    <Map2DChart
      points={timeFilteredData.visibleMapPoints}
      height={height}
      pointSizeMultiplier={pointSizeMultiplier}
      resetKey={currentSlot}
    />
  );
});

type BottomBarBaseProps = Omit<
  BottomBarProps,
  'deduplicatedBlobData' | 'visibleContinentalPropagationData' | 'attestationChartValues' | 'dataColumnFirstSeenData'
>;

const LiveBottomBar = memo(function LiveBottomBar(props: BottomBarBaseProps) {
  const { timeFilteredData } = useSlotLiveData();
  return (
    <BottomBar
      {...props}
      deduplicatedBlobData={timeFilteredData.deduplicatedBlobData}
      visibleContinentalPropagationData={timeFilteredData.visibleContinentalPropagationData}
      attestationChartValues={timeFilteredData.attestationChartValues}
      dataColumnFirstSeenData={timeFilteredData.dataColumnFirstSeenData}
    />
  );
});

export function SlotViewLayout({ mode }: SlotViewLayoutProps): JSX.Element {
  const { currentSlot, isPlaying } = useSlotPlayerState();
  const actions = useSlotPlayerActions();
  const { activeFork } = useForks();

  const slotData = useSlotViewData(currentSlot);
  const { phases: slotProgressPhases } = useSlotProgressData(slotData.rawApiData);

  const handleTimeClick = useCallback((timeMs: number) => actions.seekToTime(timeMs), [actions]);

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

  return (
    <SlotLiveDataProvider
      currentSlot={currentSlot}
      sortedMapPoints={sortedMapPoints}
      deduplicatedBlobTimeline={deduplicatedBlobTimeline}
      sortedContinentalSeries={sortedContinentalSeries}
      attestationTimeToCount={attestationTimeToCount}
      attestationActualCount={slotData.attestationActualCount}
      attestationTotalExpected={slotData.attestationTotalExpected}
      dataColumnFirstSeenData={slotData.dataColumnFirstSeenData}
    >
      <>
        <div className="hidden h-screen flex-col overflow-hidden bg-background lg:flex">
          <div className="shrink-0 border-b border-border bg-surface px-6 py-2">
            <LiveBlockDetailsCard data={slotData.blockDetails} slotProgressPhases={slotProgressPhases} />
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-12">
            <div className="col-span-9 overflow-hidden border-r border-border bg-background">
              <LiveMapChart currentSlot={currentSlot} pointSizeMultiplier={1.2} />
            </div>

            <div className="col-span-3 overflow-hidden bg-surface">
              <LiveSidebar
                currentSlot={currentSlot}
                activeFork={activeFork}
                phases={slotData.sidebarPhases}
                slotDuration={SLOT_DURATION_MS}
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

          <div className="h-[22vh] shrink-0 border-t border-border bg-surface">
            <LiveBottomBar
              activeFork={activeFork}
              blockVersion={slotData.blockDetails?.blockVersion}
              blobCount={slotData.blobCount}
              dataColumnBlobCount={slotData.dataColumnBlobCount}
              currentSlot={currentSlot}
              attestationTotalExpected={slotData.attestationTotalExpected}
              attestationMaxCount={slotData.attestationMaxCount}
              mode={mode}
            />
          </div>
        </div>

        <div className="flex h-[calc(100vh-65px)] flex-col overflow-hidden lg:hidden">
          <div className="h-[60px] shrink-0">
            <MobileSlotHeader
              currentSlot={currentSlot}
              activeFork={activeFork}
              isPlaying={isPlaying}
              onPlayPause={actions.toggle}
              onBackward={actions.previousSlot}
              onForward={actions.nextSlot}
              isLive={mode === 'live'}
            />
          </div>

          <div className="h-[56px] shrink-0 overflow-hidden border-b border-border bg-surface px-3 py-2">
            <LiveSlotTimeline
              phases={slotData.sidebarPhases}
              onTimeClick={handleTimeClick}
              showInlineLabels={true}
              showTimeCutovers={false}
              height={48}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden border-b border-border bg-surface">
            <LiveScrollingTimeline items={slotData.sidebarItems} autoScroll={true} height="100%" />
          </div>

          <div className="h-[264px] shrink-0 overflow-hidden bg-background">
            <LiveMapChart currentSlot={currentSlot} pointSizeMultiplier={1.5} />
          </div>

          <div className="h-[25vh] shrink-0">
            <LiveBottomBar
              activeFork={activeFork}
              blockVersion={slotData.blockDetails?.blockVersion}
              blobCount={slotData.blobCount}
              dataColumnBlobCount={slotData.dataColumnBlobCount}
              currentSlot={currentSlot}
              attestationTotalExpected={slotData.attestationTotalExpected}
              attestationMaxCount={slotData.attestationMaxCount}
              mode={mode}
            />
          </div>
        </div>
      </>
    </SlotLiveDataProvider>
  );
}
