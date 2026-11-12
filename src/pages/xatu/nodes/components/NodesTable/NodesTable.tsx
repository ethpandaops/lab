import { type JSX, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { DataTable } from '@/components/DataTable';
import { Input } from '@/components/Forms/Input';
import { Card } from '@/components/Layout/Card';
import type { DataTableColumn } from '@/components/DataTable/DataTable.types';
import { getRelativeTime } from '@/utils';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import type { NodeRow } from '@/pages/xatu/nodes/hooks/useNodeRows';
import { formatNodeLocation } from '@/pages/xatu/nodes/utils/node-stats';
import { NodeStatus } from '@/pages/xatu/nodes/components/NodeStatus';
import { NodeClientVersion } from '@/pages/ethereum/clients/components/NodeClientVersion';

export interface NodesTableProps {
  rows: NodeRow[];
}

const columns: DataTableColumn<NodeRow>[] = [
  {
    id: 'node',
    header: 'Node ID',
    accessorFn: row => row.nodeId,
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <NodeStatus online={row.original.online} />
        <span className="max-w-40 truncate font-mono" title={row.original.nodeId}>
          {row.original.nodeId}
        </span>
      </span>
    ),
    meta: { cellClassName: 'text-foreground' },
  },
  {
    id: 'contributor',
    header: 'Contributor',
    accessorFn: row => row.node.username ?? '',
    cell: ({ getValue }) => {
      const username = getValue() as string;
      if (!username) return '–';
      return (
        <Link
          from="/xatu/nodes/"
          to="/xatu/nodes"
          search={prev => ({ ...prev, contributor: username })}
          resetScroll={false}
          onClick={event => event.stopPropagation()}
          className="block max-w-32 truncate text-primary hover:underline"
        >
          {username}
        </Link>
      );
    },
  },
  {
    id: 'client',
    header: 'Client',
    accessorFn: row => row.node.meta_consensus_implementation ?? '',
    cell: ({ row }) => {
      const client = row.original.node.meta_consensus_implementation;
      if (!client) return '–';
      return <NodeClientVersion client={client} version={row.original.node.meta_consensus_version} showNewer />;
    },
    meta: { cellClassName: 'text-foreground' },
  },
  {
    id: 'location',
    header: 'Location',
    accessorFn: row => formatNodeLocation(row.node),
    cell: ({ row, getValue }) => (
      <span className="flex min-w-0 items-center gap-1.5">
        <CountryFlag code={row.original.node.meta_client_geo_country_code} />
        <span className="max-w-40 min-w-0 truncate sm:max-w-none" title={getValue() as string}>
          {getValue() as string}
        </span>
      </span>
    ),
    // From sm up the column takes the table's spare width without widening the table; narrower, the text keeps its cap
    meta: { cellClassName: 'text-muted sm:w-full sm:max-w-0 sm:min-w-52' },
  },
  {
    id: 'lastSeen',
    header: () => <span className="whitespace-nowrap">Last seen</span>,
    accessorFn: row => row.node.last_seen_date_time ?? undefined,
    sortUndefined: 'last',
    cell: ({ getValue }) => {
      const seconds = getValue() as number | undefined;
      return seconds === undefined ? '–' : getRelativeTime(seconds);
    },
    enableGlobalFilter: false,
  },
];

/**
 * Every node ID that reported in the range, searchable and sortable; rows open the node page.
 */
export function NodesTable({ rows }: NodesTableProps): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  return (
    <Card
      title="Node IDs"
      actions={
        <div className="w-56">
          <Input size="sm">
            <Input.Leading>
              <MagnifyingGlassIcon />
            </Input.Leading>
            <Input.Field
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Search"
              aria-label="Search node IDs"
            />
          </Input>
        </div>
      }
    >
      <DataTable
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        hideGlobalFilter
        data={rows}
        columns={columns}
        density="comfortable"
        pageSize={25}
        getRowId={row => row.nodeId}
        onRowClick={row => navigate({ to: '/xatu/nodes/$nodeId', params: { nodeId: row.nodeId } })}
        hideColumnVisibility
        emptyMessage="No node IDs match"
      />
    </Card>
  );
}
