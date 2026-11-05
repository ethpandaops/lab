import { type JSX, useState } from 'react';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { Alert } from '@/components/Feedback/Alert';
import { Checkbox } from '@/components/Forms/Checkbox';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useTabState } from '@/hooks/useTabState';
import { useEngineTimingsData } from './hooks/useEngineTimingsData';
import { TimingsSkeleton } from './components/TimingsSkeleton';
import { NewPayloadTab } from './components/NewPayloadTab';
import { GetBlobsTab } from './components/GetBlobsTab';
import { ReferenceNodesInfoDialog } from './components/ReferenceNodesInfoDialog';
import { DEFAULT_TIME_RANGE, HOURLY_CHART_RANGES, TIME_RANGE_CONFIG, type TimeRange } from './IndexPage.types';

/**
 * Engine API Timings page
 * Displays CL-EL communication timing data for engine_newPayload and engine_getBlobs API calls
 */
export function IndexPage(): JSX.Element {
  // Time range from URL search params
  const navigate = useNavigate({ from: '/ethereum/execution/timings/' });
  const { range, refNodes } = useSearch({ from: '/ethereum/execution/timings/' });
  const timeRange: TimeRange = range ?? DEFAULT_TIME_RANGE;

  // Reference nodes filter - default to true (only ethPandaOps controlled fleet)
  const referenceNodesOnly = refNodes ?? true;
  const setReferenceNodesOnly = (value: boolean): void => {
    navigate({ search: prev => ({ ...prev, refNodes: value ? undefined : false }), replace: true, resetScroll: false });
  };

  // Info dialog state
  const [showRefNodeInfo, setShowRefNodeInfo] = useState(false);

  // Tab state management with URL search params
  const { selectedIndex, onChange } = useTabState([
    { id: 'newPayload', anchors: ['duration-histogram', 'slot-duration'] },
    { id: 'getBlobs', anchors: ['blob-duration'] },
  ]);

  // Map tab index to tab name
  const activeTab = selectedIndex === 0 ? 'newPayload' : 'getBlobs';

  // Fetch engine timing data (getBlobs queries only run when that tab is visited)
  const { data, isLoading, isLoadingBlobs, error } = useEngineTimingsData({
    timeRange,
    referenceNodesOnly,
    activeTab,
  });

  // Show skeleton only on initial load (no data yet), not on time range changes
  const showInitialSkeleton = isLoading && !data;

  // The daily tables start partway through the longest ranges and All; say where the shown data begins
  const dailyRows = activeTab === 'newPayload' ? data?.newPayloadByElClientDaily : data?.getBlobsByElClientDaily;
  const firstDay = HOURLY_CHART_RANGES.includes(timeRange)
    ? undefined
    : dailyRows?.reduce<string | undefined>(
        (min, r) => (r.day_start_date && (!min || r.day_start_date < min) ? r.day_start_date : min),
        undefined
      );
  const rangeSeconds = TIME_RANGE_CONFIG[timeRange].seconds;
  const rangeStartDay =
    rangeSeconds === null ? undefined : new Date(Date.now() - rangeSeconds * 1000).toISOString().slice(0, 10);
  const dataSince =
    firstDay && (rangeStartDay === undefined || firstDay > rangeStartDay)
      ? new Date(`${firstDay}T00:00:00Z`).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : undefined;

  return (
    <Container>
      <Header
        title="Engine API Timings"
        description="CL-EL communication timing for engine_newPayload and engine_getBlobs"
      />

      {/* Time Range Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SegmentedControl
          options={(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map(r => ({
            value: r,
            label: TIME_RANGE_CONFIG[r].label,
          }))}
          value={timeRange}
          onChange={r => navigate({ search: prev => ({ ...prev, range: r }), replace: true, resetScroll: false })}
          ariaLabel="Time window"
        />
        {dataSince && <span className="text-sm text-muted">Since {dataSince}</span>}
      </div>

      {/* Reference Node Info Dialog */}
      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />

      {showInitialSkeleton ? (
        <TimingsSkeleton />
      ) : error ? (
        <Alert variant="error" title="Error loading timing data" description={error.message} />
      ) : !data ? (
        <Alert variant="info" title="No data available" description="No engine timing data has been recorded yet." />
      ) : (
        /* Tabbed Content */
        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <div className="relative">
            <ScrollableTabs>
              <Tab>newPayload</Tab>
              <Tab>getBlobs</Tab>
            </ScrollableTabs>

            {/* Reference Nodes Filter - below tabs on mobile, absolute right on sm+ */}
            <div className="mt-3 flex items-center gap-2 sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:pb-2">
              <button
                type="button"
                onClick={() => setReferenceNodesOnly(!referenceNodesOnly)}
                className="flex cursor-pointer items-center gap-2"
              >
                <Checkbox checked={referenceNodesOnly} onChange={setReferenceNodesOnly} />
                <span className="text-sm text-foreground">Reference nodes only</span>
              </button>
              <button
                onClick={() => setShowRefNodeInfo(true)}
                className="rounded-xs p-0.5 text-muted transition-colors hover:text-foreground"
                aria-label="Learn more about reference nodes"
              >
                <InformationCircleIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* At least a viewport tall, so a tab still loading does not shorten the page and lose the scroll position */}
          <TabPanels className="mt-6 min-h-screen">
            {/* newPayload Tab */}
            <TabPanel>
              <NewPayloadTab data={data} timeRange={timeRange} />
            </TabPanel>

            {/* getBlobs Tab */}
            <TabPanel>
              <GetBlobsTab data={data} timeRange={timeRange} isLoading={isLoadingBlobs} />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      )}
    </Container>
  );
}
