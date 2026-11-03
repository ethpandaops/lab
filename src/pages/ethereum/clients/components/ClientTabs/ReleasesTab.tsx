import { type JSX, useMemo } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS } from '../../constants';
import { useNodeVersions, useVersionCounts } from '../../hooks';
import { displayVersion, summariseVersions, windowStart } from '../../utils/client-versions';
import { ReleasesTable } from '../ReleasesTable';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * Every published release with how many blocks and Xatu nodes ran it over the window.
 */
export function ReleasesTab({
  client,
  layer,
  releases,
  releasesLoading,
  latest,
  requirement,
  shareWindow,
  onShareWindowChange,
}: ClientTabProps): JSX.Element {
  const days = SHARE_WINDOW_DAYS[shareWindow];
  const blockCounts = useVersionCounts({
    grain: 'daily',
    client,
    layer,
    from: days === null ? undefined : windowStart(days),
  });
  const blocksByVersion = useMemo(
    () => new Map(summariseVersions(blockCounts.rows).map(summary => [summary.version, summary.blocks])),
    [blockCounts.rows]
  );
  const nodeDays = useNodeVersions(client, days, layer === 'consensus');
  // Distinct Xatu nodes that reported each version on any day of the window
  const nodesByVersion = useMemo(() => {
    const nodeIds = new Map<string, Set<string>>();
    for (const row of nodeDays.rows) {
      const version = displayVersion(row.meta_consensus_version, releases);
      if (!version || !row.node_id) continue;
      nodeIds.set(version, (nodeIds.get(version) ?? new Set()).add(row.node_id));
    }
    return new Map([...nodeIds.entries()].map(([version, ids]) => [version, ids.size]));
  }, [nodeDays.rows, releases]);

  if (releasesLoading) return <LoadingContainer className="h-96 rounded-sm" />;
  if (releases.length === 0) {
    return (
      <Card rounded>
        <p className="text-sm text-muted">No published releases.</p>
      </Card>
    );
  }

  return (
    <Card
      rounded
      title="Releases"
      actions={
        <SegmentedControl
          options={SHARE_WINDOW_OPTIONS}
          value={shareWindow}
          onChange={onShareWindowChange}
          ariaLabel="Window"
        />
      }
    >
      {blockCounts.isLoading || nodeDays.isLoading ? (
        <LoadingContainer className="h-96 rounded-sm" />
      ) : (
        <ReleasesTable
          client={client}
          releases={releases}
          latest={latest}
          blocksByVersion={blocksByVersion}
          nodesByVersion={nodesByVersion}
          minVersion={requirement?.minVersion}
        />
      )}
    </Card>
  );
}
