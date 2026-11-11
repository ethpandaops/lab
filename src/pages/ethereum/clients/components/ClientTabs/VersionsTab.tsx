import { type JSX, useMemo } from 'react';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS, SHARE_WINDOW_TEXT } from '@/pages/ethereum/clients/constants';
import { useNodesByVersion, useVersionCounts } from '@/pages/ethereum/clients/hooks';
import {
  UNRESOLVED_LABELS,
  adoptionByDay,
  countVersionsByDay,
  shareStat,
  summariseUnresolved,
  sinceSuffix,
  summariseVersions,
  windowStart,
} from '@/pages/ethereum/clients/utils/client-versions';
import { Table } from '@/components/Lists/Table';
import { Entity } from '@/components/Ethereum/Entity';
import { VersionShareChart } from '@/pages/ethereum/clients/components/VersionShareChart';
import { ReleasesTable } from '@/pages/ethereum/clients/components/ReleasesTable';
import type { ClientTabProps } from './ClientTabs.types';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Versions in the client's blocks: share over time, and every release with its blocks and Xatu nodes, linked to
 * version pages.
 */
export function VersionsTab({
  client,
  layer,
  releases,
  releasesLoading,
  latest,
  shareWindow,
  onShareWindowChange,
  requirement,
}: ClientTabProps): JSX.Element {
  const windowDays = SHARE_WINDOW_DAYS[shareWindow];
  const from = windowDays === null ? undefined : windowStart(windowDays);
  const history = useVersionCounts({ grain: 'daily', client, layer, from });
  // Unresolved blocks per entity are few enough to read over any window
  const unresolvedRows = useVersionCounts({ grain: 'entity-daily', client, layer, unresolvedOnly: true, from });
  const nodes = useNodesByVersion(client, releases, windowDays, layer === 'consensus');
  const blocks = history.rows;
  const total = useMemo(() => blocks.reduce((sum, row) => sum + row.count, 0), [blocks]);
  const versions = useMemo(() => summariseVersions(blocks), [blocks]);
  const days = useMemo(() => countVersionsByDay(blocks), [blocks]);
  const unresolved = useMemo(() => summariseUnresolved(unresolvedRows.rows), [unresolvedRows.rows]);
  const resolved = useMemo(
    () => blocks.filter(block => block.version).reduce((sum, row) => sum + row.count, 0),
    [blocks]
  );
  const blocksLoading = history.isLoading || releasesLoading || nodes.isLoading;
  const latestPoints = useMemo(
    () => (latest?.version ? adoptionByDay(days, latest.version) : []),
    [days, latest?.version]
  );
  const latestDay = [...latestPoints].reverse().find(point => point.atLeast !== null)?.day;
  const onLatest = shareStat(latestPoints, 'atLeast', SHARE_WINDOW_TEXT[shareWindow]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl
          options={SHARE_WINDOW_OPTIONS}
          value={shareWindow}
          onChange={onShareWindowChange}
          ariaLabel="Window"
        />
        <InfoBox summary="How versions are read">
          Versions come from proposed blocks, so shares are stake-weighted: the graffiti&apos;s version string or commit
          prefix is matched against the client&apos;s releases. A commit from a branch rather than a release tag counts
          under the release it builds on, as a build after it; a commit from another release than the graffiti states
          counts under the commit&apos;s release. Blocks that resolve to no release are left out of version shares and
          listed under Unresolved blocks, with the version their graffiti states.
        </InfoBox>
      </div>

      {blocksLoading ? (
        <LoadingContainer className="h-96 rounded-sm" />
      ) : (
        <>
          <Stats
            gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
            stats={[
              { id: 'blocks', name: `Blocks, ${SHARE_WINDOW_TEXT[shareWindow]}`, value: total.toLocaleString() },
              { id: 'resolved', name: 'Resolved to a release', value: percent(resolved, total) },
              { id: 'versions', name: 'Versions seen', value: versions.length.toLocaleString() },
              {
                id: 'latest',
                name: `On ${latest?.version ?? 'latest'} or newer${latestDay ? `, ${latestDay}` : ''}`,
                ...onLatest,
              },
            ]}
          />
          <PopoutCard
            title="Version share"
            subtitle={`Daily share of blocks with a resolved version${sinceSuffix(history.dataStart, from)}`}
            anchorId="version-share"
            modalSize="full"
          >
            {({ inModal }) => <VersionShareChart days={days} height={inModal ? 600 : 320} />}
          </PopoutCard>
          <Card rounded title="Releases">
            {releases.length === 0 && versions.length === 0 ? (
              <p className="text-sm text-muted">No published releases.</p>
            ) : (
              <ReleasesTable
                client={client}
                releases={releases}
                latest={latest}
                versions={versions}
                nodesByVersion={layer === 'consensus' ? nodes.nodesByVersion : undefined}
                minVersion={requirement?.minVersion}
              />
            )}
          </Card>
          {unresolved.length > 0 && (
            <Card
              rounded
              title="Unresolved blocks"
              subtitle={`Blocks whose graffiti resolves to no release, ${SHARE_WINDOW_TEXT[shareWindow]}; a stated version is not counted in version shares`}
            >
              <Table
                variant="nested"
                data={unresolved.slice(0, 15)}
                getRowKey={row => `${row.reason}-${row.commit ?? ''}-${row.stated ?? ''}`}
                columns={[
                  { header: 'Reason', accessor: row => UNRESOLVED_LABELS[row.reason] ?? row.reason },
                  {
                    header: 'Commit',
                    accessor: row => <span className="font-mono text-xs/6">{row.commit ?? '-'}</span>,
                  },
                  {
                    header: 'Graffiti states',
                    accessor: row => <span className="font-mono text-xs/6 text-muted">{row.stated ?? '-'}</span>,
                  },
                  {
                    header: 'Blocks',
                    accessor: row => row.blocks.toLocaleString(),
                    cellClassName: 'text-right tabular-nums text-foreground',
                    headerClassName: 'text-right',
                  },
                  {
                    header: 'Share of all blocks',
                    accessor: row => percent(row.blocks, total),
                    cellClassName: 'text-right tabular-nums text-muted',
                    headerClassName: 'text-right',
                  },
                  {
                    header: 'Top entities',
                    accessor: row =>
                      row.entities.length === 0 ? (
                        '-'
                      ) : (
                        <span className="flex flex-wrap gap-x-2">
                          {row.entities.slice(0, 3).map(entity => (
                            <Entity key={entity} entity={entity} className="text-sm/6" />
                          ))}
                        </span>
                      ),
                  },
                ]}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
