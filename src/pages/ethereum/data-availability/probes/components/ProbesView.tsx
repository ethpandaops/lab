import { type JSX, useState, useMemo, useCallback, type RefObject } from 'react';
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
import { QuickFilters } from './QuickFilters';
import { PeerIdAvatar } from './PeerIdAvatar';
import { ProbeDetailDialog } from './ProbeDetailDialog';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  InformationCircleIcon,
  PlayIcon,
  PauseIcon,
  SignalIcon,
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
  // Live mode props
  isLive?: boolean;
  onLiveModeToggle?: () => void;
  newItemIdsRef?: RefObject<Set<string>>;
  liveHitPageLimitRef?: RefObject<boolean>;
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
  // Live mode
  isLive = false,
  onLiveModeToggle,
  newItemIdsRef,
  liveHitPageLimitRef: _liveHitPageLimitRef,
}: ProbesViewProps): JSX.Element {
  // Dialog is open when a probe is selected
  const isDetailDialogOpen = selectedProbe !== null;

  // Learn more dialog state
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  // Column visibility state - managed locally for proper toggling
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // Default visible columns (in order of appearance)
    probe_date_time: true, // Time
    result: true, // Result
    meta_client_implementation: true, // Prober
    meta_client_geo_country: true, // Prober Country
    meta_peer_implementation: true, // Peer Client
    meta_peer_geo_country: true, // Peer Country
    meta_peer_geo_autonomous_system_number: true, // Peer ASN
    slot: true, // Slot
    blob_submitters: true, // Blob Posters
    column_indices: true, // Columns
    response_time_ms: true, // Latency
    peer_id_unique_key: true, // PeerID (at end)
    // Default hidden columns
    error: false,
    node_id: false,
    meta_client_version: false,
    meta_peer_version: false,
    meta_client_geo_city: false,
    meta_peer_geo_city: false,
    meta_client_geo_autonomous_system_number: false,
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

  // Get stable row ID for animations and tracking
  const getRowId = useCallback(
    (probe: CustodyProbe): string => `${probe.probe_date_time}:${probe.peer_id_unique_key}`,
    []
  );

  // Get row className for animation
  const getRowClassName = useCallback(
    (_probe: CustodyProbe, rowId: string): string | undefined => {
      if (isLive && newItemIdsRef?.current?.has(rowId)) {
        return 'animate-[row-new_0.3s_ease-out]';
      }
      return undefined;
    },
    [isLive, newItemIdsRef]
  );

  // Define table columns - ordered by default visibility preference:
  // Slot, Time, Result, Prober, Prober Country, Peer Client, Peer Country, PeerID, Blob Posters, Columns, Latency, Error
  const columns = useMemo(
    () => [
      // Actions column (first for easy access)
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 40,
        cell: info => (
          <Button
            variant="soft"
            size="xs"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleOpenDetails(info.row.original);
            }}
            className="!p-1"
          >
            <EyeIcon className="size-3" />
          </Button>
        ),
        meta: { enableHiding: false },
      }),

      // Slot - show single slot value (moved to front)
      columnHelper.accessor('slot', {
        header: 'Slot',
        size: 90,
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
        size: 100,
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
        size: 90,
        cell: info => {
          const result = info.getValue();
          if (!result) return <span className="text-muted">-</span>;

          const isSuccess = result === 'success';
          const isFailure = result === 'failure';

          // failure = yellow (transient/one-off failure - less severe)
          // missing = red (peer responded but didn't have the data - serious)
          const icon = isSuccess ? (
            <CheckCircleIcon className="size-3.5 text-green-500" />
          ) : isFailure ? (
            <XCircleIcon className="size-3.5 text-yellow-500" />
          ) : (
            <QuestionMarkCircleIcon className="size-3.5 text-red-500" />
          );

          return (
            <FilterableCell field="result" value={result} onFilterClick={onFilterClick}>
              <div
                className={`inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 ${
                  isSuccess
                    ? 'bg-green-500/10 text-green-500'
                    : isFailure
                      ? 'bg-yellow-500/10 text-yellow-500'
                      : 'bg-red-500/10 text-red-500'
                }`}
              >
                {icon}
                <span className="text-[10px] font-semibold tracking-wide uppercase">{result}</span>
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
        size: 100,
        cell: info => {
          const client = info.getValue();
          if (!client) return <span className="text-muted">-</span>;
          return (
            <FilterableCell field="meta_client_implementation" value={client} onFilterClick={onFilterClick}>
              <div className="flex items-center gap-1.5">
                <ClientLogo client={client} size={16} />
                <span className="font-medium">{client}</span>
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Prober Country
      columnHelper.accessor('meta_client_geo_country', {
        header: 'Prober Country',
        size: 130,
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
        size: 100,
        cell: info => {
          const client = info.getValue();
          if (!client) return <span className="text-muted">-</span>;
          return (
            <FilterableCell field="meta_peer_implementation" value={client} onFilterClick={onFilterClick}>
              <div className="flex items-center gap-1.5">
                <ClientLogo client={client} size={16} />
                <span className="font-medium">{client}</span>
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Peer Country
      columnHelper.accessor('meta_peer_geo_country', {
        header: 'Peer Country',
        size: 130,
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

      // Peer ASN
      columnHelper.accessor('meta_peer_geo_autonomous_system_number', {
        header: 'Peer ASN',
        size: 120,
        cell: info => {
          const value = info.getValue();
          const org = info.row.original.meta_peer_geo_autonomous_system_organization;
          if (!value) return <span className="text-muted">-</span>;
          const displayText = org ? (org.length > 15 ? `${org.slice(0, 15)}…` : org) : `AS${value}`;
          return (
            <FilterableCell
              field="meta_peer_geo_autonomous_system_number"
              value={value}
              displayValue={org || `AS${value}`}
              onFilterClick={onFilterClick}
              className="text-[10px]"
            >
              <span title={`AS${value}${org ? ` - ${org}` : ''}`}>{displayText}</span>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true },
      }),

      // Blob Posters - show logos for blob submitters (top 4, ordered by count)
      columnHelper.accessor('blob_submitters', {
        header: 'Blob Posters',
        size: 120,
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
                <FilterableCell
                  key={poster}
                  field="blob_submitters"
                  value={poster}
                  onFilterClick={onFilterClick}
                  className="shrink-0"
                >
                  <BlobPosterLogo poster={poster} size={16} />
                </FilterableCell>
              ))}
              {hasMore && <span className="shrink-0 text-[10px] text-muted">+{countMap.size - 4}</span>}
            </div>
          );
        },
        enableSorting: false,
        meta: { enableHiding: true },
      }),

      // Columns - show count only
      columnHelper.accessor('column_indices', {
        header: 'Cols',
        size: 50,
        cell: info => {
          const cols = info.getValue();
          if (!cols?.length) return <span className="text-muted">-</span>;
          return <span className="font-mono text-xs text-foreground">{cols.length}</span>;
        },
        enableSorting: false,
        meta: { enableHiding: true },
      }),

      // Latency - moved to end
      columnHelper.accessor('response_time_ms', {
        header: 'Latency',
        size: 70,
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

      // Peer ID - with unique visual avatar (number shown in tooltip only)
      columnHelper.accessor('peer_id_unique_key', {
        header: 'Peer ID',
        size: 60,
        cell: info => {
          const value = info.getValue();
          if (!value) return <span className="text-muted">-</span>;
          return (
            <FilterableCell field="peer_id_unique_key" value={value} onFilterClick={onFilterClick}>
              <div className="flex items-center justify-center" title={`Peer ID: ${value}`}>
                <PeerIdAvatar peerId={value} size={18} />
              </div>
            </FilterableCell>
          );
        },
        meta: { enableHiding: true, cellClassName: 'text-center' },
      }),

      // Error - hidden by default
      columnHelper.accessor('error', {
        header: 'Error',
        size: 80,
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
        size: 120,
        cell: info => {
          const value = info.getValue();
          const org = info.row.original.meta_client_geo_autonomous_system_organization;
          if (!value) return <span className="text-muted">-</span>;
          const displayText = org ? (org.length > 15 ? `${org.slice(0, 15)}…` : org) : `AS${value}`;
          return (
            <FilterableCell
              field="meta_client_geo_autonomous_system_number"
              value={value}
              displayValue={org || `AS${value}`}
              onFilterClick={onFilterClick}
              className="text-[10px]"
            >
              <span title={`AS${value}${org ? ` - ${org}` : ''}`}>{displayText}</span>
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
        <div className="flex shrink-0 items-center gap-2">
          {/* Live mode toggle */}
          {onLiveModeToggle && (
            <button
              type="button"
              onClick={onLiveModeToggle}
              className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm font-medium transition-all ${
                isLive
                  ? 'border-green-500/50 bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {isLive ? (
                <>
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  <PauseIcon className="size-4" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <PlayIcon className="size-4" />
                  <span>Go Live</span>
                </>
              )}
            </button>
          )}
          {/* Learn more button */}
          <button
            type="button"
            onClick={() => setLearnMoreOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/20"
          >
            <InformationCircleIcon className="size-4" />
            Learn more
          </button>
        </div>
      </div>

      {/* Live mode indicator bar */}
      {isLive && (
        <div className="mb-4 flex items-center rounded-sm border border-primary/30 bg-primary/10 px-4 py-2">
          <div className="flex items-center gap-3">
            <SignalIcon className="size-5 text-primary" />
            <div>
              <span className="text-sm font-medium text-primary">Live Mode Active</span>
              <span className="ml-2 text-xs text-muted">Showing a sample of recent probes</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Quick filters */}
      <div className="mb-3">
        <QuickFilters currentFilters={filters} onApplyPreset={onFiltersChange} onClearFilters={onClearFilters} />
      </div>

      {/* Filter panel */}
      <div className="mb-4">
        <FilterPanel filters={filters} onFiltersChange={onFiltersChange} onClearAll={onClearFilters} />
      </div>

      {/* Data table */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {isLive ? (
          // Live mode - simple table without pagination
          <DataTable
            data={data}
            columns={columns}
            isLoading={false}
            pageSize={50}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            emptyMessage="Waiting for live data..."
            manualPagination={false}
            manualFiltering={true}
            manualSorting={true}
            getRowId={getRowId}
            getRowClassName={getRowClassName}
            hideGlobalFilter={true}
            paginationPosition="top"
          />
        ) : (
          // Normal mode - server-side pagination
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
            manualPagination={true}
            manualFiltering={true}
            manualSorting={true}
            hasNextPage={hasNextPage}
            sorting={sorting}
            onSortingChange={onSortingChange}
            columnFilters={columnFilters}
            onColumnFiltersChange={onColumnFiltersChange}
            getRowId={getRowId}
            hideGlobalFilter={true}
            paginationPosition="top"
          />
        )}
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
