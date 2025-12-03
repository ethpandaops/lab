import { type JSX, useState, useMemo, useCallback } from 'react';
import {
  createColumnHelper,
  type VisibilityState,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataTable } from '@/components/DataTable';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import { Badge } from '@/components/Elements/Badge';
import { Button } from '@/components/Elements/Button';
import { Dialog } from '@/components/Overlays/Dialog';
import { Alert } from '@/components/Feedback/Alert';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import type { IntCustodyProbe } from '@/api/types.gen';
import { ProbeFlow } from './ProbeFlow';
import { FilterPanel, type FilterValues } from './FilterPanel';
import { PeerIdAvatar } from './PeerIdAvatar';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
  ServerIcon,
  CpuChipIcon,
  EyeIcon,
  ListBulletIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  LinkIcon,
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

/**
 * Copyable Badge Component - also supports drill-down filtering
 */
function CopyableBadge({
  value,
  label,
  className,
  onDrillDown,
}: {
  value: string | number;
  label?: string;
  className?: string;
  onDrillDown?: () => void;
}): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onDrillDown) {
      onDrillDown();
    }
  };

  return (
    <span className={`group relative inline-flex items-center gap-0.5 ${className}`}>
      <button
        type="button"
        onClick={onDrillDown ? handleClick : handleCopy}
        className={`inline-flex cursor-pointer items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[10px] transition-all ${
          copied
            ? 'border-green-500/30 bg-green-500/10 text-green-500'
            : onDrillDown
              ? 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary'
              : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/10'
        }`}
        title={onDrillDown ? `Filter by ${label || value}` : `Copy ${label || value}`}
      >
        {copied ? <CheckIcon className="mr-1 size-3" /> : null}
        {value}
      </button>
      {onDrillDown && (
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex cursor-pointer items-center justify-center rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-muted/50"
          title={`Copy ${label || value}`}
        >
          <ClipboardDocumentIcon className="size-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Clickable attribute cell for drill-down filtering in detail popup
 */
function DrillDownCell({
  field,
  value,
  displayValue,
  onFilterClick,
  onClose,
  children,
  mono = false,
}: {
  field: string;
  value: string | number | undefined | null;
  displayValue?: string;
  onFilterClick?: (field: string, value: string | number) => void;
  onClose?: () => void;
  children?: React.ReactNode;
  mono?: boolean;
}): JSX.Element {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted">-</span>;
  }

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onFilterClick) {
      onFilterClick(field, value);
      onClose?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cursor-pointer text-left transition-colors hover:text-primary hover:underline ${mono ? 'font-mono text-[10px]' : ''}`}
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
  // Link copy state
  const [linkCopied, setLinkCopied] = useState(false);

  // Dialog is open when a probe is selected
  const isDetailDialogOpen = selectedProbe !== null;

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
    setLinkCopied(false);
  }, [onProbeSelect]);

  // Copy link to clipboard
  const handleCopyLink = useCallback((): void => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, []);

  // Define table columns - ordered by default visibility preference:
  // Time, Result, Prober, Prober Country, Peer Client, Peer Country, PeerID, Slots, Columns, Error
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

          const icon = isSuccess ? (
            <CheckCircleIcon className="size-5 text-green-500" />
          ) : isFailure ? (
            <XCircleIcon className="size-5 text-red-500" />
          ) : (
            <QuestionMarkCircleIcon className="size-5 text-yellow-500" />
          );

          return (
            <FilterableCell field="result" value={result} onFilterClick={onFilterClick}>
              <div
                className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 ${
                  isSuccess
                    ? 'bg-green-500/10 text-green-500'
                    : isFailure
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-yellow-500/10 text-yellow-500'
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

      // Latency - right after Result
      columnHelper.accessor('response_time_ms', {
        header: 'Latency',
        cell: info => {
          const ms = info.getValue();
          if (!ms) return <span className="text-muted">-</span>;
          let color = 'text-green-500';
          if (ms > 500) color = 'text-yellow-500';
          if (ms > 1000) color = 'text-red-500';
          return <span className={`font-mono text-xs ${color}`}>{ms}ms</span>;
        },
        enableSorting: true,
        meta: { enableHiding: true },
      }),

      // Error - next to Result/Latency
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

      // Slot - show single slot value
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
          description="The ethPandaOps team runs probes into the network using Dasmon (https://github.com/ethp2p/dasmon) to monitor data availabililty. Probes are run on a regular basis to ensure the network is healthy and that the data is available."
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
      <div className="mb-6">
        <Header
          title="Custody Probes"
          description="Probes made by the ethPandaOps team into the network using Dasmon (https://github.com/ethp2p/dasmon) to monitor data availability sampling across PeerDAS."
        />
      </div>

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

      {/* Detail dialog */}
      <Dialog
        open={isDetailDialogOpen}
        onClose={handleCloseDialog}
        title={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ServerIcon className="size-5 text-primary" />
              <span>Probe Details</span>
              {selectedProbe && (
                <div className="ml-2 flex items-center gap-2">
                  <Badge
                    variant="flat"
                    color={
                      selectedProbe.result === 'success'
                        ? 'green'
                        : selectedProbe.result === 'failure'
                          ? 'red'
                          : 'yellow'
                    }
                    className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                  >
                    {selectedProbe.result}
                  </Badge>
                  <span className="text-muted-foreground font-mono text-xs">{selectedProbe.response_time_ms}ms</span>
                </div>
              )}
              {/* Copy Link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className={`ml-auto flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-all ${
                  linkCopied
                    ? 'border-green-500/30 bg-green-500/10 text-green-500'
                    : 'border-border bg-background text-muted hover:border-primary/30 hover:bg-primary/10 hover:text-primary'
                }`}
                title="Copy link to this probe"
              >
                {linkCopied ? <CheckIcon className="size-3.5" /> : <LinkIcon className="size-3.5" />}
                <span>{linkCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            {selectedProbe && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
                <ClockIcon className="size-3" />
                <Timestamp
                  timestamp={selectedProbe.probe_date_time ?? 0}
                  format="long"
                  disableModal
                  className="!text-muted-foreground !p-0"
                />
              </div>
            )}
          </div>
        }
        description="Complete information about this custody probe attempt"
        size="xl"
      >
        {selectedProbe && (
          <div className="space-y-4">
            {/* Visual Flow */}
            <ProbeFlow probe={selectedProbe} />

            {/* Client Details Table */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
                <CpuChipIcon className="size-4 text-primary" />
                Client Details
                <span className="text-[10px] font-normal text-muted normal-case">(click any value to filter)</span>
              </h4>

              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground bg-muted/50 font-medium uppercase">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Attribute</th>
                      <th className="px-3 py-1.5 text-left">Prober</th>
                      <th className="px-3 py-1.5 text-left">Peer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-card/30">
                      <td className="text-muted-foreground px-3 py-1.5 font-medium">Client</td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_client_implementation"
                          value={selectedProbe.meta_client_implementation}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                        >
                          <div className="flex items-center gap-1.5">
                            <ClientLogo client={selectedProbe.meta_client_implementation || 'Unknown'} size={16} />
                            <span className="font-medium">{selectedProbe.meta_client_implementation || '-'}</span>
                          </div>
                        </DrillDownCell>
                      </td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_peer_implementation"
                          value={selectedProbe.meta_peer_implementation}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                        >
                          <div className="flex items-center gap-1.5">
                            <ClientLogo client={selectedProbe.meta_peer_implementation || 'Unknown'} size={16} />
                            <span className="font-medium">{selectedProbe.meta_peer_implementation || '-'}</span>
                          </div>
                        </DrillDownCell>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground px-3 py-1.5 font-medium">Node ID</td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="node_id"
                          value={selectedProbe.node_id}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                          mono
                        />
                      </td>
                      <td className="px-3 py-1.5 text-muted">-</td>
                    </tr>
                    <tr className="bg-card/30">
                      <td className="text-muted-foreground px-3 py-1.5 font-medium">Version</td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_client_version"
                          value={selectedProbe.meta_client_version}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                          mono
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_peer_version"
                          value={selectedProbe.meta_peer_version}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                          mono
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground px-3 py-1.5 font-medium">Country</td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_client_geo_country"
                          value={selectedProbe.meta_client_geo_country}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{getCountryFlag(selectedProbe.meta_client_geo_country_code)}</span>
                            <span>{selectedProbe.meta_client_geo_country || '-'}</span>
                          </div>
                        </DrillDownCell>
                      </td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_peer_geo_country"
                          value={selectedProbe.meta_peer_geo_country}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{getCountryFlag(selectedProbe.meta_peer_geo_country_code)}</span>
                            <span>{selectedProbe.meta_peer_geo_country || '-'}</span>
                          </div>
                        </DrillDownCell>
                      </td>
                    </tr>
                    <tr className="bg-card/30">
                      <td className="text-muted-foreground px-3 py-1.5 font-medium">City</td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_client_geo_city"
                          value={selectedProbe.meta_client_geo_city}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_peer_geo_city"
                          value={selectedProbe.meta_peer_geo_city}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground px-3 py-1.5 font-medium">ASN</td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_client_geo_autonomous_system_number"
                          value={selectedProbe.meta_client_geo_autonomous_system_number}
                          displayValue={
                            selectedProbe.meta_client_geo_autonomous_system_number
                              ? `AS${selectedProbe.meta_client_geo_autonomous_system_number}`
                              : undefined
                          }
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                          mono
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="meta_peer_geo_autonomous_system_number"
                          value={selectedProbe.meta_peer_geo_autonomous_system_number}
                          displayValue={
                            selectedProbe.meta_peer_geo_autonomous_system_number
                              ? `AS${selectedProbe.meta_peer_geo_autonomous_system_number}`
                              : undefined
                          }
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                          mono
                        />
                      </td>
                    </tr>
                    <tr className="bg-card/30">
                      <td className="text-muted-foreground px-3 py-1.5 font-medium">Peer ID</td>
                      <td className="px-3 py-1.5 text-muted">-</td>
                      <td className="px-3 py-1.5">
                        <DrillDownCell
                          field="peer_id_unique_key"
                          value={selectedProbe.peer_id_unique_key}
                          onFilterClick={onFilterClick}
                          onClose={handleCloseDialog}
                          mono
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Request Details */}
            <div className="border-t border-border pt-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
                <ListBulletIcon className="size-4 text-primary" />
                Request Details
                <span className="text-[10px] font-normal text-muted normal-case">(click any value to filter)</span>
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-muted-foreground mb-1 flex justify-between text-[10px] font-medium tracking-wider uppercase">
                    <span>Slot</span>
                  </dt>
                  <div className="rounded border border-border/50 bg-muted/30 p-1.5">
                    {selectedProbe.slot !== undefined && selectedProbe.slot !== null ? (
                      <CopyableBadge
                        value={selectedProbe.slot}
                        label="Slot"
                        onDrillDown={() => {
                          if (onFilterClick && selectedProbe.slot !== undefined) {
                            onFilterClick('slot', selectedProbe.slot);
                            handleCloseDialog();
                          }
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground text-[10px] italic">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 flex justify-between text-[10px] font-medium tracking-wider uppercase">
                    <span>Columns</span>
                    <span className="text-foreground">{selectedProbe.column_indices?.length || 0}</span>
                  </dt>
                  <div className="max-h-24 overflow-y-auto rounded border border-border/50 bg-muted/30 p-1.5">
                    <div className="flex flex-wrap gap-1">
                      {selectedProbe.column_indices?.map(col => (
                        <CopyableBadge
                          key={col}
                          value={col}
                          label="Column"
                          onDrillDown={() => {
                            if (onFilterClick) {
                              onFilterClick('column', col);
                              handleCloseDialog();
                            }
                          }}
                        />
                      )) || <span className="text-muted-foreground text-[10px] italic">None</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Section */}
              {selectedProbe.error && (
                <div className="mt-4">
                  <dt className="text-[10px] font-bold tracking-wider text-red-400 uppercase">Error</dt>
                  <dd className="mt-1 rounded border border-red-500/20 bg-red-500/5 p-2 font-mono text-[10px] text-red-300">
                    {selectedProbe.error}
                  </dd>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </Container>
  );
}
