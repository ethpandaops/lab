import type { JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ExclamationTriangleIcon } from '@heroicons/react/16/solid';
import { DataTable } from '@/components/DataTable';
import { Card } from '@/components/Layout/Card';
import type { DataTableColumn } from '@/components/DataTable/DataTable.types';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getCountryFlag, getRelativeTime } from '@/utils';
import { formatClientName } from '@/utils/graffiti';
import type { NodeRow } from '../../hooks/useNodeRows';
import { formatMs, formatNodeLocation, shortVersion } from '../../utils/node-stats';
import { NodeStatus } from '../NodeStatus';

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
        <span className="max-w-44 truncate font-mono text-foreground" title={row.original.nodeId}>
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
    cell: ({ getValue }) => <span className="block max-w-28 truncate">{getValue() as string}</span>,
  },
  {
    id: 'client',
    header: 'Client',
    accessorFn: row => row.node.meta_consensus_implementation ?? '',
    cell: ({ row }) => {
      const client = row.original.node.meta_consensus_implementation;
      if (!client) return '–';
      return (
        <span className="flex items-center gap-2">
          <ClientLogo client={client} size={16} />
          <span className="text-foreground">{formatClientName(client)}</span>
          <span title={row.original.node.meta_consensus_version}>
            {shortVersion(row.original.node.meta_consensus_version)}
          </span>
        </span>
      );
    },
  },
  {
    id: 'location',
    header: 'Location',
    accessorFn: row => formatNodeLocation(row.node),
    cell: ({ row, getValue }) => (
      <span className="flex items-center gap-1.5">
        <span>{getCountryFlag(row.original.node.meta_client_geo_country_code, '')}</span>
        <span className="max-w-32 truncate">{getValue() as string}</span>
      </span>
    ),
  },
  {
    id: 'asn',
    header: 'ASN',
    accessorFn: row => row.node.meta_client_geo_autonomous_system_organization ?? '',
    cell: ({ getValue }) => <span className="block max-w-28 truncate">{(getValue() as string) || '–'}</span>,
  },
  {
    id: 'collector',
    header: 'Collector',
    accessorFn: row =>
      `${row.node.meta_client_implementation ?? ''} ${shortVersion(row.node.meta_client_version)}`.trim(),
    cell: ({ row, getValue }) => (
      <span className="flex items-center gap-1" title={row.original.node.meta_client_version}>
        <span>{(getValue() as string) || '–'}</span>
        {row.original.newerVersion && (
          <ExclamationTriangleIcon
            className="size-3.5 shrink-0 text-warning"
            title={`${shortVersion(row.original.newerVersion)} available`}
          />
        )}
      </span>
    ),
  },
  {
    id: 'block',
    header: () => <span className="whitespace-nowrap">Block p50</span>,
    accessorFn: row => row.observation?.blockP50 ?? undefined,
    sortUndefined: 'last',
    cell: ({ getValue }) => formatMs(getValue() as number | undefined),
    meta: { cellClassName: 'text-foreground tabular-nums' },
  },
  {
    id: 'attestation',
    header: () => <span className="whitespace-nowrap">Attestation p50</span>,
    accessorFn: row => row.observation?.attestationP50 ?? undefined,
    sortUndefined: 'last',
    cell: ({ getValue }) => formatMs(getValue() as number | undefined),
    meta: { cellClassName: 'text-foreground tabular-nums' },
  },
  {
    id: 'lastSeen',
    header: () => <span className="whitespace-nowrap">Last seen</span>,
    accessorFn: row => row.node.last_seen_date_time ?? 0,
    cell: ({ getValue }) => getRelativeTime(getValue() as number),
    enableGlobalFilter: false,
  },
];

/**
 * Every active node, searchable and sortable; rows open the node page.
 */
export function NodesTable({ rows }: NodesTableProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <Card title="All nodes">
      <DataTable
        data={rows}
        columns={columns}
        pageSize={25}
        getRowId={row => row.nodeId}
        onRowClick={row => navigate({ to: '/xatu/nodes/$nodeId', params: { nodeId: row.nodeId } })}
        hideColumnVisibility
        emptyMessage="No nodes match"
      />
    </Card>
  );
}
