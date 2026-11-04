import { type JSX, useMemo } from 'react';
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
  nodesReady: number;
  nodesCounted: number;
}

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Per client: the fork's minimum version, and how many of the last 24 hours of blocks and of Xatu nodes already
 * run it or newer. Renders nothing for forks without minimum versions.
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
  const { nodes, isLoading: nodesLoading } = useActiveNodes();

  const rows = useMemo((): ReadinessRow[] => {
    const allReleases = releases.data ?? [];
    return requirements.map(({ client, minVersion }) => {
      const clientReleases = allReleases.filter(release => release.client === client);
      const allClientBlocks = blocks.rows.filter(row => row.client === client);
      const clientBlocks = allClientBlocks.filter(row => row.version);
      const sum = (rows: VersionCount[]): number => rows.reduce((total, row) => total + row.count, 0);
      const nodeVersions = nodes
        .filter(node => normalizeClientName(node.meta_consensus_implementation ?? '') === client)
        .map(node => displayVersion(node.meta_consensus_version, clientReleases))
        .filter(Boolean);
      return {
        client,
        minVersion,
        blocksReady: sum(clientBlocks.filter(block => meetsMinVersion(block.version!, minVersion))),
        blocksCounted: sum(clientBlocks),
        blocksTotal: sum(allClientBlocks),
        nodesReady: nodeVersions.filter(version => meetsMinVersion(version, minVersion)).length,
        nodesCounted: nodeVersions.length,
      };
    });
  }, [requirements, releases.data, blocks.rows, nodes]);

  if (requirements.length === 0) return null;

  return (
    <Card
      rounded
      title="Client readiness"
      subtitle="Blocks over the last 24 hours and Xatu nodes on the minimum version or newer"
      actions={
        <Link to="/xatu/fork-readiness" className="text-sm text-primary hover:underline">
          Node readiness
        </Link>
      }
    >
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
              header: 'Blocks with a version',
              accessor: row =>
                row.blocksTotal > 0
                  ? `${row.blocksCounted.toLocaleString()} of ${row.blocksTotal.toLocaleString()}`
                  : '-',
              cellClassName: 'text-right tabular-nums text-muted',
              headerClassName: 'text-right',
            },
            {
              header: 'Blocks ready',
              accessor: row => percent(row.blocksReady, row.blocksCounted),
              cellClassName: 'text-right tabular-nums font-medium text-foreground',
              headerClassName: 'text-right',
            },
            {
              header: 'Xatu nodes ready',
              accessor: row => percent(row.nodesReady, row.nodesCounted),
              cellClassName: 'text-right tabular-nums text-foreground',
              headerClassName: 'text-right',
            },
          ]}
        />
      )}
    </Card>
  );
}
