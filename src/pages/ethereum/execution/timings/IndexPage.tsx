import { type JSX, useState } from 'react';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
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
import type { TimeRange } from './IndexPage.types';

/**
 * Engine API Timings page
 * Displays CL-EL communication timing data for engine_newPayload and engine_getBlobs API calls
 */
export function IndexPage(): JSX.Element {
  // Time range state - default to last 1 hour
  const [timeRange, setTimeRange] = useState<TimeRange>('1hour');

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

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header
          title="Engine API Timings"
          description="CL-EL communication timing for engine_newPayload and engine_getBlobs"
        />
        <TimingsSkeleton />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header
          title="Engine API Timings"
          description="CL-EL communication timing for engine_newPayload and engine_getBlobs"
        />
        <Alert variant="error" title="Error loading timing data" description={error.message} />
      </Container>
    );
  }

  // No data state
  if (!data) {
    return (
      <Container>
        <Header
          title="Engine API Timings"
          description="CL-EL communication timing for engine_newPayload and engine_getBlobs"
        />
        <Alert
          variant="warning"
          title="No data available"
          description="No engine timing data has been recorded yet. Data may still be collecting."
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Engine API Timings"
        description="CL-EL communication timing for engine_newPayload and engine_getBlobs"
      />

      {/* Time Range Selector */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm font-medium text-muted">Time Range:</span>
        <div className="flex gap-2">
          {(['1hour', '3hours', '6hours'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-xs px-3 py-1.5 text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:bg-surface/80 hover:text-foreground'
              }`}
            >
              {range === '1hour' ? 'Last 1h' : range === '3hours' ? 'Last 3h' : 'Last 6h'}
            </button>
          ))}
        </div>
      </div>

      {/* Reference Node Info Dialog */}
      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />

      {/* Tabbed Content */}
      <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
        <div className="relative">
          <ScrollableTabs>
            <Tab>newPayload</Tab>
            <Tab>getBlobs</Tab>
          </ScrollableTabs>

          {/* Reference Nodes Filter - positioned on the right */}
          <div className="absolute right-0 bottom-0 flex items-center gap-2 pb-2">
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
            <NewPayloadTab data={data} />
          </TabPanel>

          {/* getBlobs Tab */}
          <TabPanel>
            <GetBlobsTab data={data} isLoading={isLoadingBlobs} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </Container>
  );
}
