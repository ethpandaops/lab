import { type JSX, useState } from 'react';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { Alert } from '@/components/Feedback/Alert';
import { Dialog } from '@/components/Overlays/Dialog';
import { Checkbox } from '@/components/Forms/Checkbox';
import { useTabState } from '@/hooks/useTabState';
import { useEngineTimingsData } from './hooks/useEngineTimingsData';
import { TimingsSkeleton } from './components/TimingsSkeleton';
import { NewPayloadTab } from './components/NewPayloadTab';
import { GetBlobsTab } from './components/GetBlobsTab';
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
      <Dialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} title="About Reference Nodes" size="lg">
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            <span className="font-medium text-foreground">
              Reference nodes are controlled by ethPandaOps and follow EIP-7870 hardware specifications.
            </span>{' '}
            This EIP establishes standardized hardware and bandwidth recommendations to ensure consistent, meaningful
            benchmark comparisons across the Ethereum network.
          </p>
          <p>
            EIP-7870 defines three node types with specific requirements: Full Nodes for chain following, Attesters for
            validators, and Local Block Builders for block proposal. Each has distinct hardware and bandwidth needs.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium text-foreground">Node Type</th>
                  <th className="py-2 pr-4 font-medium text-foreground">RAM</th>
                  <th className="py-2 pr-4 font-medium text-foreground">CPU</th>
                  <th className="py-2 font-medium text-foreground">Bandwidth</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Full Node</td>
                  <td className="py-2 pr-4">32 GB</td>
                  <td className="py-2 pr-4">4c/8t</td>
                  <td className="py-2">50/15 Mbps</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Attester</td>
                  <td className="py-2 pr-4">64 GB</td>
                  <td className="py-2 pr-4">8c/16t</td>
                  <td className="py-2">50/25 Mbps</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Local Block Builder</td>
                  <td className="py-2 pr-4">64 GB</td>
                  <td className="py-2 pr-4">8c/16t</td>
                  <td className="py-2">100/50 Mbps</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-sm border border-accent/20 bg-accent/5 p-3">
            <p className="text-foreground">
              <span className="font-medium">Why filter by reference nodes?</span>{' '}
              <span className="italic">
                This ensures timing data reflects consistent, spec-compliant hardware rather than varied community
                setups.
              </span>
            </p>
          </div>
          <p>
            All reference nodes use 4 TB NVMe storage. By filtering to reference nodes, you see Engine API performance
            on standardized infrastructure, making it easier to identify client-specific behavior versus
            hardware-related variance.
          </p>
          <p className="text-xs">
            <a
              href="https://eips.ethereum.org/EIPS/eip-7870"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Read EIP-7870 specification
            </a>
          </p>
        </div>
      </Dialog>

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
