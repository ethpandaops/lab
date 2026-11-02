import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Badge } from '@/components/Elements/Badge';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { DimClientRelease } from '@/api/types.gen';
import { meetsMinVersion } from '@/utils/version';
import { findReleaseByVersion } from '@/utils/graffiti';
import type { VersionSummary } from '../../utils/client-versions';

export interface VersionTableProps {
  client: string;
  versions: VersionSummary[];
  releases: DimClientRelease[];
  latest?: DimClientRelease;
  /** Minimum version of the fork in ?fork, to mark versions below it */
  minVersion?: string;
}

/**
 * Versions seen in the client's blocks, newest first, linked to their version pages.
 */
export function VersionTable({ client, versions, releases, latest, minVersion }: VersionTableProps): JSX.Element {
  const columns: Column<VersionSummary>[] = [
    {
      header: 'Version',
      accessor: row => (
        <span className="inline-flex items-center gap-2">
          <Link
            to="/ethereum/clients/$client/$version"
            params={{ client, version: row.version }}
            className="font-mono text-sm/6 font-medium text-primary hover:underline"
          >
            {row.version}
          </Link>
          {row.version === latest?.version && (
            <Badge color="green" size="small" variant="flat">
              Latest
            </Badge>
          )}
          {minVersion && !meetsMinVersion(row.version, minVersion) && (
            <Badge color="red" size="small" variant="flat">
              Below fork minimum
            </Badge>
          )}
        </span>
      ),
    },
    {
      header: 'Released',
      accessor: row => {
        const date = findReleaseByVersion(releases, row.version)?.release_date;
        return date ? <Timestamp timestamp={date} format="short" className="text-xs text-muted" /> : '-';
      },
    },
    {
      header: 'Blocks',
      accessor: row => row.blocks.toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'Share',
      accessor: row => `${row.share.toFixed(1)}%`,
      cellClassName: 'text-right tabular-nums font-medium text-foreground',
      headerClassName: 'text-right',
    },
    {
      header: 'Entities',
      accessor: row => row.entities.toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
  ];

  return <Table variant="nested" data={versions} columns={columns} getRowKey={row => row.version} />;
}
