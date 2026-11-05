import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Stats } from '@/components/DataDisplay/Stats';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useTableBounds } from '@/hooks/useBounds';
import { completeBucketEnd } from '@/utils/time';
import { CLIENT_WINDOW_OPTIONS } from '../../constants';
import { useVersionCounts } from '../../hooks';
import { BLOCK_FILTER_KEYS, type BlockSearch } from '../../utils/block-filters';
import { onLatestByEntity } from '../../utils/client-versions';
import { EntityVersionBars } from '../EntityVersionBars';
import { GraffitiBlocksTable } from '../GraffitiBlocksTable';
import type { ClientTabProps } from './ClientTabs.types';

const DAY = 86400;

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Who proposes blocks with the client: how concentrated it is, each top entity's version mix, and the latest blocks.
 */
export function ProposersTab({ client, layer, latest, since, window, onWindowChange }: ClientTabProps): JSX.Element {
  const { rows: blocks, isLoading: blocksLoading } = useVersionCounts({
    grain: 'entity-daily',
    client,
    layer,
    from: since,
  });
  const total = useMemo(() => blocks.reduce((sum, row) => sum + row.count, 0), [blocks]);
  // Adoption of the latest release is read on the last complete UTC day the table holds, not over the window
  const bounds = useTableBounds('fct_block_graffiti_client_version_by_entity_daily').data;
  const dayEnd = bounds ? Math.min(completeBucketEnd('day'), Math.floor(bounds.max / DAY) * DAY) : undefined;
  const { rows: dayBlocks, isLoading: dayLoading } = useVersionCounts({
    grain: 'entity-daily',
    client,
    layer,
    from: dayEnd === undefined ? undefined : dayEnd - DAY,
    to: dayEnd,
    enabled: dayEnd !== undefined,
  });
  const latestDay = useMemo(
    () =>
      dayEnd === undefined
        ? undefined
        : {
            label: new Date((dayEnd - DAY) * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }),
            blocks: dayBlocks,
          },
    [dayEnd, dayBlocks]
  );
  const search = useSearch({ from: '/ethereum/clients/$client/' });
  const navigate = useNavigate({ from: '/ethereum/clients/$client/' });
  const onBlockSearchChange = useCallback(
    (update: Partial<BlockSearch>) => navigate({ search: prev => ({ ...prev, ...update }), resetScroll: false }),
    [navigate]
  );
  // The page's own client is fixed; its layer's filter is not offered
  const ownKey = layer === 'consensus' ? 'cl' : 'el';
  const blockFields = BLOCK_FILTER_KEYS.filter(key => key !== ownKey);

  const concentration = useMemo(() => {
    const byEntity = new Map<string, number>();
    for (const block of blocks) {
      if (block.entity) byEntity.set(block.entity, (byEntity.get(block.entity) ?? 0) + block.count);
    }
    const sorted = [...byEntity.values()].sort((a, b) => b - a);
    const top = (n: number): number => sorted.slice(0, n).reduce((sum, count) => sum + count, 0);
    return { entities: sorted.length, top1: top(1), top5: top(5) };
  }, [blocks]);
  const adoption = useMemo(() => {
    const entities = [...onLatestByEntity(dayBlocks, latest?.version).values()].filter(entry => entry.resolved > 0);
    // An entity counts as on latest when most of its resolved blocks that day are
    const upgraded = entities.filter(entry => entry.onLatest / entry.resolved >= 0.5).length;
    return { upgraded, withResolved: entities.length };
  }, [dayBlocks, latest?.version]);

  return (
    <div className="flex flex-col gap-6">
      {/* Every section below covers this window */}
      <div className="self-start">
        <SegmentedControl options={CLIENT_WINDOW_OPTIONS} value={window} onChange={onWindowChange} ariaLabel="Window" />
      </div>
      {blocksLoading || dayLoading ? (
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
                value: percent(concentration.top1, total),
              },
              {
                id: 'top5',
                name: "Top 5 entities' share of blocks",
                value: percent(concentration.top5, total),
              },
              {
                id: 'upgraded',
                name: `Entities mostly on ${latest?.version ?? 'latest'} or newer`,
                value: percent(adoption.upgraded, adoption.withResolved),
                subtitle: latestDay && `On ${latestDay.label}`,
              },
            ]}
          />
          <EntityVersionBars
            client={client}
            blocks={blocks}
            latestVersion={latest?.version}
            latestDay={latestDay}
            title="Entities by version"
            subtitle="Blocks each entity proposed with this client, split by the version they ran"
          />
        </>
      )}
      <GraffitiBlocksTable
        search={{ ...search, [ownKey]: client }}
        fields={blockFields}
        onSearchChange={onBlockSearchChange}
        since={since}
      />
    </div>
  );
}
