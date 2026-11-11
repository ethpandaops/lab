import { type JSX, type ReactNode, useMemo, useCallback, use, memo, createContext } from 'react';
import { useSlotPlayerState, useSlotPlayerActions, useSlotPlayerProgress } from '@/hooks/useSlotPlayer';
import { useForks } from '@/hooks/useForks';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import { Map2DChart } from '@/components/Charts/Map2D';
import { Sidebar } from '@/pages/ethereum/live/components/Sidebar';
import type { SidebarProps } from '@/pages/ethereum/live/components/Sidebar/Sidebar.types';
import { MobileSlotHeader } from '@/pages/ethereum/live/components/MobileSlotHeader';
import { MobileSlotStats } from '@/pages/ethereum/live/components/MobileSlotStats';
import { SlotHud } from '@/pages/ethereum/live/components/SlotHud';
import type { SlotHudProps } from '@/pages/ethereum/live/components/SlotHud';
import { BottomBar } from '@/pages/ethereum/live/components/BottomBar';
import type { BottomBarProps } from '@/pages/ethereum/live/components/BottomBar';
import { ScrollingTimeline } from '@/components/Lists/ScrollingTimeline';
import { SlotTimeline } from '@/components/Ethereum/SlotTimeline';
import { useSlotViewData } from '@/pages/ethereum/live/hooks';
import type { SlotViewLayoutProps, TimeFilteredData } from './SlotViewLayout.types';
import type { MapPointWithTiming } from '@/pages/ethereum/live/hooks/useMapData/useMapData';
import type { ContinentalPropagationSeries } from '@/pages/ethereum/live/components/BlobDataAvailability/BlobDataAvailability.types';
import type { DataColumnFirstSeenPoint } from '@/pages/ethereum/live/components/DataColumnDataAvailability/DataColumnDataAvailability.types';

const SLOT_DURATION_MS = 12000;
const PROGRESS_BUCKET_MS = 50;
const TIME_POINTS = Array.from({ length: 241 }, (_, i) => i * 50);

function upperBound<T>(array: T[], accessor: (item: T) => number, target: number): number {
  let low = 0;
  let high = array.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const item = array[mid];
    if (item !== undefined && accessor(item) <= target) {
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
  const context = use(SlotLiveDataContext);
  if (!context) {
    throw new Error('useSlotLiveData must be used within SlotLiveDataProvider');
  }
  return context;
}

interface SlotLiveDataProviderProps {
  sortedMapPoints: MapPointWithTiming[];
  deduplicatedBlobTimeline: Array<{ blobId: string; time: number; color?: string }>;
  sortedContinentalSeries: ContinentalPropagationSeries[];
  attestationTimeToCount: Map<number, number>;
  ptcTimeToCount: Map<number, number>;
  attestationActualCount: number;
  attestationTotalExpected: number;
  dataColumnFirstSeenData: DataColumnFirstSeenPoint[];
  children: ReactNode;
}

/** The first `count` items of a list, or the list itself once all of them are in view */
function prefix<T>(items: T[], count: number): T[] {
  return count === items.length ? items : items.slice(0, count);
}

function SlotLiveDataProvider({
  sortedMapPoints,
  deduplicatedBlobTimeline,
  sortedContinentalSeries,
  attestationTimeToCount,
  ptcTimeToCount,
  attestationActualCount,
  attestationTotalExpected,
  dataColumnFirstSeenData,
  children,
}: SlotLiveDataProviderProps): JSX.Element {
  const { slotProgress } = useSlotPlayerProgress();
  const quantizedTime = Math.min(SLOT_DURATION_MS, Math.floor(slotProgress / PROGRESS_BUCKET_MS) * PROGRESS_BUCKET_MS);

  // The visible lists are memoised on what is in view rather than on the time, so each keeps its reference between
  // ticks that bring nothing new into view
  const mapIndex = upperBound(sortedMapPoints, point => point.earliestSeenTime, quantizedTime);
  const visibleMapPoints = useMemo(() => prefix(sortedMapPoints, mapIndex), [sortedMapPoints, mapIndex]);

  const blobIndex = upperBound(deduplicatedBlobTimeline, blob => blob.time, quantizedTime);
  const deduplicatedBlobData = useMemo(
    () => prefix(deduplicatedBlobTimeline, blobIndex),
    [deduplicatedBlobTimeline, blobIndex]
  );

  // The latest propagation point in view across every continent; the visible series only change when it does
  const continentalCutoff = sortedContinentalSeries.reduce((latest, continent) => {
    const time = continent.data[upperBound(continent.data, point => point.time, quantizedTime) - 1]?.time;
    return time !== undefined && time > latest ? time : latest;
  }, -Infinity);
  const visibleContinentalPropagationData = useMemo(
    () =>
      sortedContinentalSeries.map(continent => {
        const dataIndex = upperBound(continent.data, point => point.time, continentalCutoff);
        return dataIndex === continent.data.length
          ? continent
          : { ...continent, data: continent.data.slice(0, dataIndex) };
      }),
    [sortedContinentalSeries, continentalCutoff]
  );

  const attestationChartValues = useMemo(
    () => TIME_POINTS.map(time => (time > quantizedTime ? null : (attestationTimeToCount.get(time) ?? 0))),
    [attestationTimeToCount, quantizedTime]
  );
  const ptcChartValues = useMemo(
    () => TIME_POINTS.map(time => (time > quantizedTime ? null : (ptcTimeToCount.get(time) ?? 0))),
    [ptcTimeToCount, quantizedTime]
  );

  // Columns in order of arrival, so the ones in view are a prefix, shown in column order
  const columnsByArrival = useMemo(
    () => [...dataColumnFirstSeenData].sort((a, b) => a.time - b.time),
    [dataColumnFirstSeenData]
  );
  const columnIndex = upperBound(columnsByArrival, point => point.time, quantizedTime);
  const visibleDataColumns = useMemo(() => {
    const byColumn = new Map<number, DataColumnFirstSeenPoint>();
    for (const point of columnsByArrival.slice(0, columnIndex)) {
      if (!byColumn.has(point.columnId)) byColumn.set(point.columnId, point);
    }
    return [...byColumn.values()].sort((a, b) => a.columnId - b.columnId);
  }, [columnsByArrival, columnIndex]);

  const attestationPercentage =
    attestationTotalExpected > 0 ? (attestationActualCount / attestationTotalExpected) * 100 : 0;

  const value = useMemo<SlotLiveDataContextValue>(
    () => ({
      timeFilteredData: {
        visibleMapPoints,
        attestationCount: attestationActualCount,
        attestationPercentage,
        deduplicatedBlobData,
        visibleContinentalPropagationData,
        attestationChartValues,
        ptcChartValues,
        dataColumnFirstSeenData: visibleDataColumns,
      },
    }),
    [
      visibleMapPoints,
      attestationActualCount,
      attestationPercentage,
      deduplicatedBlobData,
      visibleContinentalPropagationData,
      attestationChartValues,
      ptcChartValues,
      visibleDataColumns,
    ]
  );

  return <SlotLiveDataContext value={value}>{children}</SlotLiveDataContext>;
}

const LiveSlotHud = memo(function LiveSlotHud({
  currentSlot,
  ...props
}: Omit<SlotHudProps, 'currentTime'> & { currentSlot: number }) {
  const { slotProgress } = useSlotPlayerProgress();
  // Remount on slot change so a new slot starts fresh (faded out) instead of
  // tweening from the previous slot's data.
  return <SlotHud key={currentSlot} {...props} currentTime={slotProgress} />;
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

// Color a node by how quickly it saw the block, on a fast→slow gradient
// (green → terracotta → amber → red) so propagation speed reads geographically.
function arrivalColor(
  ms: number,
  colors: { success: string; primary: string; warning: string; danger: string }
): string {
  if (ms < 1500) return colors.success;
  if (ms < 2500) return colors.primary;
  if (ms < 3500) return colors.warning;
  return colors.danger;
}

const LiveMapChart = memo(function LiveMapChart({
  currentSlot,
  pointSizeMultiplier,
  height = '100%',
}: LiveMapChartProps) {
  const { timeFilteredData } = useSlotLiveData();
  const colors = useThemeColors();
  const points = useMemo(
    () =>
      timeFilteredData.visibleMapPoints.map(point => ({
        ...point,
        color: arrivalColor(point.earliestSeenTime, colors),
      })),
    [timeFilteredData.visibleMapPoints, colors]
  );
  return (
    <Map2DChart points={points} height={height} pointSizeMultiplier={pointSizeMultiplier} resetKey={currentSlot} />
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
      payloadAttestationChartValues={timeFilteredData.ptcChartValues}
      dataColumnFirstSeenData={timeFilteredData.dataColumnFirstSeenData}
    />
  );
});

export function SlotViewLayout({ mode }: SlotViewLayoutProps): JSX.Element {
  const { currentSlot, isPlaying } = useSlotPlayerState();
  const actions = useSlotPlayerActions();
  const { activeFork } = useForks();

  const slotData = useSlotViewData(currentSlot);

  const handleTimeClick = useCallback((timeMs: number) => actions.seekToTime(timeMs), [actions]);

  const sortedMapPoints = useMemo(() => {
    // Gloas (ePBS): overlay the payload envelope wave on the block wave. The
    // per-point color separates the two, and sorting by arrival keeps the
    // progressive reveal working across both.
    const payloadWave = slotData.payloadMapPoints.map(point => ({
      ...point,
      name: `${point.name} / payload`,
      color: getDataVizColors().DATA_COLORS.purple,
    }));

    return [...slotData.mapPoints, ...payloadWave].sort((a, b) => a.earliestSeenTime - b.earliestSeenTime);
  }, [slotData.mapPoints, slotData.payloadMapPoints]);

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

  const ptcTimeToCount = useMemo(() => {
    const map = new Map<number, number>();
    for (const point of slotData.ptcArrivalData) {
      map.set(point.time, point.count);
    }
    return map;
  }, [slotData.ptcArrivalData]);

  return (
    <SlotLiveDataProvider
      sortedMapPoints={sortedMapPoints}
      deduplicatedBlobTimeline={deduplicatedBlobTimeline}
      sortedContinentalSeries={sortedContinentalSeries}
      attestationTimeToCount={attestationTimeToCount}
      ptcTimeToCount={ptcTimeToCount}
      attestationActualCount={slotData.attestationActualCount}
      attestationTotalExpected={slotData.attestationTotalExpected}
      dataColumnFirstSeenData={slotData.dataColumnFirstSeenData}
    >
      <>
        <div className="hidden h-screen flex-col overflow-hidden bg-background lg:flex">
          <div className="shrink-0 border-b border-border bg-surface px-6 py-2">
            <LiveSlotHud
              currentSlot={currentSlot}
              clientValidation={slotData.clientValidation}
              proposerEntity={slotData.proposerEntity}
              propagationMinMs={slotData.propagationMinMs}
              propagationP50Ms={slotData.propagationP50Ms}
              propagationP90Ms={slotData.propagationP90Ms}
              propagationMaxMs={slotData.propagationMaxMs}
              propagationNodeCount={slotData.propagationNodeCount}
              attestationFirstMs={slotData.attestationFirstMs}
              attestationPeakMs={slotData.attestationPeakMs}
              attestationExpected={slotData.attestationTotalExpected}
              blockDetails={slotData.blockDetails}
              auctionBuilders={slotData.auctionBuilders}
              auctionRelays={slotData.auctionRelays}
              auctionBids={slotData.auctionBids}
              auctionTopRelay={slotData.auctionTopRelay}
              auctionTopBidWei={slotData.auctionTopBidWei}
              epbs={slotData.epbs}
              blobCount={slotData.blobCount}
              dataColumnBlobCount={slotData.dataColumnBlobCount}
            />
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

          <div className="h-vh-22 shrink-0 border-t border-border bg-surface">
            <LiveBottomBar
              activeFork={activeFork}
              blockVersion={slotData.blockDetails?.blockVersion}
              blobCount={slotData.blobCount}
              dataColumnBlobCount={slotData.dataColumnBlobCount}
              blockBlobCount={slotData.blockBlobCount}
              currentSlot={currentSlot}
              attestationTotalExpected={slotData.attestationTotalExpected}
              attestationMaxCount={slotData.attestationMaxCount}
              mode={mode}
            />
          </div>
        </div>

        <div className="flex h-vh-less-16.25 flex-col overflow-hidden lg:hidden">
          <div className="h-15 shrink-0">
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

          <div className="h-9 shrink-0 border-b border-border bg-surface">
            <MobileSlotStats
              clientValidation={slotData.clientValidation}
              propagationP90Ms={slotData.propagationP90Ms}
              blockDetails={slotData.blockDetails}
              blobCount={slotData.blobCount}
              dataColumnBlobCount={slotData.dataColumnBlobCount}
            />
          </div>

          <div className="h-14 shrink-0 overflow-hidden border-b border-border bg-surface px-3 py-2">
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

          <div className="h-66 shrink-0 overflow-hidden bg-background">
            <LiveMapChart currentSlot={currentSlot} pointSizeMultiplier={1.5} />
          </div>

          <div className="h-vh-25 shrink-0">
            <LiveBottomBar
              activeFork={activeFork}
              blockVersion={slotData.blockDetails?.blockVersion}
              blobCount={slotData.blobCount}
              dataColumnBlobCount={slotData.dataColumnBlobCount}
              blockBlobCount={slotData.blockBlobCount}
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
