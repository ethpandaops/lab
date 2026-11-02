import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Badge } from '@/components/Elements/Badge';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { DimClientRelease } from '@/api/types.gen';
import { githubReleaseUrl } from '@/utils/graffiti';
import { meetsMinVersion } from '@/utils/version';

export interface ReleasesTableProps {
  client: string;
  releases: DimClientRelease[];
  latest?: DimClientRelease;
  /** Blocks per version over the page's window */
  blocksByVersion: Map<string, number>;
  /** Our nodes per version */
  nodesByVersion: Map<string, number>;
  /** Minimum version of the fork in ?fork */
  minVersion?: string;
}

/**
 * Every published release, newest first, with how many blocks and nodes run it.
 */
export function ReleasesTable({
  client,
  releases,
  latest,
  blocksByVersion,
  nodesByVersion,
  minVersion,
}: ReleasesTableProps): JSX.Element {
  const columns: Column<DimClientRelease>[] = [
    {
      header: 'Version',
      accessor: row =>
        row.version ? (
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
            {row.prerelease && (
              <Badge color="yellow" size="small" variant="flat">
                Prerelease
              </Badge>
            )}
            {minVersion && !row.prerelease && meetsMinVersion(row.version, minVersion) && (
              <Badge color="blue" size="small" variant="flat">
                Fork ready
              </Badge>
            )}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'Released',
      accessor: row =>
        row.release_date ? <Timestamp timestamp={row.release_date} format="short" className="text-xs" /> : '-',
    },
    {
      header: 'Blocks',
      accessor: row => (blocksByVersion.get(row.version ?? '') ?? 0).toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'Our nodes',
      accessor: row => (nodesByVersion.get(row.version ?? '') ?? 0).toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'Release',
      accessor: row => {
        const url = githubReleaseUrl(row.repository, row.tag);
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs/6 text-muted hover:text-foreground"
          >
            {row.tag}
            <ArrowTopRightOnSquareIcon className="size-3" />
          </a>
        ) : (
          '-'
        );
      },
    },
  ];

  return (
    <Table
      variant="nested"
      data={releases}
      columns={columns}
      getRowKey={(row, index) => `${row.tag ?? row.version}-${index}`}
    />
  );
}
