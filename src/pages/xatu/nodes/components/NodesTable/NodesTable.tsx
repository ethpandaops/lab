import { type JSX, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { DataTable } from '@/components/DataTable';
import { Input } from '@/components/Forms/Input';
import { Card } from '@/components/Layout/Card';
import type { DataTableColumn } from '@/components/DataTable/DataTable.types';
import { getCountryFlag, getRelativeTime } from '@/utils';
import type { NodeRow } from '../../hooks/useNodeRows';
import { formatMs, formatNodeLocation } from '../../utils/node-stats';
import { NodeStatus } from '../NodeStatus';
import { NodeClientVersion } from '@/pages/ethereum/clients/components/NodeClientVersion';

export interface NodesTableProps {
  rows: NodeRow[];
}

const columns: DataTableColumn<NodeRow>[] = [
  {
    id: 'node',
    header: 'Node',
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
    cell: ({ getValue }) => <span className="block max-w-32 truncate">{getValue() as string}</span>,
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
      <span className="flex items-center gap-1.5">
        <span>{getCountryFlag(row.original.node.meta_client_geo_country_code, '')}</span>
        <span className="max-w-40 truncate">{getValue() as string}</span>
      </span>
    ),
  },
  {
    id: 'block',
    header: () => <span className="whitespace-nowrap">Block p50</span>,
    accessorFn: row => row.observation?.blockP50 ?? undefined,
    sortUndefined: 'last',
    cell: ({ getValue }) => formatMs(getValue() as number | undefined),
    meta: { cellClassName: 'text-foreground' },
  },
  {
    id: 'attestation',
    header: () => <span className="whitespace-nowrap">Attestation p50</span>,
    accessorFn: row => row.observation?.attestationP50 ?? undefined,
    sortUndefined: 'last',
    cell: ({ getValue }) => formatMs(getValue() as number | undefined),
    meta: { cellClassName: 'text-foreground' },
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
 * Every node that reported in the range, searchable and sortable; rows open the node page.
 */
export function NodesTable({ rows }: NodesTableProps): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  return (
    <Card
      title="All nodes"
      actions={
        <div className="w-56">
          <Input size="sm">
            <Input.Leading>
              <MagnifyingGlassIcon />
            </Input.Leading>
            <Input.Field
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Search nodes"
              aria-label="Search nodes"
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
        emptyMessage="No nodes match"
      />
    </Card>
  );
}
