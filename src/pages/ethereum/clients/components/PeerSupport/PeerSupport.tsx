import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import type { DimClientRelease, FctPeerPartialMessageSupportByClientDaily } from '@/api/types.gen';
import { compareVersions } from '@/utils/version';
import { displayVersion } from '@/pages/ethereum/clients/utils/client-versions';

export interface PeerSupportProps {
  client: string;
  releases: DimClientRelease[];
  partial: FctPeerPartialMessageSupportByClientDaily[];
  partialDay?: string;
  isLoading: boolean;
}

interface PartialRow {
  version: string;
  connected: number;
  subscribed: number;
  requests: number;
  sends: number;
}

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/** A version cell linking to the version page when it is a release */
function VersionCell({
  client,
  version,
  releases,
}: {
  client: string;
  version: string;
  releases: DimClientRelease[];
}): JSX.Element {
  const isRelease = releases.some(release => release.version === version);
  return isRelease ? (
    <Link
      to="/ethereum/clients/$client/$version"
      params={{ client, version }}
      className="font-mono text-xs/6 text-primary hover:underline"
    >
      {version}
    </Link>
  ) : (
    <span className="font-mono text-xs/6 text-muted">{version || 'Unknown'}</span>
  );
}

/**
 * What our sentries see of the client's peers, per version: partial-column support.
 */
export function PeerSupport({ client, releases, partial, partialDay, isLoading }: PeerSupportProps): JSX.Element {
  const partialRows = useMemo(() => {
    const byVersion = new Map<string, PartialRow>();
    for (const row of partial) {
      const version = displayVersion(row.peer_version, releases);
      const entry = byVersion.get(version) ?? { version, connected: 0, subscribed: 0, requests: 0, sends: 0 };
      entry.connected += row.avg_connected_peer_count ?? 0;
      entry.subscribed += row.avg_subscribed_peer_count ?? 0;
      entry.requests += row.avg_requests_partial_peer_count ?? 0;
      entry.sends += row.avg_supports_sending_partial_peer_count ?? 0;
      byVersion.set(version, entry);
    }
    return [...byVersion.values()].sort((a, b) => compareVersions(b.version, a.version));
  }, [partial, releases]);

  const partialColumns: Column<PartialRow>[] = [
    { header: 'Version', accessor: row => <VersionCell client={client} version={row.version} releases={releases} /> },
    {
      header: 'Connected peers (avg)',
      accessor: row => row.connected.toFixed(1),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'Request partials',
      accessor: row => percent(row.requests, row.subscribed),
      cellClassName: 'text-right tabular-nums font-medium text-foreground',
      headerClassName: 'text-right',
    },
    {
      header: 'Send partials',
      accessor: row => percent(row.sends, row.subscribed),
      cellClassName: 'text-right tabular-nums text-foreground',
      headerClassName: 'text-right',
    },
  ];

  return (
    <Card
      rounded
      title="Partial-column support by peer version"
      subtitle={partialDay ? `Average per sentry, ${partialDay}` : 'Average per sentry'}
      actions={
        <Link to="/ethereum/data-availability/partial-columns" className="text-sm text-primary hover:underline">
          Partial columns
        </Link>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted">Loading peers</p>
      ) : partialRows.length === 0 ? (
        <p className="text-sm text-muted">Xatu sentries saw no peers running this client.</p>
      ) : (
        <Table
          variant="nested"
          data={partialRows.slice(0, 15)}
          columns={partialColumns}
          getRowKey={row => row.version}
        />
      )}
    </Card>
  );
}
