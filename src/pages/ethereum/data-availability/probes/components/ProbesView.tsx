import { type JSX, useState, useMemo, useCallback } from 'react';
import {
  createColumnHelper,
  type VisibilityState,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Dialog } from '@/components/Overlays/Dialog';
import { DataTable } from '@/components/DataTable';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import { Button } from '@/components/Elements/Button';
import { Alert } from '@/components/Feedback/Alert';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import type { IntCustodyProbe } from '@/api/types.gen';
import { FilterPanel, type FilterValues } from './FilterPanel';
import { PeerIdAvatar } from './PeerIdAvatar';
import { ProbeDetailDialog } from './ProbeDetailDialog';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// Use generated type directly
type CustodyProbe = IntCustodyProbe;

/**
 * Column helper for type-safe column definitions
 */
const columnHelper = createColumnHelper<CustodyProbe>();

/**
 * Truncate a hash or long string for display
 */
function truncateHash(hash?: string, length = 12): string {
  if (!hash) return '-';
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
}

/**
 * Clickable filter cell wrapper
 */
function FilterableCell({
  field,
  value,
  displayValue,
  children,
  onFilterClick,
  className = '',
}: {
  field: string;
  value: string | number | undefined | null;
  displayValue?: string;
  children?: React.ReactNode;
  onFilterClick?: (field: string, value: string | number) => void;
  className?: string;
}): JSX.Element {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted">-</span>;
  }

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onFilterClick) {
      onFilterClick(field, value);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cursor-pointer text-left transition-colors hover:text-primary hover:underline ${className}`}
      title={`Filter by ${displayValue ?? value}`}
    >
      {children ?? <span>{displayValue ?? String(value)}</span>}
    </button>
  );
}

export type ProbesViewProps = {
  data: CustodyProbe[];
  isLoading: boolean;
  error?: Error | null;
  pagination: {
    pageIndex: number;
    pageSize: number;
    onPaginationChange: (pageIndex: number, pageSize: number) => void;
  };
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  onFilterClick?: (field: string, value: string | number) => void;
  hasNextPage?: boolean;
  // Filter panel props
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
  // Controlled dialog state for URL-based linking
  selectedProbe: CustodyProbe | null;
  onProbeSelect: (probe: CustodyProbe | null) => void;
};

export function ProbesView({
  data,
  isLoading,
  error,
  pagination,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  onFilterClick,
  hasNextPage,
  filters,
  onFiltersChange,
  onClearFilters,
  selectedProbe,
  onProbeSelect,
}: ProbesViewProps): JSX.Element {
  // Dialog is open when a probe is selected
  const isDetailDialogOpen = selectedProbe !== null;

  // Learn more dialog state
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  // Column visibility state - managed locally for proper toggling
  // Default order: Time, Result, Prober, Prober Country, Peer Client, Peer Country, PeerID, Slots, Blob Posters, Columns, Error
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // Default visible columns (in order of appearance)
    probe_date_time: true, // Time
    result: true, // Result
    meta_client_implementation: true, // Prober
    meta_client_geo_country: true, // Prober Country
    meta_peer_implementation: true, // Peer Client
    meta_peer_geo_country: true, // Peer Country
    peer_id_unique_key: true, // PeerID
    slot: true, // Slot
    blob_submitters: true, // Blob Posters
    column_indices: true, // Columns
    error: true, // Error
    response_time_ms: true, // Latency
    // Default hidden columns
    node_id: false,
    meta_client_version: false,
    meta_peer_version: false,
    meta_client_geo_city: false,
    meta_peer_geo_city: false,
    meta_client_geo_autonomous_system_number: false,
    meta_peer_geo_autonomous_system_number: false,
    classification: false,
  });

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback(
    (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
      setColumnVisibility(prev => (typeof updater === 'function' ? updater(prev) : updater));
    },
    []
  );

  // Handle opening detail dialog
  const handleOpenDetails = useCallback(
    (probe: CustodyProbe): void => {
      onProbeSelect(probe);
    },
    [onProbeSelect]
  );

  // Handle dialog close
  const handleCloseDialog = useCallback((): void => {
    onProbeSelect(null);
  }, [onProbeSelect]);

  // Define table columns - ordered by default visibility preference:
  // Slot, Time, Result, Prober, Prober Country, Peer Client, Peer Country, PeerID, Blob Posters, Columns, Latency, Error
  const columns = useMemo(
    () => [
      // Actions column (first for easy access)
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: info => (
          <Button
            variant="soft"
            size="xs"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleOpenDetails(info.row.original);
            }}
          >
            <EyeIcon className="size-3.5" />
          </Button>
        ),
        meta: { enableHiding: false },
      }),

      // Slot - show single slot value (moved to front)
      columnHelper.accessor('slot', {
        header: 'Slot',
        cell: info => {
          const slot = info.getValue();
          if (slot === undefined || slot === null) return <span className="text-muted">-</span>;
          return (
            <FilterableCell field="slot" value={slot} onFilterClick={onFilterClick} className="font-mono text-xs">
              <span className="text-foreground">{slot}</span>
            </FilterableCell>
          );
        },
        enableSorting: true,
        meta: { enableHiding: true },
      }),

      // Time (relative format) - probe_date_time is in seconds
      columnHelper.accessor('probe_date_time', {
        header: 'Time',
        cell: info => {
          const value = info.getValue();
          if (!value) return <span className="text-muted">-</span>;
          return <Timestamp timestamp={value} format="relative" />;
        },
        enableSorting: true,
        meta: { enableHiding: true },
      }),

      // Result - more prominent display
      columnHelper.accessor('result', {
        header: 'Result',
        cell: info => {
          const result = info.getValue();
          if (!result) return <span className="text-muted">-</span>;

          const isSuccess = result === 'success';
          const isFailure = result === 'failure';

          // failure = yellow (transient/one-off failure - less severe)
          // missing = red (peer responded but didn't have the data - serious)
          const icon = isSuccess ? (
            <CheckCircleIcon className="size-5 text-green-500" />
          ) : isFailure ? (
            <XCircleIcon className="size-5 text-yellow-500" />
          ) : (
            <QuestionMarkCircleIcon className="size-5 text-red-500" />
          );

          return (
            <FilterableCell field="result" value={result} onFilterClick={onFilterClick}>
              <div
                className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 ${
                  isSuccess
                    ? 'bg-green-500/10 text-green-500'
                    : isFailure
                      ? 'bg-yellow-500/10 text-yellow-500'
                      : 'bg-red-500/10 text-red-500'
                }`}
              >
                {icon}
                <span className="text-xs font-semibold tracking-wide uppercase">{result}</span>
              </div>
            </FilterableCell>
          );
        },
        enableSorting: true,
        meta: { enableHiding: true },
      }),

      // Prober Implementation
      columnHelper.accessor('meta_client_implementation', {
        header: 'Prober',
        cell: info => {
          const client = info.getValue();
          if (!client) return <span className="text-muted">-</span>;
          return (
            <FilterableCell field="meta_client_implementation" value={client} onFilterClick={onFilterClick}>
              <div className="flex items-center gap-2">
                <ClientLogo client={client} size={20} />
                <span className="text-sm font-medium">{client}</span>
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Prober Country
      columnHelper.accessor('meta_client_geo_country', {
        header: 'Prober Country',
        cell: info => {
          const country = info.getValue();
          const code = info.row.original.meta_client_geo_country_code;
          return (
            <FilterableCell field="meta_client_geo_country" value={country} onFilterClick={onFilterClick}>
              <div className="flex items-center gap-1">
                <span>{getCountryFlag(code)}</span>
                <span className="text-xs">{country || '-'}</span>
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Peer Implementation (renamed to Peer Client)
      columnHelper.accessor('meta_peer_implementation', {
        header: 'Peer Client',
        cell: info => {
          const client = info.getValue();
          if (!client) return <span className="text-muted">-</span>;
          return (
            <FilterableCell field="meta_peer_implementation" value={client} onFilterClick={onFilterClick}>
              <div className="flex items-center gap-2">
                <ClientLogo client={client} size={20} />
                <span className="text-sm font-medium">{client}</span>
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Peer Country
      columnHelper.accessor('meta_peer_geo_country', {
        header: 'Peer Country',
        cell: info => {
          const country = info.getValue();
          const code = info.row.original.meta_peer_geo_country_code;
          return (
            <FilterableCell field="meta_peer_geo_country" value={country} onFilterClick={onFilterClick}>
              <div className="flex items-center gap-1">
                <span>{getCountryFlag(code)}</span>
                <span className="text-xs">{country || '-'}</span>
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Peer ID - with unique visual avatar (number shown in tooltip only)
      columnHelper.accessor('peer_id_unique_key', {
        header: 'Peer ID',
        cell: info => {
          const value = info.getValue();
          if (!value) return <span className="text-muted">-</span>;
          return (
            <FilterableCell field="peer_id_unique_key" value={value} onFilterClick={onFilterClick}>
              <div className="flex items-center justify-center" title={`Peer ID: ${value}`}>
                <PeerIdAvatar peerId={value} size={24} />
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true, cellClassName: 'text-center' },
      }),

      // Blob Posters - show logos for blob submitters (top 4, ordered by count)
      columnHelper.accessor('blob_submitters', {
        header: 'Blob Posters',
        cell: info => {
          const submitters = info.getValue();
          if (!submitters?.length) return <span className="text-muted">-</span>;

          // Count occurrences and get unique posters sorted by count
          const countMap = new Map<string, number>();
          for (const submitter of submitters) {
            countMap.set(submitter, (countMap.get(submitter) ?? 0) + 1);
          }
          const sortedPosters = [...countMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name]) => name);

          const hasMore = countMap.size > 4;

          return (
            <div className="flex items-center gap-1">
              {sortedPosters.map(poster => (
                <FilterableCell key={poster} field="blob_submitters" value={poster} onFilterClick={onFilterClick}>
                  <BlobPosterLogo poster={poster} size={18} />
                </FilterableCell>
              ))}
              {hasMore && <span className="text-[10px] text-muted">+{countMap.size - 4}</span>}
            </div>
          );
        },
        enableSorting: false,
        meta: { enableHiding: true },
      }),

      // Columns - show count and sample if available
      columnHelper.accessor('column_indices', {
        header: 'Columns',
        cell: info => {
          const cols = info.getValue();
          if (!cols?.length) return <span className="text-muted">-</span>;
          // Show first 3 columns as preview
          const preview = cols.slice(0, 3).join(', ');
          const hasMore = cols.length > 3;
          return (
            <span className="font-mono text-xs">
              <span className="text-foreground">{preview}</span>
              {hasMore && <span className="text-muted">... ({cols.length})</span>}
            </span>
          );
        },
        enableSorting: false,
        meta: { enableHiding: true },
      }),

      // Latency - moved to end
      columnHelper.accessor('response_time_ms', {
        header: 'Latency',
        cell: info => {
          const ms = info.getValue();
          if (!ms) return <span className="text-muted">-</span>;
          let color = 'text-green-500';
          if (ms > 4000) color = 'text-yellow-500';
          if (ms > 8000) color = 'text-red-500';
          return <span className={`font-mono text-xs ${color}`}>{ms}ms</span>;
        },
        enableSorting: true,
        meta: { enableHiding: true },
      }),

      // Error - moved to end
      columnHelper.accessor('error', {
        header: 'Error',
        cell: info => {
          const error = info.getValue();
          if (!error) return <span className="text-muted">-</span>;
          return (
            <span className="text-[10px] text-red-400" title={error}>
              {truncateHash(error, 20)}
            </span>
          );
        },
        meta: { enableHiding: true },
      }),

      // --- Hidden by default columns below ---

      // Node ID
      columnHelper.accessor('node_id', {
        header: 'Node ID',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell
              field="node_id"
              value={value}
              onFilterClick={onFilterClick}
              className="font-mono text-[10px]"
            >
              {truncateHash(value, 20)}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Prober Version
      columnHelper.accessor('meta_client_version', {
        header: 'Prober Ver',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell
              field="meta_client_version"
              value={value}
              onFilterClick={onFilterClick}
              className="font-mono text-[10px]"
            >
              {truncateHash(value, 12)}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Peer Version
      columnHelper.accessor('meta_peer_version', {
        header: 'Peer Ver',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell
              field="meta_peer_version"
              value={value}
              onFilterClick={onFilterClick}
              className="font-mono text-[10px]"
            >
              {truncateHash(value, 12)}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Prober City
      columnHelper.accessor('meta_client_geo_city', {
        header: 'Prober City',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell
              field="meta_client_geo_city"
              value={value}
              onFilterClick={onFilterClick}
              className="text-xs"
            >
              {value || '-'}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Peer City
      columnHelper.accessor('meta_peer_geo_city', {
        header: 'Peer City',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell field="meta_peer_geo_city" value={value} onFilterClick={onFilterClick} className="text-xs">
              {value || '-'}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Prober ASN
      columnHelper.accessor('meta_client_geo_autonomous_system_number', {
        header: 'Prober ASN',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell
              field="meta_client_geo_autonomous_system_number"
              value={value}
              displayValue={value ? `AS${value}` : undefined}
              onFilterClick={onFilterClick}
              className="font-mono text-[10px]"
            >
              {value ? `AS${value}` : '-'}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Peer ASN
      columnHelper.accessor('meta_peer_geo_autonomous_system_number', {
        header: 'Peer ASN',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell
              field="meta_peer_geo_autonomous_system_number"
              value={value}
              displayValue={value ? `AS${value}` : undefined}
              onFilterClick={onFilterClick}
              className="font-mono text-[10px]"
            >
              {value ? `AS${value}` : '-'}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Classification
      columnHelper.accessor('classification', {
        header: 'Classification',
        cell: info => {
          const value = info.getValue();
          return (
            <FilterableCell field="classification" value={value} onFilterClick={onFilterClick} className="text-xs">
              {value || '-'}
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),
    ],
    [onFilterClick, handleOpenDetails]
  );

  if (error) {
    return (
      <Container>
        <Header
          title="Custody Probes"
          description={
            <>
              Individual probe events showing custody verification attempts across the network. Powered by{' '}
              <a
                href="https://github.com/ethp2p/dasmon"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Dasmon
              </a>
            </>
          }
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <Header
          title="Custody Probes"
          description={
            <>
              Individual probe events showing custody verification attempts across the network. Powered by{' '}
              <a
                href="https://github.com/ethp2p/dasmon"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Dasmon
              </a>
            </>
          }
          className="mb-0"
        />
        <button
          type="button"
          onClick={() => setLearnMoreOpen(true)}
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/20"
        >
          <InformationCircleIcon className="size-4" />
          Learn more
        </button>
      </div>

      {/* Learn More Dialog */}
      <Dialog open={learnMoreOpen} onClose={() => setLearnMoreOpen(false)} title="About Custody Probes" size="lg">
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            <span className="font-medium text-foreground">
              Custody probes verify that peers are storing the data they claim.
            </span>{' '}
            Each probe samples a specific peer&apos;s custody of data columns, validating responses against KZG
            commitments.
          </p>
          <p>
            The prober (our node) requests data from a peer, and the result indicates whether the peer successfully
            provided valid data for the requested columns.
          </p>
          <div className="rounded-sm border border-accent/20 bg-accent/5 p-3">
            <p className="text-foreground">
              <span className="font-medium">Result meanings:</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <span className="font-medium text-green-500">Success</span> - Peer provided valid data matching KZG
                commitments
              </li>
              <li>
                <span className="font-medium text-yellow-500">Failure</span> - Transient error (timeout, connection
                issue)
              </li>
              <li>
                <span className="font-medium text-red-500">Missing</span> - Peer responded but didn&apos;t have the data
              </li>
            </ul>
          </div>
          <p>
            Use the filters to drill down into specific probers, peers, geographic regions, client implementations, or
            time ranges to analyze custody behavior across the network.
          </p>
        </div>
      </Dialog>

      {/* Filter panel */}
      <div className="mb-4">
        <FilterPanel filters={filters} onFiltersChange={onFiltersChange} onClearAll={onClearFilters} />
      </div>

      {/* Data table */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <DataTable
          data={data}
          columns={columns}
          isLoading={isLoading}
          pageSize={pagination.pageSize}
          pageIndex={pagination.pageIndex}
          onPaginationChange={pagination.onPaginationChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          emptyMessage="No probe data available."
          // Server-side controls
          manualPagination={true}
          manualFiltering={true}
          manualSorting={true}
          hasNextPage={hasNextPage}
          sorting={sorting}
          onSortingChange={onSortingChange}
          columnFilters={columnFilters}
          onColumnFiltersChange={onColumnFiltersChange}
          // Hide global filter (we have custom filter panel)
          hideGlobalFilter={true}
          // Show pagination at top
          paginationPosition="top"
        />
      </div>

      {/* Detail dialog - shared component */}
      <ProbeDetailDialog
        probe={selectedProbe}
        isOpen={isDetailDialogOpen}
        onClose={handleCloseDialog}
        onFilterClick={onFilterClick}
      />
    </Container>
  );
}
