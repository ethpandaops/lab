import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { DimClientRelease, FctNodeActiveLast24h } from '@/api/types.gen';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import { matchReleaseVersion, shortVersion } from '../../utils/client-versions';

export interface NodeTableProps {
  client: string;
  nodes: FctNodeActiveLast24h[];
  releases: DimClientRelease[];
}

/**
 * Xatu nodes running the client, linked to their node and contributor pages, most recently seen first.
 */
export function NodeTable({ client, nodes, releases }: NodeTableProps): JSX.Element {
  const columns: Column<FctNodeActiveLast24h>[] = [
    {
      header: 'Xatu node',
      accessor: row =>
        row.node_id ? (
          <Link
            to="/xatu/nodes/$nodeId"
            params={{ nodeId: row.node_id }}
            className="block max-w-48 truncate font-mono text-xs/6 text-primary hover:underline"
            title={row.node_id}
          >
            {row.node_id}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      header: 'Contributor',
      accessor: row =>
        row.username ? (
          <Link
            to="/xatu/contributors/$id"
            params={{ id: row.username }}
            className="text-sm/6 text-foreground hover:underline"
          >
            {row.username}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      header: 'Version',
      accessor: row => {
        const release = matchReleaseVersion(row.meta_consensus_version, releases);
        return release?.version ? (
          <Link
            to="/ethereum/clients/$client/$version"
            params={{ client, version: release.version }}
            className="font-mono text-xs/6 text-primary hover:underline"
            title={row.meta_consensus_version}
          >
            {release.version}
          </Link>
        ) : (
          <span className="font-mono text-xs/6 text-muted" title={row.meta_consensus_version}>
            {shortVersion(row.meta_consensus_version) || '-'}
          </span>
        );
      },
    },
    {
      header: 'Location',
      accessor: row => (
        <span className="inline-flex items-center gap-1.5 text-sm/6">
          <CountryFlag code={row.meta_client_geo_country_code} showUnknown />
          <span className="truncate">{row.meta_client_geo_city || row.meta_client_geo_country || 'Unknown'}</span>
        </span>
      ),
    },
    {
      header: 'Last seen',
      accessor: row =>
        row.last_seen_date_time ? (
          <Timestamp timestamp={row.last_seen_date_time} format="relative" className="text-xs text-muted" />
        ) : (
          '-'
        ),
    },
  ];

  const sorted = [...nodes].sort((a, b) => (b.last_seen_date_time ?? 0) - (a.last_seen_date_time ?? 0));
  return (
    <Table
      variant="nested"
      data={sorted}
      columns={columns}
      getRowKey={(row, index) => `${row.node_id ?? row.meta_client_name}-${index}`}
    />
  );
}
