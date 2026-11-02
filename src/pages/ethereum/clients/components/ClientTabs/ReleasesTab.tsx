import { type JSX, useMemo } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { displayVersion, summariseVersions } from '../../utils/client-versions';
import { ReleasesTable } from '../ReleasesTable';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * Every published release with how many blocks and our nodes run it.
 */
export function ReleasesTab({
  client,
  layer,
  releases,
  releasesLoading,
  latest,
  blocks,
  nodes,
  requirement,
  window,
}: ClientTabProps): JSX.Element {
  const blocksByVersion = useMemo(
    () => new Map(summariseVersions(blocks).map(summary => [summary.version, summary.blocks])),
    [blocks]
  );
  const nodesByVersion = useMemo(() => {
    const counts = new Map<string, number>();
    if (layer !== 'consensus') return counts;
    for (const node of nodes) {
      const version = displayVersion(node.meta_consensus_version, releases);
      counts.set(version, (counts.get(version) ?? 0) + 1);
    }
    return counts;
  }, [nodes, layer, releases]);

  if (releasesLoading) return <LoadingContainer className="h-96 rounded-sm" />;
  if (releases.length === 0) {
    return (
      <Card rounded>
        <p className="text-sm text-muted">No published releases.</p>
      </Card>
    );
  }

  return (
    <Card rounded title="Releases" subtitle={`Blocks over the last ${window}; our nodes over the last 24 hours`}>
      <ReleasesTable
        client={client}
        releases={releases}
        latest={latest}
        blocksByVersion={blocksByVersion}
        nodesByVersion={nodesByVersion}
        minVersion={requirement?.minVersion}
      />
    </Card>
  );
}
