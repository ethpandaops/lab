import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import type { SortingState } from '@tanstack/react-table';
import type { FctPreparedBlock } from '@/api/types.gen';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable/DataTable.types';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { Slot } from '@/components/Ethereum/Slot';
import { Card } from '@/components/Layout/Card';
import { NodeClientVersion } from '@/pages/ethereum/clients/components/NodeClientVersion';
import { formatBytes } from '@/utils/number';
import { formatGasToMillions } from '@/utils/gas';
import { formatWeiAsEth } from '@/utils/epbs';
import type { BlockSortKey } from '../../IndexPage.types';
import { nodeIdOf } from '../../utils/block-query';
import { parseClientName } from '../../utils';

export interface PreparedBlocksTableProps {
  blocks: FctPreparedBlock[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFiltered: boolean;
  sort: BlockSortKey;
  order: 'asc' | 'desc';
  onSortChange: (sort: BlockSortKey | undefined, order: 'asc' | 'desc' | undefined) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}

const numeric = 'tabular-nums text-foreground';

/** Columns, the ids of the sortable ones their sort keys */
const columns: DataTableColumn<FctPreparedBlock>[] = [
  {
    id: 'slot' satisfies BlockSortKey,
    header: 'Slot',
    accessorFn: row => row.slot,
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
    id: 'node' satisfies BlockSortKey,
    header: 'Node',
    accessorFn: row => row.meta_client_name,
    cell: ({ row }) => {
      const nodeId = nodeIdOf(row.original.meta_client_name);
      return nodeId ? (
        <Link
          to="/xatu/nodes/$nodeId"
          params={{ nodeId }}
          className="block max-w-56 truncate font-mono text-xs/6 text-primary hover:underline"
          title={nodeId}
        >
          {nodeId}
        </Link>
      ) : (
        '-'
      );
    },
  },
  {
    id: 'cl',
    header: 'CL',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.meta_consensus_implementation ? (
        <NodeClientVersion
          client={row.original.meta_consensus_implementation}
          version={row.original.meta_consensus_version}
        />
      ) : (
        '-'
      ),
  },
  {
    id: 'el',
    header: 'EL',
    enableSorting: false,
    cell: ({ row }) => {
      const { executionClient } = parseClientName(row.original.meta_client_name);
      return executionClient ? <ClientLabel client={executionClient} /> : '-';
    },
  },
  {
    id: 'gas' satisfies BlockSortKey,
    header: 'Gas used',
    accessorFn: row => row.execution_payload_gas_used,
    cell: ({ row }) =>
      row.original.execution_payload_gas_used != null
        ? formatGasToMillions(row.original.execution_payload_gas_used)
        : '-',
    meta: { cellClassName: numeric },
  },
  {
    id: 'txs' satisfies BlockSortKey,
    header: 'Txs',
    accessorFn: row => row.execution_payload_transactions_count,
    cell: ({ row }) => row.original.execution_payload_transactions_count ?? '-',
    meta: { cellClassName: numeric },
  },
  {
    id: 'size' satisfies BlockSortKey,
    header: 'Size',
    accessorFn: row => row.block_total_bytes,
    cell: ({ row }) => (row.original.block_total_bytes != null ? formatBytes(row.original.block_total_bytes) : '-'),
    meta: { cellClassName: numeric },
  },
  {
    id: 'value',
    header: 'Value (ETH)',
    enableSorting: false,
    cell: ({ row }) => formatWeiAsEth(row.original.execution_payload_value ?? undefined) ?? '0',
    meta: { cellClassName: numeric },
  },
];

/**
 * Locally built blocks, one per node and slot, filtered, sorted and paged by the API.
 */
export function PreparedBlocksTable({
  blocks,
  isLoading,
  error,
  hasNextPage,
  isFiltered,
  sort,
  order,
  onSortChange,
  page,
  pageSize,
  onPageChange,
}: PreparedBlocksTableProps): JSX.Element {
  return (
    <Card rounded title="Blocks">
      {error ? (
        <p className="text-sm text-danger">Failed to load blocks: {error.message}</p>
      ) : (
        <DataTable
          data={blocks}
          columns={columns}
          isLoading={isLoading}
          getRowId={row => `${row.slot}-${row.meta_client_name}`}
          sorting={[{ id: sort, desc: order === 'desc' }] satisfies SortingState}
          onSortingChange={([first]) =>
            onSortChange(first?.id as BlockSortKey | undefined, first ? (first.desc ? 'desc' : 'asc') : undefined)
          }
          manualSorting
          pageIndex={page}
          pageSize={pageSize}
          onPaginationChange={onPageChange}
          manualPagination
          hasNextPage={hasNextPage}
          paginationPosition="bottom"
          emptyMessage={isFiltered ? 'No blocks match these filters.' : 'No blocks in this window.'}
          hideGlobalFilter
          hideColumnVisibility
        />
      )}
    </Card>
  );
}
