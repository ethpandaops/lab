import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { Alert } from '@/components/Feedback/Alert';
import { Checkbox } from '@/components/Forms/Checkbox';
import { useTabState } from '@/hooks/useTabState';
import { useEngineTimingsData } from './hooks/useEngineTimingsData';
import { TimingsSkeleton } from './components/TimingsSkeleton';
import { NewPayloadTab } from './components/NewPayloadTab';
import { GetBlobsTab } from './components/GetBlobsTab';
import { ReferenceNodesInfoDialog } from './components/ReferenceNodesInfoDialog';
import { DEFAULT_TIME_RANGE, TIME_RANGE_CONFIG, type TimeRange } from './IndexPage.types';

/**
 * Engine API Timings page
 * Displays CL-EL communication timing data for engine_newPayload and engine_getBlobs API calls
 */
export function IndexPage(): JSX.Element {
  // Time range from URL search params
  const navigate = useNavigate({ from: '/ethereum/execution/timings/' });
  const { range } = useSearch({ from: '/ethereum/execution/timings/' });
  const timeRange: TimeRange = range ?? DEFAULT_TIME_RANGE;

  // Reference nodes filter - default to true (only ethPandaOps controlled fleet)
  const [referenceNodesOnly, setReferenceNodesOnly] = useState(true);

  // Info dialog state
  const [showRefNodeInfo, setShowRefNodeInfo] = useState(false);

  // Tab state management with URL search params
  const { selectedIndex, onChange } = useTabState([
    { id: 'newPayload', anchors: ['duration-histogram', 'slot-duration', 'client-matrix'] },
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

  return (
    <Container>
      <Header
        title="Engine API Timings"
        description="CL-EL communication timing for engine_newPayload and engine_getBlobs"
      />

      {/* Time Range Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map(r => (
          <button
            key={r}
            type="button"
            onClick={() => navigate({ search: prev => ({ ...prev, range: r }), replace: true })}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              timeRange === r
                ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                : 'bg-surface text-muted ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
            )}
          >
            {TIME_RANGE_CONFIG[r].label}
          </button>
        ))}
      </div>

      {/* Reference Node Info Dialog */}
      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />

      {showInitialSkeleton ? (
        <TimingsSkeleton />
      ) : error ? (
        <Alert variant="error" title="Error loading timing data" description={error.message} />
      ) : !data ? (
        <Alert
          variant="warning"
          title="No data available"
          description="No engine timing data has been recorded yet. Data may still be collecting."
        />
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

          <TabPanels className="mt-6">
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
