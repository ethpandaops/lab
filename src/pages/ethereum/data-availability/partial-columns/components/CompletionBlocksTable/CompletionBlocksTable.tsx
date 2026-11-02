import type { JSX } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable/DataTable.types';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { Card } from '@/components/Layout/Card';
import { Slot } from '@/components/Ethereum/Slot';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { PATH_COLORS, PATH_LABELS } from '../../constants';
import type { BlockFilters, BlockSortKey, CompletionPath } from '../../IndexPage.types';
import type { CompletionBlock } from '../../hooks';
import { formatSeconds, formatShare } from '../../utils/partial-columns';
import { BlockFilterPanel } from '../BlockFilterPanel';

export interface CompletionBlocksTableProps {
  blocks: CompletionBlock[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  filters: BlockFilters;
  onFiltersChange: (filters: BlockFilters) => void;
  sort: BlockSortKey;
  order: 'asc' | 'desc';
  onSortChange: (sort: BlockSortKey | undefined, order: 'asc' | 'desc' | undefined) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}

/** Completions of one block per path, in stacking order */
function blockPaths(block: CompletionBlock): Array<{ path: CompletionPath; count: number }> {
  return [
    { path: 'FULL_GOSSIP' as const, count: block.full_gossip_completion_count ?? 0 },
    { path: 'PARTIAL_GOSSIP' as const, count: block.partial_gossip_completion_count ?? 0 },
    { path: 'EL' as const, count: block.el_completion_count ?? 0 },
    { path: 'RECONSTRUCTION' as const, count: block.reconstruction_completion_count ?? 0 },
    { path: 'UNKNOWN' as const, count: block.unknown_completion_count ?? 0 },
  ].filter(entry => entry.count > 0);
}

/** Horizontal bar of a block's completions split by path */
function PathBar({ block }: { block: CompletionBlock }): JSX.Element {
  const total = block.completion_count ?? 0;
  const paths = blockPaths(block);
  const title = paths.map(entry => `${PATH_LABELS[entry.path]}: ${entry.count}`).join(', ');
  return (
    <span className="flex h-2 w-40 overflow-hidden rounded-full bg-border/50" title={title}>
      {total > 0 &&
        paths.map(entry => (
          <span
            key={entry.path}
            className="block h-full"
            style={{ width: `${(entry.count / total) * 100}%`, backgroundColor: PATH_COLORS[entry.path] }}
          />
        ))}
    </span>
  );
}

const value = 'tabular-nums text-foreground';
const muted = 'tabular-nums text-muted';

/** Columns, their ids the sort keys of the sortable ones */
const columns: DataTableColumn<CompletionBlock>[] = [
  {
    id: 'slot' satisfies BlockSortKey,
    accessorFn: row => row.slot,
    header: 'Slot',
    cell: ({ row }) => (row.original.slot !== undefined ? <Slot slot={row.original.slot} /> : '-'),
    meta: { cellClassName: 'font-medium text-foreground' },
  },
  {
    id: 'time',
    header: 'Time',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.slot_start_date_time ? (
        <Timestamp timestamp={row.original.slot_start_date_time} format="relative" className="text-xs text-muted" />
      ) : (
        '-'
      ),
  },
  {
    id: 'blob_count' satisfies BlockSortKey,
    accessorFn: row => row.blob_count,
    header: 'Blobs',
    cell: ({ row }) => row.original.blob_count ?? '-',
    meta: { cellClassName: muted },
  },
  {
    id: 'completion_count' satisfies BlockSortKey,
    accessorFn: row => row.completion_count,
    header: 'Completions',
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <PathBar block={row.original} />
        <span className="text-xs text-muted tabular-nums">{row.original.completion_count ?? 0}</span>
      </span>
    ),
  },
  {
    id: 'partial',
    header: 'Partial',
    enableSorting: false,
    cell: ({ row }) =>
      formatShare(row.original.partial_gossip_completion_count ?? 0, row.original.completion_count ?? 0),
    meta: { cellClassName: value },
  },
  {
    id: 'el_cells',
    header: 'EL cells',
    enableSorting: false,
    cell: ({ row }) => formatShare(row.original.cells_from_el ?? 0, row.original.cells_total ?? 0),
    meta: { cellClassName: value },
  },
  {
    id: 'p50' satisfies BlockSortKey,
    accessorFn: row => row.p50_completion_slot_start_diff,
    header: 'p50',
    cell: ({ row }) => formatSeconds(row.original.p50_completion_slot_start_diff),
    meta: { cellClassName: value },
  },
  {
    id: 'p90' satisfies BlockSortKey,
    accessorFn: row => row.p90_completion_slot_start_diff,
    header: 'p90',
    cell: ({ row }) => formatSeconds(row.original.p90_completion_slot_start_diff),
    meta: { cellClassName: muted },
  },
  {
    id: 'node_done' satisfies BlockSortKey,
    accessorFn: row => row.p50_node_last_completion_slot_start_diff,
    header: 'Node done',
    cell: ({ row }) => formatSeconds(row.original.p50_node_last_completion_slot_start_diff),
    meta: { cellClassName: value },
  },
  {
    id: 'last' satisfies BlockSortKey,
    accessorFn: row => row.max_completion_slot_start_diff,
    header: 'Last',
    cell: ({ row }) => formatSeconds(row.original.max_completion_slot_start_diff),
    meta: { cellClassName: muted },
  },
  {
    id: 'header',
    header: 'Header',
    enableSorting: false,
    cell: ({ row }) => formatSeconds(row.original.header?.seen_slot_start_diff),
    meta: { cellClassName: muted },
  },
];

/**
 * Blocks with how sentry nodes completed their columns, filtered, sorted and paged by the API.
 */
export function CompletionBlocksTable({
  blocks,
  isLoading,
  error,
  hasNextPage,
  filters,
  onFiltersChange,
  sort,
  order,
  onSortChange,
  page,
  pageSize,
  onPageChange,
}: CompletionBlocksTableProps): JSX.Element {
  const sorting: SortingState = [{ id: sort, desc: order === 'desc' }];
  const handleSorting = (next: SortingState): void => {
    const [first] = next;
    onSortChange(first?.id as BlockSortKey | undefined, first ? (first.desc ? 'desc' : 'asc') : undefined);
  };

  return (
    <Card
      rounded
      title="Blocks"
      subtitle="Column completions across all sentry nodes by path, with completion times from slot start."
    >
      <InfoBox summary="How this is measured" className="mb-4">
        Node done is when the median node completed its last column, last is the latest completion by any node, and
        header is when a node first received the partial column header.
      </InfoBox>
      <div className="mb-4">
        <BlockFilterPanel filters={filters} onChange={onFiltersChange} />
      </div>
      {error ? (
        <p className="text-sm text-danger">Failed to load blocks: {error.message}</p>
      ) : (
        <DataTable
          data={blocks}
          columns={columns}
          isLoading={isLoading}
          getRowId={row => `${row.slot}-${row.block_root}`}
          sorting={sorting}
          onSortingChange={handleSorting}
          manualSorting
          pageIndex={page}
          pageSize={pageSize}
          onPaginationChange={onPageChange}
          manualPagination
          hasNextPage={hasNextPage}
          paginationPosition="bottom"
          emptyMessage={
            Object.values(filters).some(v => v !== undefined)
              ? 'No blocks match these filters.'
              : 'No blocks with column completions in this window.'
          }
          hideGlobalFilter
          hideColumnVisibility
        />
      )}
    </Card>
  );
}
