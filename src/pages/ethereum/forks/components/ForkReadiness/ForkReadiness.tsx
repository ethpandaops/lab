import { type JSX, type ReactNode, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dimClientReleaseServiceList } from '@/api/sdk.gen';
import type { DimClientRelease } from '@/api/types.gen';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { normalizeClientName } from '@/utils/ethereum';
import { meetsMinVersion } from '@/utils/version';
import { useActiveNodes } from '@/pages/xatu/nodes/hooks/useActiveNodes';
import { displayVersion, last24hStart, type VersionCount } from '@/pages/ethereum/clients/utils/client-versions';
import { useVersionCounts } from '@/pages/ethereum/clients/hooks/useVersionCounts';
import { useCensus } from '@/pages/ethereum/clients/hooks/useCensus';
import {
  CENSUS_TABLES,
  RESOLVED_STATUSES,
  type FctPeerCountByClClientDaily,
} from '@/pages/ethereum/clients/api/client-models';
import { ANGLE_COLORS, type Angle } from '@/pages/ethereum/clients/utils/angle-colors';
import type { ConsensusFork } from '@/hooks/useConfig/useConfig.types';

export interface ForkReadinessProps {
  /** Consensus fork name, e.g. fulu */
  fork: string;
}

interface ReadinessRow {
  client: string;
  minVersion: string;
  blocksReady: number;
  /** Blocks whose graffiti reveals a version */
  blocksCounted: number;
  /** All of the client's blocks, with a version or not */
  blocksTotal: number;
  peersReady: number;
  /** P2P peers whose build resolved to a release */
  peersCounted: number;
  nodesReady: number;
  nodesCounted: number;
}

/** A Xatu node still below the fork's minimum version */
interface StragglerNode {
  client: string;
  name: string;
  nodeId?: string;
  version: string;
}

/** A column header after a swatch of its angle's colour */
function angleHeader(angle: Angle, label: string): ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: ANGLE_COLORS[angle] }} />
      {label}
    </span>
  );
}

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Per client: the fork's minimum version, and how many of the last 24 hours of blocks, of the P2P peers on the latest
 * census day and of Xatu nodes already run it or newer, then the Xatu nodes still to upgrade. Renders nothing for
 * forks without minimum versions.
 */
export function ForkReadiness({ fork }: ForkReadinessProps): JSX.Element | null {
  const { currentNetwork } = useNetwork();
  const requirements = useMemo(() => {
    const config = (currentNetwork?.forks.consensus as Record<string, ConsensusFork | undefined> | undefined)?.[fork];
    return Object.entries(config?.min_client_versions ?? {})
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([client, minVersion]) => ({ client: normalizeClientName(client), minVersion }));
  }, [currentNetwork, fork]);
  const clients = requirements.map(requirement => requirement.client);
  const releases = useQuery({
    queryKey: ['fork-readiness', 'releases', clients.join(',')],
    queryFn: ({ signal }) =>
      fetchAllPages<DimClientRelease>(
        dimClientReleaseServiceList,
        { query: { client_in_values: clients.join(','), page_size: 10000 } },
        'dim_client_release',
        signal
      ),
    enabled: clients.length > 0,
    staleTime: 30 * 60 * 1000,
  });
  const blocks = useVersionCounts({
    grain: 'hourly',
    layer: 'consensus',
    from: last24hStart(),
    enabled: clients.length > 0,
  });
  const peers = useCensus<FctPeerCountByClClientDaily>(CENSUS_TABLES.clPeers, clients.length > 0 ? {} : null);
  const { nodes, isLoading: nodesLoading } = useActiveNodes();

  const { rows, stragglers } = useMemo((): { rows: ReadinessRow[]; stragglers: StragglerNode[] } => {
    const allReleases = releases.data ?? [];
    const stragglers: StragglerNode[] = [];
    const rows = requirements.map(({ client, minVersion }) => {
      const clientReleases = allReleases.filter(release => release.client === client);
      const allClientBlocks = blocks.rows.filter(row => row.client === client);
      const clientBlocks = allClientBlocks.filter(row => row.version);
      const sum = (rows: VersionCount[]): number => rows.reduce((total, row) => total + row.count, 0);
      const clientNodes = nodes
        .filter(node => normalizeClientName(node.meta_consensus_implementation ?? '') === client)
        .map(node => ({ node, version: displayVersion(node.meta_consensus_version, clientReleases) }))
        .filter(entry => entry.version);
      const nodeVersions = clientNodes.map(entry => entry.version);
      for (const { node, version } of clientNodes) {
        if (meetsMinVersion(version, minVersion)) continue;
        stragglers.push({ client, name: node.meta_client_name ?? 'unknown', nodeId: node.node_id, version });
      }
      const clientPeers = peers.latest.filter(
        row =>
          normalizeClientName(row.client ?? '') === client &&
          row.version &&
          RESOLVED_STATUSES.has(row.release_status ?? '')
      );
      const peerSum = (list: FctPeerCountByClClientDaily[]): number =>
        list.reduce((total, row) => total + (row.peer_count ?? 0), 0);
      return {
        client,
        minVersion,
        blocksReady: sum(clientBlocks.filter(block => meetsMinVersion(block.version!, minVersion))),
        blocksCounted: sum(clientBlocks),
        blocksTotal: sum(allClientBlocks),
        peersReady: peerSum(clientPeers.filter(row => meetsMinVersion(row.version!, minVersion))),
        peersCounted: peerSum(clientPeers),
        nodesReady: nodeVersions.filter(version => meetsMinVersion(version, minVersion)).length,
        nodesCounted: nodeVersions.length,
      };
    });
    stragglers.sort((a, b) => a.client.localeCompare(b.client) || a.name.localeCompare(b.name));
    return { rows, stragglers };
  }, [requirements, releases.data, blocks.rows, peers.latest, nodes]);

  if (requirements.length === 0) return null;

  return (
    <Card rounded title="Client readiness" subtitle="Share on the minimum version or newer">
      {releases.isLoading || blocks.isLoading || nodesLoading ? (
        <LoadingContainer className="h-48 rounded-sm" />
      ) : (
        <Table
          variant="nested"
          data={rows}
          getRowKey={row => row.client}
          columns={[
            {
              header: 'Client',
              accessor: row => (
                <Link
                  to="/ethereum/clients/$client"
                  params={{ client: row.client }}
                  search={{ fork }}
                  className="hover:underline"
                >
                  <ClientLabel client={row.client} noLink />
                </Link>
              ),
            },
            {
              header: 'Minimum',
              accessor: row => <span className="font-mono text-xs/6">{row.minVersion}</span>,
            },
            {
              header: angleHeader('blocks', 'Blocks, last 24h'),
              accessor: row => percent(row.blocksReady, row.blocksCounted),
              cellClassName: 'text-right tabular-nums font-medium text-foreground',
              headerClassName: 'text-right',
            },
            {
              header: angleHeader('peers', peers.day ? `P2P peers, ${peers.day}` : 'P2P peers'),
              accessor: row => (peers.isLoading ? '…' : percent(row.peersReady, row.peersCounted)),
              cellClassName: 'text-right tabular-nums text-foreground',
              headerClassName: 'text-right',
            },
            {
              header: angleHeader('xatu', 'Xatu nodes, last 24h'),
              accessor: row => percent(row.nodesReady, row.nodesCounted),
              cellClassName: 'text-right tabular-nums text-foreground',
              headerClassName: 'text-right',
            },
            {
              header: 'Blocks with a version',
              accessor: row =>
                row.blocksTotal > 0
                  ? `${row.blocksCounted.toLocaleString()} of ${row.blocksTotal.toLocaleString()}`
                  : '-',
              cellClassName: 'text-right tabular-nums text-muted',
              headerClassName: 'text-right',
            },
          ]}
        />
      )}
      {stragglers.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-sm/6 font-medium text-foreground">Xatu nodes to upgrade</h4>
          <Table
            variant="nested"
            data={stragglers}
            getRowKey={node => `${node.client}-${node.nodeId ?? node.name}`}
            columns={[
              {
                header: 'Xatu node',
                accessor: node =>
                  node.nodeId ? (
                    <Link
                      to="/xatu/nodes/$nodeId"
                      params={{ nodeId: node.nodeId }}
                      className="text-primary hover:underline"
                    >
                      {node.name}
                    </Link>
                  ) : (
                    node.name
                  ),
              },
              { header: 'Client', accessor: node => <ClientLabel client={node.client} /> },
              {
                header: 'Version',
                accessor: node => <span className="font-mono text-xs/6">{node.version}</span>,
              },
            ]}
          />
        </div>
      )}
    </Card>
  );
}
