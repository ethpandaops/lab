import { type JSX, useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataTable } from '@/components/DataTable';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import { Dialog } from '@/components/Overlays/Dialog';
import { Alert } from '@/components/Feedback/Alert';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import { useNetwork } from '@/hooks/useNetwork';
import { intCustodyProbeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntCustodyProbe } from '@/api/types.gen';
import type { ProbesSearch } from './IndexPage.types';
import type { VisibilityState } from '@tanstack/react-table';

// Use generated type directly - result field is now part of the schema
type CustodyProbe = IntCustodyProbe;

/**
 * Column helper for type-safe column definitions
 */
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
 * Custody Probes page showing individual probe results
 */
export function IndexPage(): JSX.Element {
  // URL-based state management
  const navigate = useNavigate({ from: '/ethereum/data-availability/probes/' });
  const search = {} as ProbesSearch; // TODO: Use useSearch hook when route is fully configured
  const { currentNetwork } = useNetwork();

  // Dialog state for row details
  const [selectedProbe, setSelectedProbe] = useState<CustodyProbe | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Calculate 7 days ago in milliseconds for the event_date_time filter
  const sevenDaysAgoMs = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return now - sevenDays;
  }, []);

  // Fetch data from the API with required event_date_time filter and pagination
  const {
    data: apiData,
    isLoading,
    error,
  } = useQuery({
    ...intCustodyProbeServiceListOptions({
      query: {
        event_date_time_gte: sevenDaysAgoMs,
        page_size: 100,
      },
    }),
    enabled: !!currentNetwork,
  });

  // Use API data directly - result field is now part of the schema
  const data = useMemo(() => {
    return {
      int_custody_probe: apiData?.int_custody_probe ?? [],
    };
  }, [apiData]);

  // Define table columns
  const columns = useMemo(
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
          const stringValue = value?.toString();
          return (
            <span className="font-mono text-xs" title={stringValue}>
              {truncateHash(stringValue, 16)}
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

  // Default column visibility - hide some columns by default
  const defaultColumnVisibility: VisibilityState = useMemo(
    () => ({
      error: false,
      meta_client_implementation: false,
      meta_client_geo_country: false,
      column_indices: false,
    }),
    []
  );

  // Handle row click to show details
  const handleRowClick = (probe: CustodyProbe): void => {
    setSelectedProbe(probe);
    setIsDetailDialogOpen(true);
  };

  // Handle dialog close
  const handleCloseDialog = (): void => {
    setIsDetailDialogOpen(false);
    setSelectedProbe(null);
  };

  // Sync pagination with URL
  const handlePaginationChange = (pageIndex: number, pageSize: number): void => {
    navigate({
      search: prev => ({
        ...prev,
        page: pageIndex + 1, // Convert 0-indexed to 1-indexed for URL
        pageSize,
      }),
    });
  };

  if (error) {
    return (
      <Container>
        <Header
          title="Custody Probes"
          description="Individual probe results showing column sampling across the PeerDAS network"
        />
        <Alert
          variant="error"
          title="Error loading probes"
          description={error instanceof Error ? error.message : 'An unexpected error occurred'}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Custody Probes"
        description="Individual probe results showing column sampling across the PeerDAS network. Each row represents a single probe attempt to retrieve a data column from a peer."
      />

      {/* Data table */}
      <DataTable
        data={data?.int_custody_probe ?? []}
        columns={columns}
        isLoading={isLoading}
        pageSize={search.pageSize ?? 25}
        pageIndex={(search.page ?? 1) - 1} // Convert 1-indexed URL to 0-indexed table
        onPaginationChange={handlePaginationChange}
        onRowClick={handleRowClick}
        columnVisibility={defaultColumnVisibility}
        emptyMessage="No probe data available. The API may not be configured yet."
        manualPagination={false}
        manualFiltering={false}
        manualSorting={false}
      />

      {/* Detail dialog */}
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
                          {selectedProbe.meta_peer_version && ` v${selectedProbe.meta_peer_version}`}
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
                          {selectedProbe.meta_client_version && ` v${selectedProbe.meta_client_version}`}
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
    </Container>
  );
}
