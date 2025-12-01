import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useMemo, useState } from 'react';
import { createColumnHelper, type VisibilityState } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import { Dialog } from '@/components/Overlays/Dialog';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';

/**
 * Mock type matching the expected API response shape for custody probes
 */
interface CustodyProbe {
  event_date_time?: number;
  slots?: (number | null)[];
  column_indices?: number[];
  peer_id_unique_key?: string;
  result: 'success' | 'failure' | 'missing';
  response_time_ms?: number;
  meta_peer_implementation?: string;
  meta_peer_version?: string;
  meta_peer_platform?: string;
  meta_peer_geo_country?: string;
  meta_peer_geo_city?: string;
  meta_peer_geo_autonomous_system_organization?: string;
  meta_peer_geo_autonomous_system_number?: number;
  error?: string;
  meta_client_implementation?: string;
  meta_client_version?: string;
  meta_client_geo_country?: string;
  meta_client_geo_city?: string;
  classification?: string;
}

const columnHelper = createColumnHelper<CustodyProbe>();

/**
 * Truncate a hash or long string for display
 */
function truncateHash(hash?: string, length = 12): string {
  if (!hash) return 'N/A';
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
}

/**
 * Generate realistic mock probe data
 */
function generateMockProbes(count: number): CustodyProbe[] {
  const clients = ['lighthouse', 'prysm', 'teku', 'nimbus', 'lodestar'];
  const countries = ['US', 'DE', 'GB', 'JP', 'SG', 'AU', 'CA', 'FR', 'NL', 'SE'];
  const cities: Record<string, string[]> = {
    US: ['New York', 'Los Angeles', 'Chicago', 'Dallas', 'Seattle'],
    DE: ['Frankfurt', 'Berlin', 'Munich', 'Hamburg'],
    GB: ['London', 'Manchester', 'Birmingham'],
    JP: ['Tokyo', 'Osaka', 'Kyoto'],
    SG: ['Singapore'],
    AU: ['Sydney', 'Melbourne'],
    CA: ['Toronto', 'Vancouver'],
    FR: ['Paris', 'Lyon'],
    NL: ['Amsterdam', 'Rotterdam'],
    SE: ['Stockholm'],
  };
  const asns = [
    { org: 'Amazon Web Services', number: 16509 },
    { org: 'Google Cloud', number: 15169 },
    { org: 'Hetzner Online GmbH', number: 24940 },
    { org: 'OVH SAS', number: 16276 },
    { org: 'DigitalOcean', number: 14061 },
    { org: 'Vultr Holdings', number: 20473 },
  ];
  const results: ('success' | 'failure' | 'missing')[] = ['success', 'failure', 'missing'];
  const errors = [
    'connection timeout after 10s',
    'peer disconnected unexpectedly',
    'invalid response format',
    'rate limited by peer',
    'column not available',
    'network unreachable',
  ];

  const baseTime = Date.now();

  return Array.from({ length: count }, (_, i) => {
    const result = results[Math.floor(Math.random() * 100) < 75 ? 0 : Math.floor(Math.random() * 3)];
    const peerCountry = countries[Math.floor(Math.random() * countries.length)];
    const clientCountry = countries[Math.floor(Math.random() * countries.length)];
    const peerAsn = asns[Math.floor(Math.random() * asns.length)];

    return {
      event_date_time: baseTime - i * 12000 - Math.floor(Math.random() * 5000),
      slots: [Math.floor(Math.random() * 1000000) + 8000000],
      column_indices: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => Math.floor(Math.random() * 128)),
      peer_id_unique_key: `16Uiu2HAm${Array.from({ length: 40 }, () =>
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 62))
      ).join('')}`,
      result,
      response_time_ms: result === 'success' ? Math.floor(Math.random() * 500) + 50 : undefined,
      meta_peer_implementation: clients[Math.floor(Math.random() * clients.length)],
      meta_peer_version: `v${Math.floor(Math.random() * 3) + 4}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      meta_peer_platform: 'linux/amd64',
      meta_peer_geo_country: peerCountry,
      meta_peer_geo_city: cities[peerCountry][Math.floor(Math.random() * cities[peerCountry].length)],
      meta_peer_geo_autonomous_system_organization: peerAsn.org,
      meta_peer_geo_autonomous_system_number: peerAsn.number,
      error: result === 'failure' ? errors[Math.floor(Math.random() * errors.length)] : undefined,
      meta_client_implementation: clients[Math.floor(Math.random() * clients.length)],
      meta_client_version: `v${Math.floor(Math.random() * 3) + 4}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      meta_client_geo_country: clientCountry,
      meta_client_geo_city: cities[clientCountry][Math.floor(Math.random() * cities[clientCountry].length)],
      classification: Math.random() > 0.7 ? 'internal' : Math.random() > 0.5 ? 'corporate' : 'external',
    };
  });
}

/**
 * Generate columns for the DataTable
 */
function useProbeColumns() {
  return useMemo(
    () => [
      columnHelper.accessor('event_date_time', {
        header: 'Time',
        cell: info => {
          const value = info.getValue();
          if (value === undefined) return <span className="text-muted">N/A</span>;
          return <Timestamp timestamp={value} format="short" />;
        },
        enableSorting: true,
        meta: {
          filterType: 'date-range',
          enableHiding: true,
          cellClassName: 'text-foreground',
        },
      }),
      columnHelper.accessor('slots', {
        header: 'Slots',
        cell: info => {
          const slots = info.getValue();
          if (!slots || slots.length === 0) return <span className="text-muted">N/A</span>;
          if (slots.length === 1) {
            return <span className="font-mono text-foreground">{slots[0]?.toLocaleString()}</span>;
          }
          return (
            <span className="font-mono text-foreground" title={slots.map(s => s?.toLocaleString()).join(', ')}>
              {slots.length} slots
            </span>
          );
        },
        enableSorting: false,
        meta: {
          enableHiding: true,
          cellClassName: 'font-mono text-foreground',
        },
      }),
      columnHelper.accessor('column_indices', {
        header: 'Columns',
        cell: info => {
          const columns = info.getValue();
          if (!columns || columns.length === 0) return <span className="text-muted">N/A</span>;
          if (columns.length === 1) {
            return <span className="font-mono text-foreground">{columns[0]}</span>;
          }
          return (
            <span className="font-mono text-foreground" title={columns.join(', ')}>
              {columns.length} cols
            </span>
          );
        },
        enableSorting: false,
        meta: {
          enableHiding: true,
          cellClassName: 'font-mono text-foreground',
        },
      }),
      columnHelper.accessor('peer_id_unique_key', {
        header: 'Peer ID',
        cell: info => {
          const value = info.getValue();
          return (
            <span className="font-mono text-xs" title={value}>
              {truncateHash(value, 16)}
            </span>
          );
        },
        meta: {
          filterType: 'text',
          filterPlaceholder: 'Search peer ID...',
          enableHiding: true,
          cellClassName: 'font-mono text-xs',
        },
      }),
      columnHelper.accessor('result', {
        header: 'Result',
        cell: info => {
          const result = info.getValue();
          const colorMap = {
            success: 'green' as const,
            failure: 'red' as const,
            missing: 'yellow' as const,
          };
          return (
            <Badge color={colorMap[result]} dot>
              {result}
            </Badge>
          );
        },
        enableSorting: true,
        meta: {
          filterType: 'select',
          filterOptions: [
            { value: 'success', label: 'Success' },
            { value: 'failure', label: 'Failure' },
            { value: 'missing', label: 'Missing' },
          ],
          filterPlaceholder: 'All results',
          enableHiding: true,
        },
      }),
      columnHelper.accessor('response_time_ms', {
        header: 'Response Time',
        cell: info => {
          const ms = info.getValue();
          if (ms === undefined || ms === null) return <span className="text-muted">N/A</span>;
          return <span className="font-mono">{ms}ms</span>;
        },
        enableSorting: true,
        meta: {
          filterType: 'number-range',
          filterPlaceholder: 'Min ms...',
          enableHiding: true,
          cellClassName: 'font-mono',
        },
      }),
      columnHelper.accessor('meta_peer_implementation', {
        header: 'Peer Client',
        cell: info => {
          const client = info.getValue();
          if (!client) return <span className="text-muted">Unknown</span>;
          return (
            <div className="flex items-center gap-2">
              <ClientLogo client={client} size={20} />
              <span className="text-foreground">{client}</span>
            </div>
          );
        },
        meta: {
          filterType: 'text',
          filterPlaceholder: 'Search peer client...',
          enableHiding: true,
        },
      }),
      columnHelper.accessor('meta_peer_geo_country', {
        header: 'Peer Country',
        cell: info => {
          const country = info.getValue();
          const flag = getCountryFlag(country, '🌐');
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-lg" title={country || 'Unknown'}>
                {flag}
              </span>
              <span className="text-xs text-muted">{country || 'Unknown'}</span>
            </div>
          );
        },
        meta: {
          filterType: 'text',
          filterPlaceholder: 'Search peer country...',
          enableHiding: true,
        },
      }),
      columnHelper.accessor('meta_client_implementation', {
        header: 'Prober Client',
        cell: info => {
          const client = info.getValue();
          if (!client) return <span className="text-muted">Unknown</span>;
          return (
            <div className="flex items-center gap-2">
              <ClientLogo client={client} size={20} />
              <span className="text-foreground">{client}</span>
            </div>
          );
        },
        meta: {
          filterType: 'text',
          filterPlaceholder: 'Search prober...',
          enableHiding: true,
        },
      }),
      columnHelper.accessor('error', {
        header: 'Error',
        cell: info => {
          const error = info.getValue();
          if (!error) return <span className="text-muted">-</span>;
          return (
            <span className="text-xs text-danger" title={error}>
              {truncateHash(error, 30)}
            </span>
          );
        },
        meta: {
          filterType: 'text',
          filterPlaceholder: 'Search error...',
          enableHiding: true,
          cellClassName: 'text-xs text-danger',
        },
      }),
      columnHelper.accessor('meta_client_geo_country', {
        header: 'Prober Country',
        cell: info => {
          const country = info.getValue();
          const flag = getCountryFlag(country, '🌐');
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-lg" title={country || 'Unknown'}>
                {flag}
              </span>
              <span className="text-xs text-muted">{country || 'Unknown'}</span>
            </div>
          );
        },
        meta: {
          filterType: 'text',
          filterPlaceholder: 'Search country...',
          enableHiding: true,
        },
      }),
    ],
    []
  );
}

// Generate mock data once for all stories
const mockProbes = generateMockProbes(50);
const mockProbesWithFailures = generateMockProbes(30).map((probe, i) => ({
  ...probe,
  result: i % 3 === 0 ? 'failure' : i % 5 === 0 ? 'missing' : 'success',
  error: i % 3 === 0 ? 'connection timeout after 10s' : undefined,
  response_time_ms: i % 3 === 0 ? undefined : probe.response_time_ms,
})) as CustodyProbe[];

/**
 * Component wrapper for stories to provide hooks context
 */
function ProbesTableWrapper({
  data,
  isLoading = false,
  showDialog = false,
}: {
  data: CustodyProbe[];
  isLoading?: boolean;
  showDialog?: boolean;
}): JSX.Element {
  const columns = useProbeColumns();
  const [selectedProbe, setSelectedProbe] = useState<CustodyProbe | null>(showDialog ? data[0] : null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(showDialog);

  const defaultColumnVisibility: VisibilityState = useMemo(
    () => ({
      error: false,
      meta_client_implementation: false,
      meta_client_geo_country: false,
      column_indices: false,
    }),
    []
  );

  const handleRowClick = (probe: CustodyProbe): void => {
    setSelectedProbe(probe);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDialog = (): void => {
    setIsDetailDialogOpen(false);
    setSelectedProbe(null);
  };

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        pageSize={10}
        onRowClick={handleRowClick}
        columnVisibility={defaultColumnVisibility}
        emptyMessage="No probe data available. The API may not be configured yet."
        manualPagination={false}
        manualFiltering={false}
        manualSorting={false}
      />

      <Dialog
        open={isDetailDialogOpen}
        onClose={handleCloseDialog}
        title="Probe Details"
        description="Complete information about this custody probe"
        size="lg"
      >
        {selectedProbe && (
          <div className="space-y-4">
            {/* Probe Info Section - Grid layout */}
            <div>
              <h4 className="border-b border-border pb-2 text-sm font-semibold text-foreground">Probe Information</h4>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium text-muted">Time</dt>
                  <dd className="mt-0.5 text-sm text-foreground">
                    {selectedProbe.event_date_time !== undefined ? (
                      <Timestamp timestamp={selectedProbe.event_date_time} format="short" disableModal />
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">Slot</dt>
                  <dd className="mt-0.5 font-mono text-sm text-foreground">
                    {selectedProbe.slots?.length === 1
                      ? selectedProbe.slots[0]?.toLocaleString()
                      : selectedProbe.slots?.length
                        ? `${selectedProbe.slots.length} slots`
                        : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">Result</dt>
                  <dd className="mt-0.5">
                    <Badge
                      color={
                        selectedProbe.result === 'success'
                          ? 'green'
                          : selectedProbe.result === 'failure'
                            ? 'red'
                            : 'yellow'
                      }
                      dot
                    >
                      {selectedProbe.result}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">Response Time</dt>
                  <dd className="mt-0.5 font-mono text-sm text-foreground">
                    {selectedProbe.response_time_ms !== undefined ? `${selectedProbe.response_time_ms}ms` : 'N/A'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-muted">Column Indices</dt>
                  <dd className="mt-0.5 font-mono text-sm text-foreground">
                    {selectedProbe.column_indices?.length === 1
                      ? selectedProbe.column_indices[0]
                      : selectedProbe.column_indices?.length
                        ? `${selectedProbe.column_indices.length} columns: ${selectedProbe.column_indices.slice(0, 8).join(', ')}${selectedProbe.column_indices.length > 8 ? '...' : ''}`
                        : 'N/A'}
                  </dd>
                </div>
                {selectedProbe.error && (
                  <div className="col-span-full">
                    <dt className="text-xs font-medium text-muted">Error</dt>
                    <dd className="mt-0.5 font-mono text-xs text-danger">{selectedProbe.error}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Peer ID - Full width */}
            <div>
              <dt className="text-xs font-medium text-muted">Peer ID</dt>
              <dd className="mt-0.5 font-mono text-xs break-all text-foreground">
                {selectedProbe.peer_id_unique_key ?? 'N/A'}
              </dd>
            </div>

            {/* Two-column layout for Peer and Prober info */}
            <div className="grid grid-cols-2 gap-6">
              {/* Probed Peer */}
              <div>
                <h4 className="border-b border-border pb-2 text-sm font-semibold text-foreground">Probed Peer</h4>
                <dl className="mt-3 space-y-2">
                  {selectedProbe.meta_peer_implementation && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Client</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5">
                        <ClientLogo client={selectedProbe.meta_peer_implementation} size={18} />
                        <span className="text-sm text-foreground">
                          {selectedProbe.meta_peer_implementation}
                          {selectedProbe.meta_peer_version && ` ${selectedProbe.meta_peer_version}`}
                        </span>
                      </dd>
                    </div>
                  )}
                  {selectedProbe.meta_peer_geo_country && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Location</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-base">{getCountryFlag(selectedProbe.meta_peer_geo_country)}</span>
                        <span className="text-sm text-foreground">
                          {[selectedProbe.meta_peer_geo_city, selectedProbe.meta_peer_geo_country]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </dd>
                    </div>
                  )}
                  {selectedProbe.meta_peer_geo_autonomous_system_organization && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Network</dt>
                      <dd className="mt-0.5 text-sm text-foreground">
                        {selectedProbe.meta_peer_geo_autonomous_system_organization}
                        {selectedProbe.meta_peer_geo_autonomous_system_number &&
                          ` (AS${selectedProbe.meta_peer_geo_autonomous_system_number})`}
                      </dd>
                    </div>
                  )}
                  {selectedProbe.meta_peer_platform && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Platform</dt>
                      <dd className="mt-0.5 text-sm text-foreground">{selectedProbe.meta_peer_platform}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Prober (Xatu Client) */}
              <div>
                <h4 className="border-b border-border pb-2 text-sm font-semibold text-foreground">Prober</h4>
                <dl className="mt-3 space-y-2">
                  {selectedProbe.meta_client_implementation && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Client</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5">
                        <ClientLogo client={selectedProbe.meta_client_implementation} size={18} />
                        <span className="text-sm text-foreground">
                          {selectedProbe.meta_client_implementation}
                          {selectedProbe.meta_client_version && ` ${selectedProbe.meta_client_version}`}
                        </span>
                      </dd>
                    </div>
                  )}
                  {selectedProbe.meta_client_geo_country && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Location</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-base">{getCountryFlag(selectedProbe.meta_client_geo_country)}</span>
                        <span className="text-sm text-foreground">
                          {[selectedProbe.meta_client_geo_city, selectedProbe.meta_client_geo_country]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </dd>
                    </div>
                  )}
                  {selectedProbe.classification && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Classification</dt>
                      <dd className="mt-0.5">
                        <Badge
                          color={
                            selectedProbe.classification === 'internal'
                              ? 'blue'
                              : selectedProbe.classification === 'corporate'
                                ? 'purple'
                                : 'gray'
                          }
                        >
                          {selectedProbe.classification}
                        </Badge>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

const meta: Meta<typeof ProbesTableWrapper> = {
  title: 'Pages/Ethereum/DataAvailability/Probes',
  component: ProbesTableWrapper,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProbesTableWrapper>;

/**
 * Default view showing the probes table with realistic data
 */
export const Default: Story = {
  args: {
    data: mockProbes,
    isLoading: false,
    showDialog: false,
  },
};

/**
 * Loading state with shimmer effect
 */
export const Loading: Story = {
  args: {
    data: [],
    isLoading: true,
    showDialog: false,
  },
};

/**
 * Empty state when no probes are available
 */
export const Empty: Story = {
  args: {
    data: [],
    isLoading: false,
    showDialog: false,
  },
};

/**
 * Table with a mix of success, failure, and missing results
 */
export const MixedResults: Story = {
  args: {
    data: mockProbesWithFailures,
    isLoading: false,
    showDialog: false,
  },
};

/**
 * Detail dialog shown for a probe row
 */
export const WithDetailDialog: Story = {
  args: {
    data: mockProbes,
    isLoading: false,
    showDialog: true,
  },
};

/**
 * Shows only failed probes with error messages
 */
export const FailedProbesOnly: Story = {
  args: {
    data: mockProbesWithFailures.filter(p => p.result === 'failure'),
    isLoading: false,
    showDialog: false,
  },
};

/**
 * Small dataset for focused testing
 */
export const FewRows: Story = {
  args: {
    data: mockProbes.slice(0, 5),
    isLoading: false,
    showDialog: false,
  },
};
