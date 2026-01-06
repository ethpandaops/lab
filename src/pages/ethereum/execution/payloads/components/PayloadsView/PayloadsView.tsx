import { type JSX, useMemo, useState, useCallback, type RefObject } from 'react';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataTable } from '@/components/DataTable';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { EIP7870SpecsBanner } from '@/components/Ethereum/EIP7870SpecsBanner';
import { ClusterSpecsModal } from '@/components/Ethereum/ClusterSpecsModal';
import { extractClusterFromNodeName, CLUSTER_COLORS } from '@/constants/eip7870';
import { TracoorIcon } from '@/components/Ethereum/TracoorIcon';
import { Alert } from '@/components/Feedback/Alert';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { IntEngineNewPayload } from '@/api/types.gen';
import { FilterPanel } from '../FilterPanel';
import { QuickFilters } from '../QuickFilters';
import { ReferenceNodesInfoDialog } from '../../../timings/components/ReferenceNodesInfoDialog';
import type { FilterValues } from '../../IndexPage.types';
import { DEFAULT_DURATION_MIN } from '../../IndexPage.types';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  SignalIcon,
  InformationCircleIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

type Payload = IntEngineNewPayload;

const columnHelper = createColumnHelper<Payload>();

/**
 * Truncate a hash for display
 */
function truncateHash(hash?: string, length = 10): string {
  if (!hash) return '-';
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
}

/**
 * Get duration color class based on threshold
 */
function getDurationColorClass(durationMs?: number): string {
  if (durationMs === undefined) return 'text-muted';
  if (durationMs < 500) return 'text-green-500';
  if (durationMs < 1000) return 'text-yellow-500';
  if (durationMs < 2000) return 'text-orange-500';
  return 'text-red-500';
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
 * Status badge component
 */
function StatusBadge({
  status,
  onFilterClick,
}: {
  status?: string;
  onFilterClick?: (field: string, value: string) => void;
}): JSX.Element {
  if (!status) return <span className="text-muted">-</span>;

  const isSuccess = status === 'VALID';
  const isError = status === 'INVALID' || status === 'ERROR';
  const isSyncing = status === 'SYNCING';

  const icon = isSuccess ? (
    <CheckCircleIcon className="size-4 text-green-500" />
  ) : isError ? (
    <XCircleIcon className="size-4 text-red-500" />
  ) : isSyncing ? (
    <QuestionMarkCircleIcon className="size-4 text-yellow-500" />
  ) : (
    <QuestionMarkCircleIcon className="size-4 text-muted" />
  );

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onFilterClick) {
      onFilterClick('status', status);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:opacity-80"
      title={`Filter by ${status}`}
    >
      {icon}
      <span className="text-xs">{status}</span>
    </button>
  );
}

export type PayloadsViewProps = {
  data: Payload[];
  isLoading: boolean;
  error?: Error | null;
  pagination: {
    pageIndex: number;
    pageSize: number;
    onPaginationChange: (pageIndex: number, pageSize: number) => void;
  };
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  onFilterClick?: (field: string, value: string | number) => void;
  hasNextPage?: boolean;
  // Filter panel props
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
  // Selected block for details
  selectedBlock: Payload | null;
  onBlockSelect: (block: Payload | null) => void;
  // Duration threshold for display
  durationThreshold: number;
  // External links
  tracoorUrl?: string;
  // Live mode props
  isLive?: boolean;
  onLiveModeToggle?: () => void;
  newItemIdsRef?: RefObject<Set<string>>;
  liveHitPageLimitRef?: RefObject<boolean>;
};

export function PayloadsView({
  data,
  isLoading,
  error,
  pagination,
  sorting,
  onSortingChange,
  onFilterClick,
  hasNextPage,
  filters,
  onFiltersChange,
  onClearFilters,
  durationThreshold,
  tracoorUrl,
  isLive = false,
  onLiveModeToggle,
  newItemIdsRef,
}: PayloadsViewProps): JSX.Element {
  // Learn more dialog state
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  // Cluster specs modal state
  const [clusterSpecsOpen, setClusterSpecsOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const handleClusterClick = useCallback((clusterName: string): void => {
    setSelectedCluster(clusterName);
    setClusterSpecsOpen(true);
  }, []);

  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('block_number', {
        header: 'Block',
        cell: info => {
          const blockNumber = info.getValue();
          const slot = info.row.original.slot;
          if (!blockNumber) return <span className="text-muted">-</span>;
          return (
            <Link
              to="/ethereum/slots/$slot"
              params={{ slot: String(slot) }}
              search={{ tab: 'execution' }}
              className="font-mono text-primary hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {blockNumber}
            </Link>
          );
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('duration_ms', {
        header: 'Duration',
        cell: info => {
          const duration = info.getValue();
          return (
            <span className={clsx('font-mono font-medium', getDurationColorClass(duration))}>
              {duration !== undefined ? `${duration.toLocaleString()}ms` : '-'}
            </span>
          );
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('meta_execution_implementation', {
        header: 'EL Client',
        cell: info => {
          const client = info.getValue();
          if (!client) return <span className="text-muted">-</span>;
          const clientLower = client.toLowerCase();
          const version = info.row.original.meta_execution_version;
          return (
            <FilterableCell field="meta_execution_implementation" value={client} onFilterClick={onFilterClick}>
              <span className="inline-flex items-center gap-1.5">
                <ClientLogo client={clientLower} size={16} />
                <span className="text-xs">
                  {clientLower}
                  {version && <span className="text-muted"> ({version})</span>}
                </span>
              </span>
            </FilterableCell>
          );
        },
      }),
      columnHelper.accessor('meta_client_name', {
        header: 'Node',
        cell: info => {
          const nodeName = info.getValue();
          if (!nodeName) return <span className="text-muted">-</span>;
          // Transform prefixes to shorter format (utility-mainnet- → utility/)
          const shortName = nodeName
            .replace(/^ethpandaops\/mainnet\//, '')
            .replace(/^ethpandaops\//, '')
            .replace(/^utility-mainnet-/, 'utility/')
            .replace(/^sigma-mainnet-/, 'sigma/');
          // Truncate long node names
          const displayName = shortName.length > 35 ? `${shortName.slice(0, 35)}...` : shortName;
          // Extract cluster for EIP-7870 reference nodes
          const clusterName = extractClusterFromNodeName(nodeName);
          const clusterColor = clusterName ? CLUSTER_COLORS[clusterName] : null;
          return (
            <span className="flex items-center gap-1.5 text-xs text-muted" title={nodeName}>
              {clusterColor && clusterName && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleClusterClick(clusterName);
                  }}
                  className="cursor-pointer transition-opacity hover:opacity-70"
                  title={`View ${clusterName} cluster specs`}
                >
                  <ServerIcon className={`size-3.5 shrink-0 ${clusterColor}`} />
                </button>
              )}
              {displayName}
            </span>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => <StatusBadge status={info.getValue()} onFilterClick={onFilterClick} />,
      }),
      columnHelper.accessor('gas_used', {
        header: 'Gas Used',
        cell: info => {
          const gas = info.getValue();
          return <span className="font-mono text-xs">{gas !== undefined ? gas.toLocaleString() : '-'}</span>;
        },
      }),
      columnHelper.accessor('tx_count', {
        header: 'Txs',
        cell: info => {
          const count = info.getValue();
          return <span className="font-mono text-xs">{count ?? '-'}</span>;
        },
      }),
      columnHelper.accessor('block_hash', {
        header: 'Block Hash',
        cell: info => {
          const hash = info.getValue();
          return <span className="font-mono text-xs text-muted">{truncateHash(hash)}</span>;
        },
      }),
      columnHelper.accessor('slot_start_date_time', {
        header: 'Time',
        cell: info => {
          const timestamp = info.getValue();
          if (!timestamp) return <span className="text-muted">-</span>;
          return <Timestamp timestamp={timestamp} format="relative" className="text-xs text-muted" />;
        },
        sortingFn: 'basic',
      }),
      // Tracoor external link column (only shown if tracoorUrl is available)
      ...(tracoorUrl
        ? [
            columnHelper.display({
              id: 'tracoor',
              header: '',
              cell: info => {
                const blockNumber = info.row.original.block_number;
                if (blockNumber === undefined) return null;
                const url = `${tracoorUrl}/execution_block_trace?executionBlockTraceBlockNumber=${blockNumber}`;
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center transition-opacity hover:opacity-70"
                    title="View in Tracoor"
                  >
                    <TracoorIcon className="size-4" />
                  </a>
                );
              },
              enableSorting: false,
            }),
          ]
        : []),
    ],
    [onFilterClick, tracoorUrl, handleClusterClick]
  );

  // Get row ID for live mode highlighting
  const getRowId = (row: Payload): string => {
    return `${row.slot_start_date_time}:${row.slot}:${row.meta_client_name}`;
  };

  // Check if row is newly added (for live mode animation)
  const isRowNew = (row: Payload): boolean => {
    if (!newItemIdsRef?.current) return false;
    return newItemIdsRef.current.has(getRowId(row));
  };

  // Handle apply preset from QuickFilters
  const handleApplyPreset = (presetFilters: Partial<FilterValues>): void => {
    onFiltersChange({
      ...filters,
      ...presetFilters,
    });
  };

  return (
    <Container>
      {/* Header with Learn more button */}
      <div className="flex items-start justify-between gap-4">
        <Header
          title="Payloads"
          description={`Individual engine_newPayload observations taking ${durationThreshold}ms+ to validate`}
          className="mb-0"
        />
        <button
          type="button"
          onClick={() => setLearnMoreOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/20"
        >
          <InformationCircleIcon className="size-4" />
          Learn more
        </button>
      </div>

      {/* Hardware specs banner */}
      <EIP7870SpecsBanner className="mb-4" />

      {/* Unified toolbar: Live toggle + Quick filters + Reference */}
      <div className="mb-4">
        <QuickFilters
          currentFilters={filters}
          onApplyPreset={handleApplyPreset}
          onClearFilters={onClearFilters}
          isLive={isLive}
          onLiveModeToggle={onLiveModeToggle}
        />
      </div>

      {/* Live mode indicator bar */}
      {isLive && (
        <div className="mb-4 flex items-center rounded-sm border border-green-500/30 bg-green-500/10 px-4 py-2">
          <div className="flex items-center gap-3">
            <SignalIcon className="size-5 text-green-500" />
            <div>
              <span className="text-sm font-medium text-green-500">Live Mode Active</span>
              <span className="ml-2 text-xs text-muted">Showing latest observations in real-time</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter panel */}
      <div className="mb-4">
        <FilterPanel filters={filters} onFiltersChange={onFiltersChange} onClearAll={onClearFilters} />
      </div>

      {/* Error state */}
      {error && <Alert variant="error" title="Error loading data" description={error.message} className="mb-4" />}

      {/* Data table */}
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPaginationChange={pagination.onPaginationChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        hasNextPage={hasNextPage}
        manualPagination
        manualSorting
        emptyMessage={
          filters.durationMin && filters.durationMin > DEFAULT_DURATION_MIN
            ? `No payloads found with duration >= ${filters.durationMin}ms`
            : `No payloads found (duration >= ${durationThreshold}ms)`
        }
        getRowClassName={(row, _rowId) => {
          const isReferenceNode = row.node_class === 'eip7870-block-builder';
          const showReferenceHighlight = !filters.referenceNodes && isReferenceNode;
          return clsx(
            'cursor-pointer transition-colors hover:bg-surface/50',
            isRowNew(row) && 'animate-pulse bg-green-500/10',
            showReferenceHighlight && 'bg-primary/5 border-l-2 border-l-primary'
          );
        }}
        hideGlobalFilter
        hideColumnVisibility
        paginationPosition={isLive ? undefined : 'bottom'}
      />

      {/* Live mode info */}
      {isLive && data.length > 0 && (
        <div className="mt-2 text-center text-xs text-muted">
          Showing latest {data.length} observations (max 50) • New items animate in
        </div>
      )}

      {/* Reference Nodes Info Dialog */}
      <ReferenceNodesInfoDialog open={learnMoreOpen} onClose={() => setLearnMoreOpen(false)} />

      {/* Cluster Specs Modal */}
      <ClusterSpecsModal
        open={clusterSpecsOpen}
        onClose={() => setClusterSpecsOpen(false)}
        clusterName={selectedCluster}
      />
    </Container>
  );
}
