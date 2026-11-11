import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Badge } from '@/components/Elements/Badge';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { DimClientRelease } from '@/api/types.gen';
import { meetsMinVersion } from '@/utils/version';
import { findReleaseByVersion } from '@/utils/graffiti';
import { releaseName, releaseUrl, type VersionSummary } from '@/pages/ethereum/clients/utils/client-versions';

export interface ReleasesTableProps {
  client: string;
  releases: DimClientRelease[];
  latest?: DimClientRelease;
  /** Blocks per resolved version over the window */
  versions: VersionSummary[];
  /** Xatu nodes per version over the window; the column is left out when undefined */
  nodesByVersion?: Map<string, number>;
  /** Minimum version of the fork in ?fork */
  minVersion?: string;
}

/** A published release, or a version blocks resolved to that is not among the releases */
interface ReleaseRow {
  version: string;
  release?: DimClientRelease;
  summary?: VersionSummary;
}

/**
 * Every published release, newest first, with its blocks and share over the window and the Xatu nodes that ran it,
 * linked to its version page and release notes.
 */
export function ReleasesTable({
  client,
  releases,
  latest,
  versions,
  nodesByVersion,
  minVersion,
}: ReleasesTableProps): JSX.Element {
  const summaries = new Map<DimClientRelease | undefined, VersionSummary>();
  const unmatched: ReleaseRow[] = [];
  for (const summary of versions) {
    const release = findReleaseByVersion(releases, summary.version);
    if (release) summaries.set(release, summary);
    else unmatched.push({ version: summary.version, summary });
  }
  const rows: ReleaseRow[] = [
    ...releases.flatMap(release =>
      release.version ? [{ version: release.version, release, summary: summaries.get(release) }] : []
    ),
    ...unmatched,
  ];

  const columns: Column<ReleaseRow>[] = [
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
          {row.release?.prerelease && (
            <Badge color="yellow" size="small" variant="flat">
              Prerelease
            </Badge>
          )}
          {minVersion && !row.release?.prerelease && meetsMinVersion(row.version, minVersion) && (
            <Badge color="blue" size="small" variant="flat">
              Fork ready
            </Badge>
          )}
        </span>
      ),
    },
    {
      header: 'Released',
      accessor: row =>
        row.release?.release_date ? (
          <Timestamp timestamp={row.release.release_date} format="date" className="text-xs text-muted" />
        ) : (
          '-'
        ),
    },
    {
      header: 'Blocks',
      accessor: row => (row.summary?.blocks ?? 0).toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    ...(versions.some(summary => summary.untaggedBlocks > 0)
      ? [
          {
            header: 'Of which builds after it',
            accessor: (row: ReleaseRow) =>
              row.summary && row.summary.untaggedBlocks > 0 ? row.summary.untaggedBlocks.toLocaleString() : '-',
            cellClassName: 'text-right tabular-nums text-muted',
            headerClassName: 'text-right',
          },
        ]
      : []),
    {
      header: 'Share of resolved',
      accessor: row => (row.summary ? `${row.summary.share.toFixed(1)}%` : '-'),
      cellClassName: 'text-right tabular-nums font-medium text-foreground',
      headerClassName: 'text-right',
    },
    ...(nodesByVersion
      ? [
          {
            header: 'Xatu nodes',
            accessor: (row: ReleaseRow) => (nodesByVersion.get(row.version) ?? 0).toLocaleString(),
            cellClassName: 'text-right tabular-nums text-muted',
            headerClassName: 'text-right',
          },
        ]
      : []),
    {
      header: 'Release',
      accessor: row => {
        if (!row.release) return '-';
        const url = releaseUrl(row.release);
        const name = releaseName(row.release);
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs/6 text-muted hover:text-foreground"
          >
            {name ?? row.release.tag}
            <ArrowTopRightOnSquareIcon className="size-3" />
          </a>
        ) : (
          <span className="font-mono text-xs/6 text-muted">{row.release.tag ?? '-'}</span>
        );
      },
    },
  ];

  return (
    <Table
      variant="nested"
      data={rows}
      columns={columns}
      getRowKey={(row, index) => `${row.release?.tag ?? row.version}-${index}`}
    />
  );
}
