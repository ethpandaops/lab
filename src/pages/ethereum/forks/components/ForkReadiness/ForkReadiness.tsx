import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dimClientReleaseServiceList, fctBlockGraffitiServiceList } from '@/api/sdk.gen';
import type { DimClientRelease, FctBlockGraffiti } from '@/api/types.gen';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { normalizeClientName } from '@/utils/ethereum';
import { meetsMinVersion } from '@/utils/version';
import { useActiveNodes } from '@/pages/xatu/nodes/hooks/useActiveNodes';
import { displayVersion, resolveBlocks } from '@/pages/ethereum/clients/utils/client-versions';
import type { ConsensusFork } from '@/hooks/useConfig/useConfig.types';

export interface ForkReadinessProps {
  /** Consensus fork name, e.g. fulu */
  fork: string;
}

interface ReadinessRow {
  client: string;
  minVersion: string;
  blocksReady: number;
  blocksCounted: number;
  nodesReady: number;
  nodesCounted: number;
}

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Per client: the fork's minimum version, and how many of the last 24 hours of blocks and of our nodes already
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
  const since = useMemo(() => Math.floor(Date.now() / 1000 / 600) * 600 - 24 * 3600, []);

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
  const blocks = useQuery({
    queryKey: ['fork-readiness', 'blocks', currentNetwork?.name, since],
    queryFn: ({ signal }) =>
      fetchAllPages<FctBlockGraffiti>(
        fctBlockGraffitiServiceList,
        { query: { slot_start_date_time_gte: since, page_size: 10000 } },
        'fct_block_graffiti',
        signal
      ),
    enabled: !!currentNetwork && clients.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  const { nodes, isLoading: nodesLoading } = useActiveNodes();

  const rows = useMemo((): ReadinessRow[] => {
    const allReleases = releases.data ?? [];
    return requirements.map(({ client, minVersion }) => {
      const clientReleases = allReleases.filter(release => release.client === client);
      const clientBlocks = resolveBlocks(
        (blocks.data ?? []).filter(row => row.consensus_client === client),
        'consensus',
        clientReleases
      ).filter(block => block.version);
      const nodeVersions = nodes
        .filter(node => normalizeClientName(node.meta_consensus_implementation ?? '') === client)
        .map(node => displayVersion(node.meta_consensus_version, clientReleases))
        .filter(Boolean);
      return {
        client,
        minVersion,
        blocksReady: clientBlocks.filter(block => meetsMinVersion(block.version!, minVersion)).length,
        blocksCounted: clientBlocks.length,
        nodesReady: nodeVersions.filter(version => meetsMinVersion(version, minVersion)).length,
        nodesCounted: nodeVersions.length,
      };
    });
  }, [requirements, releases.data, blocks.data, nodes]);

  if (requirements.length === 0) return null;

  return (
    <Card
      rounded
      title="Client readiness"
      subtitle="Blocks over the last 24 hours and our nodes on the minimum version or newer"
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
              header: 'Blocks ready',
              accessor: row => percent(row.blocksReady, row.blocksCounted),
              cellClassName: 'text-right tabular-nums font-medium text-foreground',
              headerClassName: 'text-right',
            },
            {
              header: 'Our nodes ready',
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
