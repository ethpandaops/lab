import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import type { DimClientRelease, FctPeerPartialMessageSupportByClientDaily, IntCustodyProbe } from '@/api/types.gen';
import { compareVersions } from '@/utils/version';
import { displayVersion } from '../../utils/client-versions';

export interface PeerSupportProps {
  client: string;
  releases: DimClientRelease[];
  partial: FctPeerPartialMessageSupportByClientDaily[];
  partialDay?: string;
  probes: IntCustodyProbe[];
  isLoading: boolean;
}

interface PartialRow {
  version: string;
  connected: number;
  subscribed: number;
  requests: number;
  sends: number;
}

interface ProbeRow {
  version: string;
  /** Most common version string, for the probes page filter */
  rawVersion: string;
  peers: number;
  probes: number;
  success: number;
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
 * What our sentries see of the client's peers, per version: partial-column support and custody probe results.
 */
export function PeerSupport({
  client,
  releases,
  partial,
  partialDay,
  probes,
  isLoading,
}: PeerSupportProps): JSX.Element {
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

  const probeRows = useMemo(() => {
    const byVersion = new Map<
      string,
      { peers: Set<number>; probes: number; success: number; raw: Map<string, number> }
    >();
    for (const probe of probes) {
      const version = displayVersion(probe.meta_peer_version, releases);
      const entry = byVersion.get(version) ?? { peers: new Set<number>(), probes: 0, success: 0, raw: new Map() };
      if (probe.peer_id_unique_key !== undefined) entry.peers.add(probe.peer_id_unique_key);
      entry.probes++;
      if (probe.result === 'success') entry.success++;
      const raw = probe.meta_peer_version ?? '';
      entry.raw.set(raw, (entry.raw.get(raw) ?? 0) + 1);
      byVersion.set(version, entry);
    }
    return [...byVersion.entries()]
      .map(([version, entry]) => ({
        version,
        rawVersion: [...entry.raw.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
        peers: entry.peers.size,
        probes: entry.probes,
        success: entry.success,
      }))
      .sort((a, b) => b.peers - a.peers || compareVersions(b.version, a.version));
  }, [probes, releases]);

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

  const probeColumns: Column<ProbeRow>[] = [
    { header: 'Version', accessor: row => <VersionCell client={client} version={row.version} releases={releases} /> },
    {
      header: 'Peers probed',
      accessor: row => row.peers.toLocaleString(),
      cellClassName: 'text-right tabular-nums font-medium text-foreground',
      headerClassName: 'text-right',
    },
    {
      header: 'Probes',
      accessor: row => (
        <Link
          to="/ethereum/data-availability/probes"
          search={{ peer: probes[0]?.meta_peer_implementation ?? client, peerVersion: row.rawVersion || undefined }}
          className="text-primary hover:underline"
        >
          {row.probes.toLocaleString()}
        </Link>
      ),
      cellClassName: 'text-right tabular-nums',
      headerClassName: 'text-right',
    },
    {
      header: 'Success',
      accessor: row => percent(row.success, row.probes),
      cellClassName: 'text-right tabular-nums text-foreground',
      headerClassName: 'text-right',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card
        rounded
        title="Custody probes by peer version"
        subtitle="Peers our probers sampled columns from in the last hour"
        actions={
          <Link
            to="/ethereum/data-availability/probes"
            search={{ peer: probes[0]?.meta_peer_implementation ?? client }}
            className="text-sm text-primary hover:underline"
          >
            All probes
          </Link>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted">Loading probes</p>
        ) : probeRows.length === 0 ? (
          <p className="text-sm text-muted">No peers running this client were probed in the last hour.</p>
        ) : (
          <Table variant="nested" data={probeRows.slice(0, 15)} columns={probeColumns} getRowKey={row => row.version} />
        )}
      </Card>
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
          <p className="text-sm text-muted">Our sentries saw no peers running this client.</p>
        ) : (
          <Table
            variant="nested"
            data={partialRows.slice(0, 15)}
            columns={partialColumns}
            getRowKey={row => row.version}
          />
        )}
      </Card>
    </div>
  );
}
