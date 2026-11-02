import { type JSX, useMemo } from 'react';
import { Stats } from '@/components/DataDisplay/Stats';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { compareVersions } from '@/utils/version';
import { CLIENT_WINDOW_OPTIONS } from '../../constants';
import { useGraffitiBlocks } from '../../hooks';
import { EntityVersionBars } from '../EntityVersionBars';
import { GraffitiBlocksTable } from '../GraffitiBlocksTable';
import type { ClientTabProps } from './ClientTabs.types';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Who proposes blocks with the client: how concentrated it is, each top entity's version mix, and the latest blocks.
 */
export function ProposersTab({
  client,
  layer,
  blocks,
  blocksLoading,
  latest,
  since,
  window,
  onWindowChange,
}: ClientTabProps): JSX.Element {
  const recent = useGraffitiBlocks({
    since,
    ...(layer === 'consensus' ? { consensusClient: client } : { executionClient: client }),
  });

  const concentration = useMemo(() => {
    const byEntity = new Map<string, { blocks: number; resolved: number; onLatest: number }>();
    for (const block of blocks) {
      if (!block.entity) continue;
      const entry = byEntity.get(block.entity) ?? { blocks: 0, resolved: 0, onLatest: 0 };
      entry.blocks++;
      if (block.version) {
        entry.resolved++;
        if (latest?.version && compareVersions(block.version, latest.version) >= 0) entry.onLatest++;
      }
      byEntity.set(block.entity, entry);
    }
    const sorted = [...byEntity.values()].sort((a, b) => b.blocks - a.blocks);
    const top = (n: number): number => sorted.slice(0, n).reduce((sum, entry) => sum + entry.blocks, 0);
    // An entity counts as on latest when most of its resolved blocks are
    const upgraded = sorted.filter(entry => entry.resolved > 0 && entry.onLatest / entry.resolved >= 0.5).length;
    const withResolved = sorted.filter(entry => entry.resolved > 0).length;
    return { entities: sorted.length, top1: top(1), top5: top(5), upgraded, withResolved };
  }, [blocks, latest?.version]);

  const windowControl = (
    <SegmentedControl options={CLIENT_WINDOW_OPTIONS} value={window} onChange={onWindowChange} ariaLabel="Window" />
  );

  return (
    <div className="flex flex-col gap-6">
      {blocksLoading ? (
        <LoadingContainer className="h-96 rounded-sm" />
      ) : (
        <>
          <Stats
            gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
            stats={[
              { id: 'entities', name: 'Entities proposing', value: concentration.entities.toLocaleString() },
              {
                id: 'top1',
                name: "Largest entity's share of blocks",
                value: percent(concentration.top1, blocks.length),
              },
              {
                id: 'top5',
                name: "Top 5 entities' share of blocks",
                value: percent(concentration.top5, blocks.length),
              },
              {
                id: 'upgraded',
                name: `Entities mostly on ${latest?.version ?? 'latest'} or newer`,
                value: percent(concentration.upgraded, concentration.withResolved),
              },
            ]}
          />
          <EntityVersionBars
            client={client}
            blocks={blocks}
            latestVersion={latest?.version}
            title="Entities by version"
            subtitle="Blocks each entity proposed with this client, split by the version they ran"
            windowControl={windowControl}
          />
        </>
      )}
      <GraffitiBlocksTable
        blocks={recent.blocks}
        isLoading={recent.isLoading}
        error={recent.error}
        hasNextPage={recent.hasNextPage}
        isFetchingNextPage={recent.isFetchingNextPage}
        onLoadMore={recent.fetchNextPage}
      />
    </div>
  );
}
