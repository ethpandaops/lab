import { type JSX, useMemo, type RefObject } from 'react';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataTable } from '@/components/DataTable';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Button } from '@/components/Elements/Button';
import { Alert } from '@/components/Feedback/Alert';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { IntEngineNewPayload } from '@/api/types.gen';
import { FilterPanel } from '../FilterPanel';
import { QuickFilters } from '../QuickFilters';
import type { FilterValues } from '../../IndexPage.types';
import { DEFAULT_DURATION_MIN } from '../../IndexPage.types';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  PlayIcon,
  PauseIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { formatSlot } from '@/utils';

type SlowBlock = IntEngineNewPayload;

const columnHelper = createColumnHelper<SlowBlock>();

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
  const isError = status === 'INVALID' || status === 'ERROR' || status === 'INVALID_BLOCK_HASH';
  const isSyncing = status === 'SYNCING' || status === 'ACCEPTED';

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

export type SlowBlocksViewProps = {
  data: SlowBlock[];
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
  selectedBlock: SlowBlock | null;
  onBlockSelect: (block: SlowBlock | null) => void;
  // Duration threshold for display
  durationThreshold: number;
  // Live mode props
  isLive?: boolean;
  onLiveModeToggle?: () => void;
  newItemIdsRef?: RefObject<Set<string>>;
  liveHitPageLimitRef?: RefObject<boolean>;
};

export function SlowBlocksView({
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
  isLive = false,
  onLiveModeToggle,
  newItemIdsRef,
}: SlowBlocksViewProps): JSX.Element {
  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('slot', {
        header: 'Slot',
        cell: info => {
          const slot = info.getValue();
          if (!slot) return <span className="text-muted">-</span>;
          return (
            <Link
              to="/ethereum/slots/$slot"
              params={{ slot: String(slot) }}
              className="font-mono text-primary hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {formatSlot(slot)}
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
          return (
            <FilterableCell field="meta_execution_implementation" value={client} onFilterClick={onFilterClick}>
              <span className="inline-flex items-center gap-1.5">
                <ClientLogo client={client} size={16} />
                <span className="text-xs">{client}</span>
              </span>
            </FilterableCell>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => <StatusBadge status={info.getValue()} onFilterClick={onFilterClick} />,
      }),
      columnHelper.accessor('block_status', {
        header: 'Block Status',
        cell: info => {
          const status = info.getValue();
          if (!status) return <span className="text-muted">-</span>;
          const isOrphaned = status === 'orphaned';
          return (
            <FilterableCell
              field="block_status"
              value={status}
              onFilterClick={onFilterClick}
              className={clsx(isOrphaned && 'text-yellow-500')}
            >
              {status}
            </FilterableCell>
          );
        },
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
    ],
    [onFilterClick]
  );

  // Get row ID for live mode highlighting
  const getRowId = (row: SlowBlock): string => {
    return `${row.slot_start_date_time}:${row.slot}:${row.meta_client_name}`;
  };

  // Check if row is newly added (for live mode animation)
  const isRowNew = (row: SlowBlock): boolean => {
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
      <Header
        title="Slow Blocks"
        description={`Individual engine_newPayload observations showing blocks taking ${durationThreshold}ms+ to validate`}
      />

      {/* Live mode toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <QuickFilters currentFilters={filters} onApplyPreset={handleApplyPreset} onClearFilters={onClearFilters} />
        </div>

        <div className="flex items-center gap-3">
          {onLiveModeToggle && (
            <Button variant={isLive ? 'primary' : 'soft'} size="sm" onClick={onLiveModeToggle} className="gap-1.5">
              {isLive ? (
                <>
                  <PauseIcon className="size-4" />
                  <span>Pause</span>
                  <SignalIcon className="size-4 animate-pulse text-green-400" />
                </>
              ) : (
                <>
                  <PlayIcon className="size-4" />
                  <span>Live</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

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
            ? `No blocks found with duration >= ${filters.durationMin}ms in the selected time range`
            : `No slow blocks found (duration >= ${durationThreshold}ms) in the selected time range`
        }
        getRowClassName={(row, _rowId) =>
          clsx('cursor-pointer transition-colors hover:bg-surface/50', isRowNew(row) && 'animate-pulse bg-green-500/10')
        }
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
    </Container>
  );
}
