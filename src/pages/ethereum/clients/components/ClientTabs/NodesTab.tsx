import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { getClientColor } from '@/utils/ethereum';
import { compareVersions } from '@/utils/version';
import { displayVersion } from '../../utils/client-versions';
import { NodeTable } from '../NodeTable';
import { ShareBar } from '../ShareBar';
import type { ClientTabProps } from './ClientTabs.types';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Our contributoor nodes running the client: how many, where, on which versions, linked to each node.
 */
export function NodesTab({ client, layer, nodes, nodesLoading, releases, latest }: ClientTabProps): JSX.Element {
  const versions = useMemo(() => {
    if (layer !== 'consensus') return [];
    const counts = new Map<string, number>();
    for (const node of nodes) {
      const version = displayVersion(node.meta_consensus_version, releases) || 'Unknown';
      counts.set(version, (counts.get(version) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => compareVersions(b.version, a.version));
  }, [nodes, layer, releases]);

  if (nodesLoading) return <LoadingContainer className="h-96 rounded-sm" />;

  const contributors = new Set(nodes.map(node => node.username).filter(Boolean)).size;
  const countries = new Set(nodes.map(node => node.meta_client_geo_country_code).filter(Boolean)).size;
  const onLatest = latest?.version
    ? versions
        .filter(row => compareVersions(row.version, latest.version!) >= 0)
        .reduce((sum, row) => sum + row.count, 0)
    : 0;
  const isReleased = (version: string): boolean => releases.some(release => release.version === version);

  return (
    <div className="flex flex-col gap-6">
      <Stats
        gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
        stats={[
          { id: 'nodes', name: 'Nodes, last 24h', value: nodes.length.toLocaleString() },
          { id: 'contributors', name: 'Contributors', value: contributors.toLocaleString() },
          { id: 'countries', name: 'Countries', value: countries.toLocaleString() },
          {
            id: 'latest',
            name: 'On latest or newer',
            value: layer === 'consensus' ? percent(onLatest, nodes.length) : '-',
          },
        ]}
      />
      {nodes.length === 0 ? (
        <Card rounded>
          <p className="text-sm/6 text-muted">
            {layer === 'consensus'
              ? 'None of our nodes ran this client in the last 24 hours.'
              : 'Contributoor reports the consensus client only, and no ethPandaOps node name lists this client.'}
          </p>
        </Card>
      ) : (
        <>
          {versions.length > 0 && (
            <Card rounded title="Versions on our nodes">
              <ul className="flex flex-col gap-1.5">
                {versions.map(row => (
                  <li key={row.version} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 font-mono text-xs/6">
                      {isReleased(row.version) ? (
                        <Link
                          to="/ethereum/clients/$client/$version"
                          params={{ client, version: row.version }}
                          className="text-primary hover:underline"
                        >
                          {row.version}
                        </Link>
                      ) : (
                        <span className="text-muted">{row.version}</span>
                      )}
                    </span>
                    <span className="flex-1">
                      <ShareBar
                        share={(row.count / nodes.length) * 100}
                        color={getClientColor(client)}
                        showThresholds={false}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card
            rounded
            title="Nodes"
            actions={
              <Link to="/xatu/nodes" className="text-sm text-primary hover:underline">
                All nodes
              </Link>
            }
          >
            <NodeTable client={client} layer={layer} nodes={nodes} releases={releases} />
          </Card>
        </>
      )}
    </div>
  );
}
